import type { Server } from 'socket.io';
import {
  ALL_ROLES,
  type RoleDef,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type EndGameRevealData,
  type EndGameRevealPlayer,
} from '@werewolf/shared';
import { roomManager, type ActiveRoom } from '../rooms/roomManager.js';
import { resolveNightActions } from './nightResolver.js';
import { resolveVotes, formatPublicVotes } from './votingSystem.js';
import { checkWinCondition, type WinCheckResult } from './winChecker.js';
import { getTierAllowance } from './balanceEngine.js';

export class GameLoop {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  public startGame(room: ActiveRoom): { success: boolean; error?: string } {
    if (room.players.size < 5) {
      return { success: false, error: 'Minimal 5 pemain (di luar host) diperlukan untuk memulai permainan.' };
    }

    let enabledRoles = [...room.state.settings.enabledRoles];
    const playerCount = room.players.size;

    // If enabledRoles does not match player count, auto-balance roles dynamically!
    if (enabledRoles.length !== playerCount) {
      const tier = getTierAllowance(playerCount);
      enabledRoles = [];
      // 1. Wolves (3 wolves for 12 players)
      for (let w = 0; w < tier.wolves; w++) {
        enabledRoles.push(w === 0 && tier.wolves >= 3 ? 'alpha_wolf' : 'werewolf');
      }
      // 2. Investigative
      if (tier.investigative[0] > 0) enabledRoles.push('seer');
      // 3. Protective
      if (tier.protective[1] > 0) enabledRoles.push('guardian');
      // 4. Village Killer
      if (tier.village_killer[1] > 0) enabledRoles.push('hunter');
      // 5. Neutral
      if (tier.neutral_independent[1] > 0) enabledRoles.push('jester');
      // 6. Fill remainder with villagers
      while (enabledRoles.length < playerCount) {
        enabledRoles.push('villager');
      }
    }

    // Shuffle roles (Fisher-Yates)
    for (let i = enabledRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [enabledRoles[i], enabledRoles[j]] = [enabledRoles[j], enabledRoles[i]];
    }

    // Assign roles
    const playerArray = Array.from(room.players.values());
    const werewolvesList: { id: string; name: string; roleName: string }[] = [];
    const masonsList: { id: string; name: string; roleName: string }[] = [];
    const twoSistersList: { id: string; name: string; roleName: string }[] = [];

    // Seating order setup (circular seating arrangement)
    room.state.seatingOrder = playerArray.map((p) => p.id);
    room.state.wolfKillsQuota = 1;

    for (let i = 0; i < playerArray.length; i++) {
      const player = playerArray[i];
      const roleId = enabledRoles[i];
      player.roleId = roleId;
      player.alive = true;
      player.elderShields = roleId === 'elder' ? 1 : 0;
      if (roleId === 'witch') {
        player.witchPotions = { heal: true, poison: true };
      }
      if (roleId === 'veteran') {
        player.alertsLeft = 2;
      }
      if (roleId === 'survivor') {
        player.survivorVestsLeft = 3;
      }

      // Special handling: Drunk gets a fake role identity they believe they are!
      if (roleId === 'drunk') {
        const fakeRolePool = ['seer', 'detective', 'guardian', 'tracker', 'lookout', 'vigilante'];
        player.fakeRoleId = fakeRolePool[Math.floor(Math.random() * fakeRolePool.length)];
      }

      const roleDef = ALL_ROLES[roleId] || ALL_ROLES.villager;
      // Core wolves list (excluding Minion and Hoodlum who are not known to the wolves)
      if (roleDef.team === 'werewolf' && roleId !== 'minion' && roleId !== 'hoodlum') {
        werewolvesList.push({ id: player.id, name: player.name, roleName: roleDef.indonesianName });
      }
      if (roleId === 'mason') {
        masonsList.push({ id: player.id, name: player.name, roleName: roleDef.indonesianName });
      }
      if (roleId === 'two_sisters') {
        twoSistersList.push({ id: player.id, name: player.name, roleName: roleDef.indonesianName });
      }
    }

