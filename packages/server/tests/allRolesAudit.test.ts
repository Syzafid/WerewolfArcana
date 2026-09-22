import { describe, it, expect } from 'vitest';
import { resolveNightActions } from '../src/engine/nightResolver.js';
import { resolveVotes } from '../src/engine/votingSystem.js';
import { checkWinCondition } from '../src/engine/winChecker.js';
import type { Player, NightAction, Vote } from '@werewolf/shared';

function createMockPlayer(id: string, name: string, roleId: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name,
    socketId: `socket_${id}`,
    sessionToken: `token_${id}`,
    roleId,
    alive: true,
    connected: true,
    avatarSeed: `seed_${id}`,
    ...overrides,
  };
}

function mockAction(
  playerId: string,
  roleId: string,
  targetPlayerId: string | null = null,
  secondaryTargetId?: string | null
): NightAction {
  return {
    playerId,
    roleId,
    targetPlayerId,
    secondaryTargetId,
    timestamp: Date.now(),
  };
}

function mockVote(voterId: string, targetId: string | null, round = 1): Vote {
  return {
    voterId,
    targetId,
    round,
    timestamp: Date.now(),
  };
}

describe('All Roles Comprehensive Logic & Rules Audit', () => {
  describe('1. Defender consecutive night protection restriction', () => {
    it('should allow protecting a player on night 1, but disallow the same player on night 2', () => {
      const defender = createMockPlayer('p1', 'Defender', 'defender');
      const villager = createMockPlayer('p2', 'Villager', 'villager');
      const wolf = createMockPlayer('w1', 'Wolf', 'werewolf');

      const players = new Map<string, Player>([
        [defender.id, defender],
        [villager.id, villager],
        [wolf.id, wolf],
      ]);

      // Night 1: Defender protects villager. Wolf attacks villager.
      const night1Actions = new Map<string, NightAction>([
        ['act_def', mockAction(defender.id, 'defender', villager.id)],
        ['act_wolf', mockAction(wolf.id, 'werewolf', villager.id)],
      ]);

      const res1 = resolveNightActions(night1Actions, players, 1);
      expect(res1.deadPlayerIds).not.toContain(villager.id);
      expect(defender.lastProtectedTargetId).toBe(villager.id);

      // Night 2: Defender tries to protect villager AGAIN (consecutive).
      const night2Actions = new Map<string, NightAction>([
        ['act_def', mockAction(defender.id, 'defender', villager.id)],
        ['act_wolf', mockAction(wolf.id, 'werewolf', villager.id)],
      ]);

      const res2 = resolveNightActions(night2Actions, players, 2);
      // Villager should die because consecutive protection is prohibited!
      expect(res2.deadPlayerIds).toContain(villager.id);
    });
  });

  describe('2. Wolf Cub death trigger and double-kill quota', () => {
    it('should eliminate 2 victims simultaneously when wolfKillsQuota is 2', () => {
      const wolf = createMockPlayer('w1', 'Alpha Wolf', 'werewolf');
      const v1 = createMockPlayer('v1', 'Warga 1', 'villager');
      const v2 = createMockPlayer('v2', 'Warga 2', 'villager');
      const v3 = createMockPlayer('v3', 'Warga 3', 'villager');

      const players = new Map<string, Player>([
        [wolf.id, wolf],
        [v1.id, v1],
        [v2.id, v2],
        [v3.id, v3],
      ]);

      // With quota = 2, wolves can attack 2 targets
      const wolfActions = new Map<string, NightAction>([
        ['w_act1', mockAction(wolf.id, 'werewolf', v1.id)],
        ['w_act2', mockAction('w2', 'werewolf', v2.id)],
      ]);
      players.set('w2', createMockPlayer('w2', 'Wolf 2', 'werewolf'));

      const res = resolveNightActions(wolfActions, players, 2, { wolfKillsQuota: 2 });
      expect(res.deadPlayerIds).toContain(v1.id);
      expect(res.deadPlayerIds).toContain(v2.id);
      expect(res.deadPlayerIds).not.toContain(v3.id);
    });
  });

  describe('3. Witch heal and poison potions', () => {
    it('should heal victim using heal potion and kill target using poison potion', () => {
      const witch = createMockPlayer('witch', 'Witch', 'witch', {
        witchPotions: { heal: true, poison: true },
      });
      const victim = createMockPlayer('victim', 'Victim', 'villager');
      const enemy = createMockPlayer('enemy', 'Enemy', 'werewolf');
      const wolf = createMockPlayer('wolf', 'Wolf', 'werewolf');

      const players = new Map<string, Player>([
        [witch.id, witch],
        [victim.id, victim],
        [enemy.id, enemy],
        [wolf.id, wolf],
      ]);

      // Night 1: Wolves attack victim. Witch heals victim.
      const n1Actions = new Map<string, NightAction>([
        ['act_w', mockAction(wolf.id, 'werewolf', victim.id)],
        ['act_witch_heal', mockAction(witch.id, 'witch', victim.id, 'heal')],
      ]);

      const res1 = resolveNightActions(n1Actions, players, 1);
      expect(res1.deadPlayerIds).not.toContain(victim.id);
      expect(witch.witchPotions?.heal).toBe(false);

      // Night 2: Witch uses poison on enemy
      const n2Actions = new Map<string, NightAction>([
        ['act_witch_poison', mockAction(witch.id, 'witch', enemy.id, 'poison')],
      ]);

      const res2 = resolveNightActions(n2Actions, players, 2);
      expect(res2.deadPlayerIds).toContain(enemy.id);
      expect(witch.witchPotions?.poison).toBe(false);
    });
  });

  describe('4. Arsonist dousing and mass ignition', () => {
    it('should douse targets on preliminary nights and incinerate all doused players upon ignite', () => {
      const arsonist = createMockPlayer('arson', 'Arsonist', 'arsonist');
      const target1 = createMockPlayer('t1', 'Target 1', 'villager');
      const target2 = createMockPlayer('t2', 'Target 2', 'villager');
      const untouched = createMockPlayer('u1', 'Untouched', 'villager');

      const players = new Map<string, Player>([
        [arsonist.id, arsonist],
        [target1.id, target1],
        [target2.id, target2],
        [untouched.id, untouched],
      ]);

      // Night 1: Douse target1
      resolveNightActions(new Map([['act1', mockAction(arsonist.id, 'arsonist', target1.id)]]), players, 1);
      expect(target1.isDoused).toBe(true);

      // Night 2: Douse target2
      resolveNightActions(new Map([['act2', mockAction(arsonist.id, 'arsonist', target2.id)]]), players, 2);
      expect(target2.isDoused).toBe(true);

      // Night 3: Ignite (target self or secondaryTargetId 'ignite')
      const res3 = resolveNightActions(
        new Map([['act3', mockAction(arsonist.id, 'arsonist', arsonist.id, 'ignite')]]),
        players,
        3
      );

      expect(res3.deadPlayerIds).toContain(target1.id);
      expect(res3.deadPlayerIds).toContain(target2.id);
      expect(res3.deadPlayerIds).not.toContain(untouched.id);
      expect(res3.deadPlayerIds).not.toContain(arsonist.id);
    });
  });

  describe('5. Pied Piper (Piper) charm progression and victory', () => {
    it('should charm 2 players per night and trigger Piper victory when all alive non-pipers are charmed', () => {
      const piper = createMockPlayer('piper', 'Piper', 'piper');
      const p1 = createMockPlayer('p1', 'Player 1', 'villager');
      const p2 = createMockPlayer('p2', 'Player 2', 'villager');
      const p3 = createMockPlayer('p3', 'Player 3', 'villager');
      const p4 = createMockPlayer('p4', 'Player 4', 'villager');

      const players = [piper, p1, p2, p3, p4];

      // Initially, no winner
      const winCheckInitial = checkWinCondition(players);
      expect(winCheckInitial.hasWinner).toBe(false);

      // Round 1: Piper charms p1 and p2
      p1.charmedByPiper = true;
      p2.charmedByPiper = true;
      const winCheckR1 = checkWinCondition(players);
      expect(winCheckR1.hasWinner).toBe(false);

      // Round 2: Piper charms p3 and p4 (all alive players charmed!)
      p3.charmedByPiper = true;
      p4.charmedByPiper = true;
      const winCheckFinal = checkWinCondition(players);
      expect(winCheckFinal.hasWinner).toBe(true);
      expect(winCheckFinal.winner).toBe('piper');
      expect(winCheckFinal.winnerTitle).toContain('Pied Piper');
    });
  });

  describe('6. Village Idiot execution pardon and disenfranchisement', () => {
    it('should pardon Village Idiot on vote execution, revealing them as pardoned', () => {
      const idiot = createMockPlayer('idiot', 'Idiot', 'village_idiot');
      const villager = createMockPlayer('v1', 'Villager', 'villager');

      const players = new Map<string, Player>([
        [idiot.id, idiot],
        [villager.id, villager],
      ]);

      const votes = new Map<string, Vote>([
        ['v1', mockVote(villager.id, idiot.id)],
      ]);

      const result = resolveVotes(votes, players);
      // Idiot should NOT be executed; executedPlayerId is null
      expect(result.executedPlayerId).toBeNull();
      expect(result.pardonedPlayerId).toBe(idiot.id);
      expect(idiot.alive).toBe(true);
      expect(idiot.idiotPardoned).toBe(true);
      expect(idiot.canVote).toBe(false);
    });

    it('should disallow Village Idiot from voting after being pardoned', () => {
      const idiot = createMockPlayer('idiot', 'Idiot', 'village_idiot');
      const target = createMockPlayer('target', 'Suspect', 'villager');

      const players = new Map<string, Player>([
        [idiot.id, idiot],
        [target.id, target],
      ]);

      // 1. Village Idiot gets voted and pardoned
      const vote1 = new Map<string, Vote>([
        ['v1', mockVote(target.id, idiot.id)],
      ]);
      const res1 = resolveVotes(vote1, players);
      expect(res1.executedPlayerId).toBeNull();
      expect(idiot.canVote).toBe(false);

      // 2. Village Idiot attempts to vote in the next session
      const vote2 = new Map<string, Vote>([
        ['v_idiot', mockVote(idiot.id, target.id)],
      ]);
      const res2 = resolveVotes(vote2, players);
      // Idiot's vote is ignored because canVote is false!
      expect(res2.voteCounts[target.id]).toBeUndefined();
    });
  });

  describe('7. Fox scent investigation and permanent power loss', () => {
    it('should retain power if at least 1 wolf is in the trio, and lose power if 0 wolves are found', () => {
      const fox = createMockPlayer('fox', 'Fox', 'fox');
      const p1 = createMockPlayer('p1', 'Villager 1', 'villager');
      const p2 = createMockPlayer('p2', 'Wolf Player', 'werewolf');
      const p3 = createMockPlayer('p3', 'Villager 2', 'villager');

      const players = new Map<string, Player>([
        [fox.id, fox],
        [p1.id, p1],
        [p2.id, p2],
        [p3.id, p3],
      ]);
      const seatingOrder = [fox.id, p1.id, p2.id, p3.id];

      // Round 1: Target p1. Neighbors in circle are fox (or p3) and p2 (wolf). Has wolf!
      const act1 = new Map<string, NightAction>([
        ['act_fox', mockAction(fox.id, 'fox', p1.id)],
      ]);
      const res1 = resolveNightActions(act1, players, 1, { seatingOrder });
      expect(res1.seerResults[0].isWolf).toBe(true);
      expect(fox.foxLostPower).toBeFalsy();

      // Now create a scenario where trio has 0 wolves:
      const vA = createMockPlayer('vA', 'Villager A', 'villager');
      const vB = createMockPlayer('vB', 'Villager B', 'villager');
      const vC = createMockPlayer('vC', 'Villager C', 'villager');
      const pureVillageMap = new Map<string, Player>([
        [fox.id, fox],
        [vA.id, vA],
        [vB.id, vB],
        [vC.id, vC],
      ]);
      const pureSeating = [fox.id, vA.id, vB.id, vC.id];

      const act2 = new Map<string, NightAction>([
        ['act_fox2', mockAction(fox.id, 'fox', vB.id)],
      ]);
      const res2 = resolveNightActions(act2, pureVillageMap, 2, { seatingOrder: pureSeating });
      expect(res2.seerResults[0].isWolf).toBe(false);
      expect(fox.foxLostPower).toBe(true);
    });
  });

  describe('8. Crusader sacrifice and counter-attack', () => {
    it('should protect target and kill serial killer on cross-protection', () => {
      const crusader = createMockPlayer('cru', 'Crusader', 'crusader');
      const target = createMockPlayer('target', 'Protected Citizen', 'villager');
      const sk = createMockPlayer('sk', 'Serial Killer', 'serial_killer');

      const players = new Map<string, Player>([
        [crusader.id, crusader],
        [target.id, target],
        [sk.id, sk],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_crusader', mockAction(crusader.id, 'crusader', target.id)],
        ['act_sk', mockAction(sk.id, 'serial_killer', target.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Target survives because Crusader protected them!
      expect(res.deadPlayerIds).not.toContain(target.id);
      // Serial Killer is slain by Crusader's counter-attack!
      expect(res.deadPlayerIds).toContain(sk.id);
    });
  });

  describe('9. Big Bad Wolf adjacent neighbor maul', () => {
    it('should allow Big Bad Wolf to maul an additional neighbor if primary victim sits next to them', () => {
      const bbw = createMockPlayer('bbw', 'Big Bad Wolf', 'big_bad_wolf');
      const victim = createMockPlayer('victim', 'Pack Victim', 'villager');
      const extraTarget = createMockPlayer('extra', 'Extra Target', 'villager');
      const normalWolf = createMockPlayer('wolf', 'Normal Wolf', 'werewolf');

      const players = new Map<string, Player>([
        [bbw.id, bbw],
        [victim.id, victim],
        [extraTarget.id, extraTarget],
        [normalWolf.id, normalWolf],
      ]);

      // Seating circle: bbw sits directly next to victim
      const seatingOrder = [bbw.id, victim.id, extraTarget.id, normalWolf.id];

      const actions = new Map<string, NightAction>([
        ['act_pack', mockAction(normalWolf.id, 'werewolf', victim.id)],
        ['act_bbw', mockAction(bbw.id, 'big_bad_wolf', extraTarget.id)],
      ]);

      const res = resolveNightActions(actions, players, 1, { seatingOrder });
      // Both victim and extraTarget die!
      expect(res.deadPlayerIds).toContain(victim.id);
      expect(res.deadPlayerIds).toContain(extraTarget.id);
    });
  });

  describe('10. Hunter death and retaliatory revenge shot', () => {
    it('should eliminate Hunter target when Hunter dies at night', () => {
      const hunter = createMockPlayer('hunter', 'Hunter', 'hunter', { hunterTargetId: 'enemy' });
      const wolf = createMockPlayer('wolf', 'Wolf', 'werewolf');
      const enemy = createMockPlayer('enemy', 'Enemy', 'werewolf');

      const players = new Map<string, Player>([
        [hunter.id, hunter],
        [wolf.id, wolf],
        [enemy.id, enemy],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_wolf', mockAction(wolf.id, 'werewolf', hunter.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Hunter dies
      expect(res.deadPlayerIds).toContain(hunter.id);
      // Enemy is taken down by Hunter's revenge shot!
      expect(res.deadPlayerIds).toContain(enemy.id);
    });
  });

  describe('11. Amnesiac role awakening', () => {
    it('should allow Amnesiac to choose a dead player and inherit their role', () => {
      const amnesiac = createMockPlayer('amne', 'Amnesiac', 'amnesiac');
      const deadSeer = createMockPlayer('seer', 'Dead Seer', 'seer', { alive: false });

      const players = new Map<string, Player>([
        [amnesiac.id, amnesiac],
        [deadSeer.id, deadSeer],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_amne', mockAction(amnesiac.id, 'amnesiac', deadSeer.id)],
      ]);

      const res = resolveNightActions(actions, players, 2);
      expect(amnesiac.roleId).toBe('seer');
      expect(res.convertedPlayerIds).toContain(amnesiac.id);
    });
  });

  describe('12. Jester voter haunt & Elder village curse', () => {
    it('should haunt 1 guilty voter when Jester is executed', () => {
      const jester = createMockPlayer('jester', 'Jester', 'jester');
      const voter1 = createMockPlayer('v1', 'Voter 1', 'villager');
      const voter2 = createMockPlayer('v2', 'Voter 2', 'villager');

      const players = new Map<string, Player>([
        [jester.id, jester],
        [voter1.id, voter1],
        [voter2.id, voter2],
      ]);

      const votes = new Map<string, Vote>([
        ['vote1', mockVote(voter1.id, jester.id)],
        ['vote2', mockVote(voter2.id, jester.id)],
      ]);

      const res = resolveVotes(votes, players);
      expect(res.executedPlayerId).toBe(jester.id);
      expect([voter1.id, voter2.id]).toContain(res.hauntedPlayerId);
    });

    it('should trigger villageCursed when Elder is executed by the village', () => {
      const elder = createMockPlayer('elder', 'Elder', 'elder');
      const voter = createMockPlayer('v', 'Voter', 'villager');

      const players = new Map<string, Player>([
        [elder.id, elder],
        [voter.id, voter],
      ]);

      const votes = new Map<string, Vote>([
        ['vote', mockVote(voter.id, elder.id)],
      ]);

      const res = resolveVotes(votes, players);
      expect(res.executedPlayerId).toBe(elder.id);
      expect(res.villageCursed).toBe(true);
    });
  });

  describe('13. Firefighter wash and arson protection', () => {
    it('should wash away gasoline douse and protect target from burning', () => {
      const firefighter = createMockPlayer('ff', 'Firefighter', 'firefighter');
      const victim = createMockPlayer('v', 'Doused Victim', 'villager', { isDoused: true });
      const arsonist = createMockPlayer('arson', 'Arsonist', 'arsonist');

      const players = new Map<string, Player>([
        [firefighter.id, firefighter],
        [victim.id, victim],
        [arsonist.id, arsonist],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_ff', mockAction(firefighter.id, 'firefighter', victim.id)],
        ['act_ignite', mockAction(arsonist.id, 'arsonist', arsonist.id, 'ignite')],
      ]);

      const res = resolveNightActions(actions, players, 2);
      expect(victim.isDoused).toBe(false);
      expect(res.deadPlayerIds).not.toContain(victim.id);
    });
  });

  describe('14. Slayer guess and strike', () => {
    it('should eliminate werewolf on correct guess', () => {
      const slayer = createMockPlayer('slayer', 'Slayer', 'slayer');
      const wolf = createMockPlayer('wolf', 'Alpha Wolf', 'werewolf');

      const players = new Map<string, Player>([
        [slayer.id, slayer],
        [wolf.id, wolf],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_slayer', mockAction(slayer.id, 'slayer', wolf.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(res.deadPlayerIds).toContain(wolf.id);
      expect(slayer.slayerUsedShot).toBe(true);
    });
  });

  describe('15. Priest holy water judgment', () => {
    it('should kill werewolf target, but kill Priest if target is innocent villager', () => {
      // Case A: Wolf target -> Wolf dies
      const priestA = createMockPlayer('pA', 'Priest A', 'priest');
      const wolf = createMockPlayer('w', 'Wolf', 'werewolf');
      const mapA = new Map<string, Player>([[priestA.id, priestA], [wolf.id, wolf]]);
      const resA = resolveNightActions(new Map([['act', mockAction(priestA.id, 'priest', wolf.id)]]), mapA, 1);
      expect(resA.deadPlayerIds).toContain(wolf.id);
      expect(resA.deadPlayerIds).not.toContain(priestA.id);

      // Case B: Innocent target -> Priest dies from holy backfire!
      const priestB = createMockPlayer('pB', 'Priest B', 'priest');
      const innocent = createMockPlayer('inn', 'Villager', 'villager');
      const mapB = new Map<string, Player>([[priestB.id, priestB], [innocent.id, innocent]]);
      const resB = resolveNightActions(new Map([['act', mockAction(priestB.id, 'priest', innocent.id)]]), mapB, 1);
      expect(resB.deadPlayerIds).toContain(priestB.id);
      expect(resB.deadPlayerIds).not.toContain(innocent.id);
    });
  });

  describe('16. Bogeyman fallback attack', () => {
    it('should attack Bogeyman target when wolves cast no valid unanimous target', () => {
      const bogeyman = createMockPlayer('bm', 'Bogeyman', 'bogeyman');
      const victim = createMockPlayer('v', 'Victim', 'villager');

      const players = new Map<string, Player>([
        [bogeyman.id, bogeyman],
        [victim.id, victim],
      ]);

      // No pack werewolf vote cast, only Bogeyman acts
      const actions = new Map<string, NightAction>([
        ['act_bm', mockAction(bogeyman.id, 'bogeyman', victim.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(res.deadPlayerIds).toContain(victim.id);
    });
  });

  describe('17. Paranormal Investigator inspection and power loss', () => {
    it('should lose power permanently if inspected target is ordinary villager', () => {
      const pi = createMockPlayer('pi', 'PI', 'paranormal_investigator');
      const villager = createMockPlayer('v', 'Ordinary Villager', 'villager');

      const players = new Map<string, Player>([
        [pi.id, pi],
        [villager.id, villager],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_pi', mockAction(pi.id, 'paranormal_investigator', villager.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(pi.paranormalLostPower).toBe(true);
      expect(res.seerResults[0].message).toContain('padam selamanya');
    });
  });

  describe('18. Thief role swapping on night 1', () => {
    it('should swap roles with target on night 1', () => {
      const thief = createMockPlayer('thief', 'Thief', 'thief');
      const seer = createMockPlayer('seer', 'Seer Target', 'seer');

      const players = new Map<string, Player>([
        [thief.id, thief],
        [seer.id, seer],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_thief', mockAction(thief.id, 'thief', seer.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(thief.roleId).toBe('seer');
      expect(seer.roleId).toBe('thief');
      expect(res.convertedPlayerIds).toContain(thief.id);
    });
  });

  describe('19. Hoodlum deceptive detection', () => {
    it('should be detected as innocent (not wolf) by Seer despite being on werewolf team', () => {
      const seer = createMockPlayer('seer', 'Seer', 'seer');
      const hoodlum = createMockPlayer('hoodlum', 'Hoodlum Traitor', 'hoodlum');

      const players = new Map<string, Player>([
        [seer.id, seer],
        [hoodlum.id, hoodlum],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_seer', mockAction(seer.id, 'seer', hoodlum.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(res.seerResults[0].isWolf).toBe(false);
      expect(res.seerResults[0].message).toContain('WARGA DESA');
    });
  });

  describe('20. Lone Wolf solo victory', () => {
    it('should trigger Lone Wolf solo victory when lone wolf is the last survivor', () => {
      const loneWolf = createMockPlayer('lw', 'Lone Wolf', 'lone_wolf');

      const winResult = checkWinCondition([loneWolf], { round: 5 });
      expect(winResult.hasWinner).toBe(true);
      expect(winResult.winner).toBe('lone_wolf');
      expect(winResult.winnerTitle).toContain('Lone Wolf');
    });
  });

  describe('21. Escort roleblocking Serial Killer retaliation', () => {
    it('should kill the Escort when Escort attempts to roleblock the Serial Killer', () => {
      const escort = createMockPlayer('escort', 'Escort', 'escort');
      const sk = createMockPlayer('sk', 'Serial Killer', 'serial_killer');
      const villager = createMockPlayer('v1', 'Villager', 'villager');

      const players = new Map<string, Player>([
        [escort.id, escort],
        [sk.id, sk],
        [villager.id, villager],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_escort', mockAction(escort.id, 'escort', sk.id)],
        ['act_sk', mockAction(sk.id, 'serial_killer', villager.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Escort is killed by Serial Killer retaliation
      expect(res.deadPlayerIds).toContain(escort.id);
      // Serial killer was blocked from killing villager
      expect(res.deadPlayerIds).not.toContain(villager.id);
      expect(res.publicAnnouncements.some((a) => a.includes('Pengawal Pengalih') && a.includes('Serial Killer'))).toBe(true);
    });
  });

  describe('22. Jailer Prisoner Execution', () => {
    it('should execute the prisoner if secondaryTargetId is execute', () => {
      const jailer = createMockPlayer('jailer', 'Jailer', 'jailer');
      const prisoner = createMockPlayer('prisoner', 'Prisoner', 'werewolf');

      const players = new Map<string, Player>([
        [jailer.id, jailer],
        [prisoner.id, prisoner],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_jail', mockAction(jailer.id, 'jailer', prisoner.id, 'execute')],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(res.deadPlayerIds).toContain(prisoner.id);
      expect(res.publicAnnouncements.some((a) => a.includes('Sipir Penjara'))).toBe(true);
    });
  });

  describe('23. Recluse Investigation Misdirection', () => {
    it('should misdirect Seer, Detective, and Aura Seer into perceiving Recluse as evil/wolf', () => {
      const seer = createMockPlayer('seer', 'Seer', 'seer');
      const detective = createMockPlayer('detective', 'Detective', 'detective');
      const auraSeer = createMockPlayer('aura', 'Aura Seer', 'aura_seer');
      const recluse = createMockPlayer('recluse', 'Recluse Hermit', 'recluse');

      const players = new Map<string, Player>([
        [seer.id, seer],
        [detective.id, detective],
        [auraSeer.id, auraSeer],
        [recluse.id, recluse],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_seer', mockAction(seer.id, 'seer', recluse.id)],
        ['act_det', mockAction(detective.id, 'detective', recluse.id)],
        ['act_aura', mockAction(auraSeer.id, 'aura_seer', recluse.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      const seerRes = res.seerResults.find((r) => r.seerPlayerId === seer.id);
      const detRes = res.seerResults.find((r) => r.seerPlayerId === detective.id);
      const auraRes = res.seerResults.find((r) => r.seerPlayerId === auraSeer.id);

      expect(seerRes?.isWolf).toBe(true);
      expect(detRes?.isWolf).toBe(true); // suspicious
      expect(auraRes?.team).toBe('werewolf');
    });
  });

  describe('24. Wolf Hound Allegiance Choice', () => {
    it('should switch role to werewolf when choosing werewolf on Night 1', () => {
      const hound = createMockPlayer('hound', 'Wolf Hound', 'wolf_hound');
      const players = new Map<string, Player>([[hound.id, hound]]);

      const actions = new Map<string, NightAction>([
        ['act_hound', mockAction(hound.id, 'wolf_hound', 'werewolf')],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(hound.roleId).toBe('werewolf');
      expect(res.convertedPlayerIds).toContain(hound.id);
    });

    it('should switch role to villager when choosing village on Night 1', () => {
      const hound = createMockPlayer('hound', 'Wolf Hound', 'wolf_hound');
      const players = new Map<string, Player>([[hound.id, hound]]);

      const actions = new Map<string, NightAction>([
        ['act_hound', mockAction(hound.id, 'wolf_hound', 'village')],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(hound.roleId).toBe('villager');
      expect(res.convertedPlayerIds).toContain(hound.id);
    });
  });

  describe('25. Wild Child Role Model Selection', () => {
    it('should store roleModelId on Night 1 and confirm to the Wild Child', () => {
      const wildChild = createMockPlayer('wc', 'Wild Child', 'wild_child');
      const model = createMockPlayer('model', 'Elder Model', 'elder');
      const players = new Map<string, Player>([
        [wildChild.id, wildChild],
        [model.id, model],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_wc', mockAction(wildChild.id, 'wild_child', model.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(wildChild.roleModelId).toBe(model.id);
      expect(res.seerResults[0].message).toContain('panutan hidup');
    });
  });

  describe('26. Arsonist Solo Victory', () => {
    it('should trigger Arsonist victory when Arsonist is the last one alive', () => {
      const arsonist = createMockPlayer('arsonist', 'Arsonist Pyromaniac', 'arsonist');

      const winResult = checkWinCondition([arsonist], { round: 6 });
      expect(winResult.hasWinner).toBe(true);
      expect(winResult.winner).toBe('arsonist');
      expect(winResult.winnerTitle).toContain('Arsonist');
    });
  });

  describe('27. Cursed Wolf-Father 1x infection limit', () => {
    it('should convert victim on first use, but kill on subsequent attacks once power is exhausted', () => {
      const father = createMockPlayer('father', 'Cursed Father', 'cursed_wolf_father');
      const victim1 = createMockPlayer('v1', 'Victim 1', 'villager');
      const victim2 = createMockPlayer('v2', 'Victim 2', 'villager');

      const players = new Map<string, Player>([
        [father.id, father],
        [victim1.id, victim1],
        [victim2.id, victim2],
      ]);

      // Night 1: First attack -> converts victim1 to werewolf
      const actions1 = new Map<string, NightAction>([
        ['act_cwf1', mockAction(father.id, 'cursed_wolf_father', victim1.id)],
      ]);
      const res1 = resolveNightActions(actions1, players, 1);
      expect(victim1.roleId).toBe('werewolf');
      expect(res1.deadPlayerIds).not.toContain(victim1.id);
      expect(father.cursedFatherUsedInfect).toBe(true);

      // Night 2: Second attack -> power exhausted, kills victim2
      const actions2 = new Map<string, NightAction>([
        ['act_cwf2', mockAction(father.id, 'cursed_wolf_father', victim2.id)],
      ]);
      const res2 = resolveNightActions(actions2, players, 2);
      expect(res2.deadPlayerIds).toContain(victim2.id);
    });
  });

  describe('28. White Werewolf alternate night wolf hunt', () => {
    it('should only kill on alternate even nights (round 2, 4, etc.)', () => {
      const whiteWolf = createMockPlayer('ww', 'White Wolf', 'white_werewolf');
      const packWolf = createMockPlayer('pw', 'Pack Wolf', 'werewolf');

      const players = new Map<string, Player>([
        [whiteWolf.id, whiteWolf],
        [packWolf.id, packWolf],
      ]);

      // Round 1 (odd): cannot solo kill fellow wolf
      const actionsRound1 = new Map<string, NightAction>([
        ['act_ww1', mockAction(whiteWolf.id, 'white_werewolf', packWolf.id)],
      ]);
      const res1 = resolveNightActions(actionsRound1, players, 1);
      expect(res1.deadPlayerIds).not.toContain(packWolf.id);

      // Round 2 (even): strikes fellow wolf
      const actionsRound2 = new Map<string, NightAction>([
        ['act_ww2', mockAction(whiteWolf.id, 'white_werewolf', packWolf.id)],
      ]);
      const res2 = resolveNightActions(actionsRound2, players, 2);
      expect(res2.deadPlayerIds).toContain(packWolf.id);
    });
  });

  describe('29. Ghost Night 1 auto-death', () => {
    it('should automatically sacrifice Ghost on Night 1 into spiritual spectator', () => {
      const ghost = createMockPlayer('ghost', 'Casper', 'ghost');
      const players = new Map<string, Player>([[ghost.id, ghost]]);

      const res = resolveNightActions(new Map(), players, 1);
      expect(res.deadPlayerIds).toContain(ghost.id);
      expect(res.publicAnnouncements.some((a) => a.includes('Hantu (Ghost'))).toBe(true);
    });
  });

  describe('30. Double Victory (Village & Surviving Lovers)', () => {
    it('should grant double victory status to Village and surviving Lovers when both conditions are met', () => {
      const v1 = createMockPlayer('v1', 'Romeo', 'villager');
      const v2 = createMockPlayer('v2', 'Juliet', 'villager');
      v1.partnerId = v2.id;
      v2.partnerId = v1.id;

      const winResult = checkWinCondition([v1, v2], { round: 3 });
      expect(winResult.hasWinner).toBe(true);
      expect(Array.isArray(winResult.winner)).toBe(true);
      expect(winResult.winner).toContain('village');
      expect(winResult.winner).toContain('lovers');
      expect(winResult.winnerTitle).toContain('Pasangan Sehidup Semati');
    });
  });

  describe('31. Gypsy and Actor night interactions', () => {
    it('should successfully establish mystical contact and study actor targets', () => {
      const gypsy = createMockPlayer('gypsy', 'Gypsy', 'gypsy');
      const actor = createMockPlayer('actor', 'Actor', 'actor');
      const villager = createMockPlayer('v', 'Target', 'villager');

      const players = new Map<string, Player>([
        [gypsy.id, gypsy],
        [actor.id, actor],
        [villager.id, villager],
      ]);

      const actions = new Map<string, NightAction>([
        ['act_gypsy', mockAction(gypsy.id, 'gypsy', villager.id)],
        ['act_actor', mockAction(actor.id, 'actor', villager.id)],
      ]);

      const res = resolveNightActions(actions, players, 1);
      expect(res.seerResults.some((r) => r.seerPlayerId === gypsy.id && r.message.includes('Gipsi'))).toBe(true);
      expect(res.seerResults.some((r) => r.seerPlayerId === actor.id && r.message.includes('Aktor'))).toBe(true);
    });
  });
});