    // Executioner target selection (assign 1 random living non-wolf villager)
    const executioner = playerArray.find((p) => p.roleId === 'executioner');
    if (executioner) {
      const validTargets = playerArray.filter(
        (p) => p.id !== executioner.id && ALL_ROLES[p.roleId]?.team === 'village'
      );
      if (validTargets.length > 0) {
        const target = validTargets[Math.floor(Math.random() * validTargets.length)];
        executioner.executionerTargetId = target.id;
      }
    }

    // Join werewolf sockets to wolf sub-room and emit private role assignment
    for (const player of playerArray) {
      // If player is Drunk, they receive their fake role definition!
      const effectiveRoleId = player.fakeRoleId || player.roleId;
      const roleDef = ALL_ROLES[effectiveRoleId] || ALL_ROLES.villager;
      const socket = this.io.sockets.sockets.get(player.socketId);

      // Core werewolves join wolf sub-room (excluding Hoodlum and Minion)
      if (ALL_ROLES[player.roleId]?.team === 'werewolf' && player.roleId !== 'hoodlum' && player.roleId !== 'minion') {
        socket?.join(`room:${room.state.code}:wolves`);
      }

      // Determine teammate visibility
      let teammates: { id: string; name: string; roleName: string }[] | undefined = undefined;
      if (player.roleId === 'mason') {
        teammates = masonsList;
      } else if (player.roleId === 'two_sisters') {
        teammates = twoSistersList;
      } else if (player.roleId === 'minion') {
        // Minion knows werewolves
        teammates = werewolvesList;
      } else if (roleDef.team === 'werewolf' && roleDef.visibility.seeTeammates && player.roleId !== 'hoodlum') {
        teammates = werewolvesList;
      }

      this.io.to(`player:${player.id}`).emit('player:assigned_role', {
        role: roleDef,
        teammates,
      });

      // Special notification for Executioner
      if (player.roleId === 'executioner' && player.executionerTargetId) {
        const target = room.players.get(player.executionerTargetId);
        if (target) {
          setTimeout(() => {
            this.io.to(`player:${player.id}`).emit('player:night_result', {
              message: `Misi Rahasia Algojo: Target Anda adalah ${target.name}. Buat warga desa mengeksekusinya di tiang gantungan untuk memenangkan permainan!`,
            });
          }, 3000);
        }
      }

      // Special notification for Beholder
      if (player.roleId === 'beholder') {
        const seerPlayer = playerArray.find((p) => p.roleId === 'seer' || p.fakeRoleId === 'seer');
        if (seerPlayer) {
          setTimeout(() => {
            this.io.to(`player:${player.id}`).emit('player:night_result', {
              message: `Mata Batin Beholder: Penglihatan Anda mengungkap bahwa ${seerPlayer.name} adalah Sang Peramal!`,
            });
          }, 3000);
        }
      }
    }

    // Transition to role reveal for 10 seconds, then start night
    room.state.phase = 'role_reveal';
    room.state.round = 1;
    const revealEndsAt = Date.now() + 10000;
    room.state.phaseEndsAt = revealEndsAt;

    this.io.to(`room:${room.state.code}`).emit('room:phase_changed', {
      phase: 'role_reveal',
      endsAt: revealEndsAt,
      round: 1,
    });

    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.phaseTimer = setTimeout(() => {
      this.startNightPhase(room);
    }, 10000);

    return { success: true };
  }

  public startNightPhase(room: ActiveRoom): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.nightActions.clear();
    room.state.phase = 'night';
    room.state.extendedTimerUsed = false;

    const duration = room.state.settings.nightDurationSec * 1000;
    const endsAt = Date.now() + duration;
    room.state.phaseEndsAt = endsAt;

    this.io.to(`room:${room.state.code}`).emit('room:phase_changed', {
      phase: 'night',
      endsAt,
      round: room.state.round,
    });

    const publicPlayers = roomManager.getPublicPlayers(room.state.code);
    const aliveTargets = publicPlayers.filter((p) => p.alive);

    // Send night action prompts to active living players
    for (const player of room.players.values()) {
      if (!player.alive) continue;

      // Drunk acts as their fake role!
      const effectiveRoleId = player.fakeRoleId || player.roleId;
      const roleDef = ALL_ROLES[effectiveRoleId];
      if (!roleDef) continue;

      let canAct = roleDef.actionType === 'independent';
      let eligibleTargets = aliveTargets.filter((t) => t.id !== player.id);

      // 0. Werewolf Pack Targeting Rule:
      // Regular werewolves CANNOT target fellow werewolves!
      // Exceptions:
      // a. White Werewolf ('white_werewolf') hunts solo and can betray wolves.
      // b. Cross-team Lover: If werewolf has partnerId and partner is NOT on werewolf team,
      //    they are fighting for their lover romance win condition and may target fellow wolves!
      if (roleDef.team === 'werewolf') {
        const isWhiteWerewolf = roleDef.id === 'white_werewolf';
        let isCrossTeamLover = false;
        if (player.partnerId) {
          const partner = room.players.get(player.partnerId);
          if (partner) {
            const partnerRoleDef = ALL_ROLES[partner.roleId];
            if (partnerRoleDef && partnerRoleDef.team !== 'werewolf') {
              isCrossTeamLover = true;
            }
          }
        }

        if (!isWhiteWerewolf && !isCrossTeamLover) {
          eligibleTargets = eligibleTargets.filter((t) => {
            const targetPlayer = room.players.get(t.id);
            if (!targetPlayer) return true;
            const targetRoleDef = ALL_ROLES[targetPlayer.roleId];
            return targetRoleDef?.team !== 'werewolf';
          });
        }
      }

      // Village Curse: if Elder was lynched by village, all special village roles lose power!
      if (room.state.villageCursed && roleDef.team === 'village' && roleDef.id !== 'villager') {
        canAct = false;
      }

      // 1. Protective Roles (Guardian, Defender, Bodyguard, Crusader):
      // CANNOT protect the same target two nights in a row!
      if (['guardian', 'doctor', 'defender', 'bodyguard', 'crusader'].includes(roleDef.id)) {
        if (player.lastProtectedTargetId) {
          eligibleTargets = eligibleTargets.filter((t) => t.id !== player.lastProtectedTargetId);
        }
      }

      // 2. Escort: Cannot roleblock the same person two nights in a row!
      if (roleDef.id === 'escort' && player.lastRoleblockTargetId) {
        eligibleTargets = eligibleTargets.filter((t) => t.id !== player.lastRoleblockTargetId);
      }

      // 3. Jailer: Cannot jail the same person two nights in a row!
      if (roleDef.id === 'jailer' && player.lastJailedTargetId) {
        eligibleTargets = eligibleTargets.filter((t) => t.id !== player.lastJailedTargetId);
      }

      // 4. Vigilante: Cannot shoot on Night 1! Cannot shoot if overcome with guilt!
      if (roleDef.id === 'vigilante') {
        if (room.state.round === 1 || player.vigilanteGuilt) {
          canAct = false;
        }
      }

      // 5. Cupid: Can only pair lovers on Night 1!
      if (roleDef.id === 'cupid') {
        if (room.state.round > 1) {
          canAct = false;
        }
      }

      // 6. Witch: Cannot act if both potions are depleted
      if (roleDef.id === 'witch') {
        if (player.witchPotions && player.witchPotions.heal === false && player.witchPotions.poison === false) {
          canAct = false;
        }
      }

      // 7. Slayer: Single-use shot
      if (roleDef.id === 'slayer' && player.slayerUsedShot) {
        canAct = false;
      }

      // 8. Priest: Single-use holy water
      if (roleDef.id === 'priest' && player.holyWaterUsed) {
        canAct = false;
      }

      // 9. Veteran: Limited alerts
      if (roleDef.id === 'veteran') {
        if ((player.alertsLeft ?? 3) <= 0) {
          canAct = false;
        }
      }

      // 10. Fox: Loses power if past check revealed 0 wolves
      if (roleDef.id === 'fox' && player.foxLostPower) {
        canAct = false;
      }

      // 11. Paranormal Investigator: Loses power if checked normal villager
      if (roleDef.id === 'paranormal_investigator' && player.paranormalLostPower) {
        canAct = false;
      }

      // 12. Survivor: Limited bulletproof vests (starts at 3)
      if (roleDef.id === 'survivor') {
        const vestsLeft = player.survivorVestsLeft ?? 3;
        if (vestsLeft <= 0) {
          canAct = false;
          eligibleTargets = [];
        } else {
          canAct = true;
          eligibleTargets = [
            {
              id: player.id,
              name: `Kenakan Rompi Antipeluru (Sisa: ${vestsLeft})`,
              avatarSeed: player.avatarSeed || 'survivor_armor',
              alive: true,
              connected: player.connected,
            },
            {
              id: 'save',
              name: 'Simpan Rompi (Hemat untuk Malam Nanti)',
              avatarSeed: 'survivor_save',
              alive: true,
              connected: true,
            },
          ];
        }
      }

      const roleOptions: { id: string; name: string }[] | undefined =
        roleDef.id === 'sorcerer'
          ? Array.from(
              new Set<string>(
                room.state.settings.enabledRoles.length > 0
                  ? room.state.settings.enabledRoles
                  : Object.keys(ALL_ROLES)
              )
            )
              .filter((rId: string) => rId !== 'sorcerer')
              .map((rId: string) => ({
                id: rId,
                name: ALL_ROLES[rId]?.indonesianName || ALL_ROLES[rId]?.name || rId,
              }))
          : undefined;

      this.io.to(`player:${player.id}`).emit('player:night_prompt', {
        canAct,
        role: roleDef,
        targets: eligibleTargets,
        roleOptions,
      });
    }

    room.phaseTimer = setTimeout(() => {
      this.resolveNight(room);
    }, duration);
  }

  public resolveNight(room: ActiveRoom): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    // Cupid on Night 1 resolution: pair lovers if cupid acted
    if (room.state.round === 1) {
      for (const act of room.nightActions.values()) {
        if (act.roleId === 'cupid' && act.targetPlayerId) {
          const lover1 = room.players.get(act.targetPlayerId);
          // Pick secondary target or random living partner
          const lover2Id = act.secondaryTargetId || Array.from(room.players.values()).find((p) => p.alive && p.id !== act.targetPlayerId && p.id !== act.playerId)?.id;
          const lover2 = lover2Id ? room.players.get(lover2Id) : null;

          if (lover1 && lover2) {
            lover1.partnerId = lover2.id;
            lover2.partnerId = lover1.id;

            const s1 = this.io.sockets.sockets.get(lover1.socketId);
            const s2 = this.io.sockets.sockets.get(lover2.socketId);
            s1?.join(`room:${room.state.code}:lovers`);
            s2?.join(`room:${room.state.code}:lovers`);

            this.io.to(`player:${lover1.id}`).emit('player:night_result', {
              message: `Panah asmara Kupido telah mengikat Anda dengan ${lover2.name}! Kalian kini adalah pasangan Lovers sehidup semati.`,
            });
            this.io.to(`player:${lover2.id}`).emit('player:night_result', {
              message: `Panah asmara Kupido telah mengikat Anda dengan ${lover1.name}! Kalian kini adalah pasangan Lovers sehidup semati.`,
            });
          }
        }
      }
    }

    const quota = room.state.wolfKillsQuota || 1;
    const resolution = resolveNightActions(room.nightActions, room.players, room.state.round, {
      wolfKillsQuota: quota,
      seatingOrder: room.state.seatingOrder,
      villageCursed: room.state.villageCursed,
    });
    // Reset quota back to 1 after consuming it
    room.state.wolfKillsQuota = 1;

    // Apply deaths, Wolf Cub revenge, and Doppelganger inheritance
    for (const deadId of resolution.deadPlayerIds) {
      const p = room.players.get(deadId);
      if (p) {
        p.alive = false;
        if (p.roleId === 'wolf_cub') {
          room.state.wolfKillsQuota = 2;
          resolution.publicAnnouncements.push(
            '🐺 Anak Serigala (Wolf Cub) telah gugur! Kemarahan kawanan serigala membara: mereka akan memangsa 2 korban di malam berikutnya!'
          );
        }

        // Check Doppelganger inheritance
        const doppel = Array.from(room.players.values()).find(
          (dp) => dp.alive && dp.roleId === 'doppelganger' && dp.doppelgangerTargetId === deadId
        );
        if (doppel) {
          doppel.roleId = p.roleId;
          const roleDef = ALL_ROLES[p.roleId] || ALL_ROLES.villager;
          this.io.to(`player:${doppel.id}`).emit('player:night_result', {
            message: `Sosok yang Anda tiru telah gugur! Anda mewarisi takdirnya dan kini menjadi ${roleDef.indonesianName} (${roleDef.name})!`,
          });
        }
      }
    }

    // Check Apprentice Seer promotion if Seer died
    const realSeer = Array.from(room.players.values()).find((p) => p.roleId === 'seer');
    if (realSeer && !realSeer.alive) {
      const apprentice = Array.from(room.players.values()).find((p) => p.alive && p.roleId === 'apprentice_seer');
      if (apprentice) {
        apprentice.roleId = 'seer';
        this.io.to(`player:${apprentice.id}`).emit('player:night_result', {
          message: 'Sang Peramal telah gugur! Anda mewarisi bola kristal dan kini menjadi PERAMAL sejati desa.',
        });
      }
    }

    // Check Wild Child transformation if role model died
    const wildChild = Array.from(room.players.values()).find((p) => p.alive && p.roleId === 'wild_child');
    if (wildChild && wildChild.roleModelId) {
      const model = room.players.get(wildChild.roleModelId);
      if (model && !model.alive) {
        wildChild.roleId = 'werewolf';
        const socket = this.io.sockets.sockets.get(wildChild.socketId);
        socket?.join(`room:${room.state.code}:wolves`);

        this.io.to(`player:${wildChild.id}`).emit('player:night_result', {
          message: 'Panutan hidup Anda telah gugur! Kemarahan liar merasuki jiwa Anda — Anda kini berubah menjadi SERIGALA (Werewolf)!',
        });
      }
    }

    // Handle converted players (Cursed Wolf-Father, Wolf Hound, Vampire, Thief, Amnesiac)
    if (resolution.convertedPlayerIds) {
      for (const cId of resolution.convertedPlayerIds) {
        const cp = room.players.get(cId);
        if (cp) {
          const roleDef = ALL_ROLES[cp.roleId] || ALL_ROLES.villager;
          const socket = this.io.sockets.sockets.get(cp.socketId);
          if (roleDef.team === 'werewolf') {
            socket?.join(`room:${room.state.code}:wolves`);
          }
          this.io.to(`player:${cp.id}`).emit('player:assigned_role', {
            role: roleDef,
          });
        }
      }
    }

    // Send private investigation / action results
    for (const seerRes of resolution.seerResults) {
      this.io.to(`player:${seerRes.seerPlayerId}`).emit('player:night_result', {
        message: seerRes.message,
        targetId: seerRes.targetId,
        targetName: seerRes.targetName,
        isWolf: seerRes.isWolf,
        team: seerRes.team,
        round: seerRes.round || room.state.round,
        actionDescription: seerRes.actionDescription,
      });
    }

    // Little Girl sneak peek
    const littleGirl = Array.from(room.players.values()).find((p) => p.alive && p.roleId === 'little_girl');
    if (littleGirl) {
      const livingWolves = Array.from(room.players.values()).filter(
        (p) => p.alive && ALL_ROLES[p.roleId]?.team === 'werewolf'
      );
      if (livingWolves.length > 0) {
        const spottedWolf = livingWolves[Math.floor(Math.random() * livingWolves.length)];
        this.io.to(`player:${littleGirl.id}`).emit('player:night_result', {
          message: `Petunjuk Gadis Kecil: Lewat celah jendela di malam hari, Anda mengintip bayangan ${spottedWolf.name} yang sedang berkeliaran buas!`,
          targetId: spottedWolf.id,
          targetName: spottedWolf.name,
          isWolf: true,
          round: room.state.round,
          actionDescription: 'Mengintip pergerakan serigala',
        });
      }
    }

    // Werewolf pack private action confirmation
    const werewolfPlayers = Array.from(room.players.values()).filter(
      (p) => p.alive && ALL_ROLES[p.roleId]?.team === 'werewolf'
    );
    for (const wolf of werewolfPlayers) {
      const wolfAct = room.nightActions.get(wolf.id);
      if (wolfAct?.targetPlayerId) {
        const target = room.players.get(wolfAct.targetPlayerId);
        if (target) {
          this.io.to(`player:${wolf.id}`).emit('player:night_result', {
            message: `Aksi Serigala: Kamu dan kawananmu memilih untuk menyerang ${target.name} semalam.`,
            targetId: target.id,
            targetName: target.name,
            round: room.state.round,
            actionDescription: `Menyerang ${target.name}`,
          });
        }
      }
    }

    // Check win condition
    const winResult = checkWinCondition(Array.from(room.players.values()), {
      round: room.state.round,
      phase: 'night',
    });

    if (winResult.hasWinner) {
      this.endGame(room, winResult);
    } else {
      this.startDayPhase(room, resolution.publicAnnouncements);
    }
  }

  public startDayPhase(room: ActiveRoom, announcements: string[]): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.state.phase = 'day';
    room.state.extendedTimerUsed = false;

    // Bear Tamer dawn growl check:
    const bearTamer = Array.from(room.players.values()).find((p) => p.alive && p.roleId === 'bear_tamer');
    if (bearTamer && room.state.seatingOrder && room.state.seatingOrder.length > 2) {
      const livingSeats = room.state.seatingOrder.filter((id) => room.players.get(id)?.alive);
      const btIndex = livingSeats.indexOf(bearTamer.id);
      if (btIndex !== -1 && livingSeats.length > 2) {
        const leftNeighbor = room.players.get(livingSeats[(btIndex - 1 + livingSeats.length) % livingSeats.length]);
        const rightNeighbor = room.players.get(livingSeats[(btIndex + 1) % livingSeats.length]);
        const isLeftWolf = leftNeighbor && ALL_ROLES[leftNeighbor.roleId]?.team === 'werewolf';
        const isRightWolf = rightNeighbor && ALL_ROLES[rightNeighbor.roleId]?.team === 'werewolf';

        if (isLeftWolf || isRightWolf) {
          announcements.push(
            '🐾 Beruang milik Penjinak Beruang menggeram buas di waktu fajar! Ada serigala di antara tetangga terdekatnya!'
          );
        } else {
          announcements.push('🕊️ Beruang milik Penjinak Beruang tertidur tenang di fajar hari ini.');
        }
      }
    }

    const duration = room.state.settings.dayDurationSec * 1000;
    const endsAt = Date.now() + duration;
    room.state.phaseEndsAt = endsAt;

    this.io.to(`room:${room.state.code}`).emit('room:phase_changed', {
      phase: 'day',
      endsAt,
      round: room.state.round,
    });

    // Broadcast updated player status
    const publicPlayers = roomManager.getPublicPlayers(room.state.code);
    this.io.to(`room:${room.state.code}`).emit('room:player_list_updated', { publicPlayers });

    // Broadcast announcements
    for (const message of announcements) {
      this.io.to(`room:${room.state.code}`).emit('room:game_event', {
        event: {
          id: 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          type: 'player_died',
          message,
          timestamp: Date.now(),
        },
      });
    }

    room.phaseTimer = setTimeout(() => {
      this.startVotingPhase(room);
    }, duration);
  }

  public startVotingPhase(room: ActiveRoom): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.votes.clear();
    room.state.phase = 'voting';
    room.state.extendedTimerUsed = false;

    const duration = 60000; // 60s for voting
    const endsAt = Date.now() + duration;
    room.state.phaseEndsAt = endsAt;

    this.io.to(`room:${room.state.code}`).emit('room:phase_changed', {
      phase: 'voting',
      endsAt,
      round: room.state.round,
    });

    this.io.to(`room:${room.state.code}`).emit('room:vote_update', {
      votes: [],
    });

    room.phaseTimer = setTimeout(() => {
      this.resolveVoting(room);
    }, duration);
  }

  public resolveVoting(room: ActiveRoom): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);

    const voteResult = resolveVotes(room.votes, room.players);

    if (voteResult.villageCursed) {
      room.state.villageCursed = true;
    }

    if (voteResult.hauntedPlayerId) {
      const haunted = room.players.get(voteResult.hauntedPlayerId);
      if (haunted && haunted.alive) {
        haunted.alive = false;
        this.io.to(`room:${room.state.code}`).emit('room:game_event', {
          event: {
            id: 'ev_haunt_' + Date.now(),
            type: 'player_died',
            message: `👻 Kutukan arwah sang Badut (Jester) merenggut nyawa pemilihnya: ${haunted.name} tewas seketika!`,
            timestamp: Date.now(),
          },
        });
      }
    }

    if (voteResult.executedPlayerId) {
      const executed = room.players.get(voteResult.executedPlayerId);
      if (executed) {
        executed.alive = false;

        // Wolf cub death trigger on voting execution
        if (executed.roleId === 'wolf_cub') {
          room.state.wolfKillsQuota = 2;
          this.io.to(`room:${room.state.code}`).emit('room:game_event', {
            event: {
              id: 'ev_wolfcub_' + Date.now(),
              type: 'player_died',
              message: '🐺 Anak Serigala (Wolf Cub) telah dieksekusi! Dendam serigala membara: kawanan akan memangsa 2 orang malam nanti!',
              timestamp: Date.now(),
            },
          });
        }

        // Lovers chain death on voting execution
        if (executed.partnerId) {
          const partner = room.players.get(executed.partnerId);
          if (partner && partner.alive) {
            partner.alive = false;
            this.io.to(`room:${room.state.code}`).emit('room:game_event', {
              event: {
                id: 'ev_lovers_' + Date.now(),
                type: 'player_died',
                message: `💔 ${partner.name} tidak sanggup hidup tanpa pasangannya (${executed.name}) dan meninggal karena patah hati!`,
                timestamp: Date.now(),
              },
            });
          }
        }

        // Apprentice Seer promotion if Seer was executed
        if (executed.roleId === 'seer') {
          const apprentice = Array.from(room.players.values()).find(
            (p) => p.alive && p.roleId === 'apprentice_seer'
          );
          if (apprentice) {
            apprentice.roleId = 'seer';
            this.io.to(`player:${apprentice.id}`).emit('player:night_result', {
              message: 'Sang Peramal telah dieksekusi desa! Anda mewarisi bola kristal dan kini menjadi PERAMAL sejati desa.',
            });
          }
        }

        // Wild Child transformation if role model was executed
        const wildChild = Array.from(room.players.values()).find(
          (p) => p.alive && p.roleId === 'wild_child'
        );
        if (wildChild && wildChild.roleModelId === executed.id) {
          wildChild.roleId = 'werewolf';
          const socket = this.io.sockets.sockets.get(wildChild.socketId);
          socket?.join(`room:${room.state.code}:wolves`);
          this.io.to(`player:${wildChild.id}`).emit('player:night_result', {
            message: 'Panutan hidup Anda telah dieksekusi desa! Kemarahan liar merasuki jiwa Anda — Anda kini berubah menjadi SERIGALA (Werewolf)!',
          });
        }

        // Doppelganger inheritance on execution
        const doppel = Array.from(room.players.values()).find(
          (dp) => dp.alive && dp.roleId === 'doppelganger' && dp.doppelgangerTargetId === executed.id
        );
        if (doppel) {
          doppel.roleId = executed.roleId;
          const roleDef = ALL_ROLES[executed.roleId] || ALL_ROLES.villager;
          this.io.to(`player:${doppel.id}`).emit('player:night_result', {
            message: `Sosok yang Anda tiru telah dieksekusi! Anda mewarisi perannya dan kini menjadi ${roleDef.indonesianName} (${roleDef.name})!`,
          });
        }

        // Hunter death trigger on voting execution
        if (executed.roleId === 'hunter' && executed.hunterTargetId) {
          const hunterVictim = room.players.get(executed.hunterTargetId);
          if (hunterVictim && hunterVictim.alive) {
            hunterVictim.alive = false;
            this.io.to(`room:${room.state.code}`).emit('room:game_event', {
              event: {
                id: 'ev_hunter_' + Date.now(),
                type: 'player_died',
                message: `💥 Sebelum digantung, Pemburu (${executed.name}) menarik pelatuk dan menembak mati ${hunterVictim.name}!`,
                timestamp: Date.now(),
              },
            });
          }
        }
      }
    }

    // Broadcast vote announcement event
    this.io.to(`room:${room.state.code}`).emit('room:game_event', {
      event: {
        id: 'ev_vote_' + Date.now(),
        type: 'vote_result',
        message: voteResult.message,
        timestamp: Date.now(),
      },
    });

    // Broadcast updated public players
    const publicPlayers = roomManager.getPublicPlayers(room.state.code);
    this.io.to(`room:${room.state.code}`).emit('room:player_list_updated', { publicPlayers });

    // Check win condition (Executioner, Tanner, Jester, etc.)
    const winResult = checkWinCondition(Array.from(room.players.values()), {
      lastExecutedPlayerId: voteResult.executedPlayerId,
      round: room.state.round,
      phase: 'voting',
    });

    if (winResult.hasWinner) {
      this.endGame(room, winResult);
    } else if (room.state.secondVoteRoundPending) {
      // Stuttering Judge triggers second voting round for the day
      room.state.secondVoteRoundPending = false;
      room.state.votingRound = 2;
      this.io.to(`room:${room.state.code}`).emit('room:game_event', {
        event: {
          id: 'ev_judge_' + Date.now(),
          type: 'judge_round',
          message: '👨‍⚖️ Palu keadilan Hakim Gagap (Stuttering Judge) diketuk! Ronde pemungutan suara (voting) kedua resmi dibuka hari ini!',
          timestamp: Date.now(),
        },
      });
      setTimeout(() => {
        this.startVotingPhase(room);
      }, 4000);
    } else {
      room.state.votingRound = 1;
      room.state.round += 1;
      setTimeout(() => {
        this.startNightPhase(room);
      }, 5000);
    }
  }

  public endGame(room: ActiveRoom, winResult: WinCheckResult): void {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    room.state.phase = 'ended';
    room.state.winner = winResult.winner;
    room.state.phaseEndsAt = null;

    const revealPlayers: EndGameRevealPlayer[] = Array.from(room.players.values()).map((p) => {
      const roleDef = ALL_ROLES[p.roleId] || ALL_ROLES.villager;

      // If Drunk, show hilarious unmasked description!
      let displayRoleName = roleDef.indonesianName;
      if (p.roleId === 'drunk' && p.fakeRoleId) {
        const fakeDef = ALL_ROLES[p.fakeRoleId];
        displayRoleName = `Orang Mabuk (Mengira ${fakeDef?.indonesianName || 'Peramal'})`;
      }

      return {
        id: p.id,
        name: p.name,
        roleId: p.roleId,
        roleName: roleDef.name,
        roleIndonesianName: displayRoleName,
        team: roleDef.team,
        alive: p.alive,
      };
    });

    const reveal: EndGameRevealData = {
      winner: winResult.winner || 'village',
      players: revealPlayers,
      rounds: room.state.round,
      durationSec: 0,
    };

    this.io.to(`room:${room.state.code}`).emit('room:phase_changed', {
      phase: 'ended',
      endsAt: null,
      round: room.state.round,
    });

    this.io.to(`room:${room.state.code}`).emit('room:game_ended', { reveal });
  }

  public extendTimer(room: ActiveRoom): boolean {
    if (room.state.extendedTimerUsed || !room.state.phaseEndsAt) return false;

    room.state.extendedTimerUsed = true;
    const additionalMs = 30000;
    const newEndsAt = room.state.phaseEndsAt + additionalMs;
    room.state.phaseEndsAt = newEndsAt;

    if (room.phaseTimer) {
      clearTimeout(room.phaseTimer);
      const remainingMs = Math.max(1000, newEndsAt - Date.now());
      room.phaseTimer = setTimeout(() => {
        if (room.state.phase === 'night') this.resolveNight(room);
        else if (room.state.phase === 'day') this.startVotingPhase(room);
        else if (room.state.phase === 'voting') this.resolveVoting(room);
      }, remainingMs);
    }

    this.io.to(`room:${room.state.code}`).emit('room:timer_extended', { endsAt: newEndsAt });
    return true;
  }

  public skipPhase(room: ActiveRoom): void {
    if (room.state.phase === 'role_reveal') this.startNightPhase(room);
    else if (room.state.phase === 'night') this.resolveNight(room);
    else if (room.state.phase === 'day') this.startVotingPhase(room);
    else if (room.state.phase === 'voting') this.resolveVoting(room);
  }
}
