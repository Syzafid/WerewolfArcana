import { ALL_ROLES, type Player, type NightAction } from '@werewolf/shared';

export interface SeerResult {
  seerPlayerId: string;
  targetId: string;
  targetName: string;
  message: string;
  isWolf?: boolean;
  team?: string;
  actionDescription?: string;
  round?: number;
}

export interface NightResolutionOutput {
  deadPlayerIds: string[];
  publicAnnouncements: string[];
  seerResults: SeerResult[];
  convertedPlayerIds?: string[];
}

export interface NightResolverOptions {
  wolfKillsQuota?: number;
  seatingOrder?: string[];
  villageCursed?: boolean;
}

export function resolveNightActions(
  actions: Map<string, NightAction>,
  players: Map<string, Player>,
  round: number = 1,
  options: NightResolverOptions = {}
): NightResolutionOutput {
  const deadPlayerIds = new Set<string>();
  const publicAnnouncements: string[] = [];
  const seerResults: SeerResult[] = [];
  const convertedPlayerIds: string[] = [];

  // Vigilante guilt suicide from previous night (suicide occurs at the start of night)
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.vigilanteGuilt && !deadPlayerIds.has(pId)) {
      deadPlayerIds.add(pId);
      publicAnnouncements.push(
        `Vigilante (${p.name}) tidak sanggup menanggung rasa bersalah setelah menembak warga desa yang tak bersalah dan mengakhiri hidupnya sendiri semalam.`
      );
      seerResults.push({
        seerPlayerId: pId,
        targetId: pId,
        targetName: p.name,
        actionDescription: 'Mati Menyesal',
        message: 'Rasa Bersalah Mendalam: Kamu bunuh diri karena telah menembak sesama warga desa yang tak bersalah semalam sebelumnya.',
        round,
      });
    }
  }

  // Deep clone actions map to allow transformations (e.g. Transporter swap, Escort block)
  const actionList = Array.from(actions.values()).map((a) => ({ ...a }));

  // -------------------------------------------------------------
  // 1. STAGE 2 — DISRUPTIVE ACTIONS (Transporter, Escort, Jailer)
  // -------------------------------------------------------------
  const blockedPlayerIds = new Set<string>();
  const jailedPlayerIds = new Set<string>();

  // Escort: blocks target action (cannot block same target two nights in a row)
  for (const act of actionList) {
    if (act.roleId === 'escort' && act.targetPlayerId) {
      const actor = players.get(act.playerId);
      const target = players.get(act.targetPlayerId);
      if (actor && actor.alive) {
        if (actor.lastRoleblockTargetId && actor.lastRoleblockTargetId === act.targetPlayerId) {
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Gagal mengalihkan perhatian ${target.name}`,
              message: `Aksi Escort: Kamu tidak dapat mengalihkan perhatian ${target.name} dua malam berturut-turut! Pengalihan gagal.`,
              round,
            });
          }
        } else {
          actor.lastRoleblockTargetId = act.targetPlayerId;
          blockedPlayerIds.add(act.targetPlayerId);

          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Mengalihkan perhatian ${target.name}`,
              message: `Aksi Escort: Kamu berhasil mengalihkan perhatian ${target.name} sehingga ia tidak dapat melakukan aksinya semalam.`,
              round,
            });
            seerResults.push({
              seerPlayerId: target.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: 'Aksi Terhalang',
              message: 'Perhatian Terganggu: Seseorang mendatangi dan mengalihkan perhatianmu semalam sehingga kamu tidak dapat melancarkan aksi!',
              round,
            });
          }

          // Retaliation: If Escort visits Serial Killer, Serial Killer kills the Escort!
          if (target && target.alive && target.roleId === 'serial_killer') {
            deadPlayerIds.add(actor.id);
            publicAnnouncements.push(
              'Pengawal Pengalih (Escort) mencoba memblokir Pembunuh Berantai (Serial Killer) dan tewas ditikam di tempat!'
            );
          }
        }
      }
    }
  }

  // Jailer: jails target (immune to attacks + blocked from acting, can execute prisoner)
  // Cannot jail same target two nights in a row
  for (const act of actionList) {
    if (act.roleId === 'jailer' && act.targetPlayerId) {
      const actor = players.get(act.playerId);
      const target = players.get(act.targetPlayerId);
      if (actor && actor.alive) {
        if (actor.lastJailedTargetId && actor.lastJailedTargetId === act.targetPlayerId) {
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Gagal memenjarakan ${target.name}`,
              message: `Aksi Jailer: Kamu tidak dapat mengurung ${target.name} dua malam berturut-turut! Sel tidak dapat digunakan.`,
              round,
            });
          }
        } else {
          actor.lastJailedTargetId = act.targetPlayerId;
          jailedPlayerIds.add(act.targetPlayerId);
          blockedPlayerIds.add(act.targetPlayerId);

          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Memenjarakan ${target.name}`,
              message: `Aksi Jailer: Kamu mengurung ${target.name} di dalam sel tahanan semalam.`,
              round,
            });
            seerResults.push({
              seerPlayerId: target.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: 'Dipenjara',
              message: 'Dikurung Sipir: Kamu dikurung di sel tahanan semalam. Kamu aman dari serangan luar tetapi tidak dapat beraksi.',
              round,
            });
          }

          // Jailer execution option
          if (act.secondaryTargetId === 'execute') {
            const hasLostExecutions = actor.jailerLostExecutions === true;
            const remainingExecutions = actor.jailerExecutionsLeft ?? 3;

            if (hasLostExecutions || remainingExecutions <= 0) {
              if (target) {
                seerResults.push({
                  seerPlayerId: actor.id,
                  targetId: target.id,
                  targetName: target.name,
                  actionDescription: 'Eksekusi Ditolak',
                  message: 'Aksi Jailer: Kamu tidak dapat mengeksekusi tahanan karena telah kehilangan hak eksekusi atau kuota telah habis!',
                  round,
                });
              }
            } else if (target) {
              actor.jailerExecutionsLeft = remainingExecutions - 1;
              deadPlayerIds.add(act.targetPlayerId);

              const targetRole = ALL_ROLES[target.roleId];
              if (targetRole && targetRole.team === 'village') {
                // PENALTY: Executing innocent village member strips Jailer of executions forever!
                actor.jailerLostExecutions = true;
                publicAnnouncements.push(
                  `Sipir Penjara (Jailer) memutuskan untuk mengeksekusi tahanannya (${target.name}) di balik jeruji besi!`
                );
                seerResults.push({
                  seerPlayerId: actor.id,
                  targetId: target.id,
                  targetName: target.name,
                  actionDescription: 'Salah Eksekusi Warga',
                  message: `Aksi Jailer: Kamu mengeksekusi ${target.name}. PERINGATAN KERAS: Targetmu ternyata adalah sesama warga desa (${targetRole.indonesianName})! Karena telah menumpahkan darah warga yang tak bersalah, kamu kehilangan hak eksekusi untuk selamanya!`,
                  round,
                });
              } else {
                publicAnnouncements.push(
                  'Sipir Penjara (Jailer) memutuskan untuk mengeksekusi tahanannya sendiri di balik jeruji besi!'
                );
                seerResults.push({
                  seerPlayerId: actor.id,
                  targetId: target.id,
                  targetName: target.name,
                  actionDescription: 'Eksekusi Sukses',
                  message: `Aksi Jailer: Kamu berhasil mengeksekusi ${target.name} (${targetRole?.indonesianName || 'Musuh'}) di balik jeruji besi! (Sisa kuota eksekusi: ${actor.jailerExecutionsLeft})`,
                  round,
                });
              }
            }
          } else {
            // Jailed without execution: If target is Serial Killer, SK retaliates and kills the Jailer!
            if (target && target.roleId === 'serial_killer' && target.alive && !deadPlayerIds.has(target.id)) {
              deadPlayerIds.add(actor.id);
              publicAnnouncements.push(
                `Sipir Penjara (Jailer — ${actor.name}) ditemukan tewas mengenaskan dengan luka tusukan pisau di dalam sel penjara!`
              );
              seerResults.push({
                seerPlayerId: actor.id,
                targetId: target.id,
                targetName: target.name,
                actionDescription: 'Ditikam Serial Killer',
                message: `Aksi Jailer: Kamu memenjarakan ${target.name} namun tidak mengeksekusinya. Ternyata ia adalah Pembunuh Berantai (Serial Killer) yang menyerang balik dan menikammu hingga tewas di dalam sel!`,
                round,
              });
              seerResults.push({
                seerPlayerId: target.id,
                targetId: actor.id,
                targetName: actor.name,
                actionDescription: 'Menikam Jailer',
                message: `Aksi Serial Killer: Sipir Penjara (${actor.name}) memenjarakanmu tanpa mengeksekusimu! Kamu memanfaatkan kesempatan emas ini untuk menikamnya hingga tewas di dalam sel!`,
                round,
              });
            }
          }

          // If Jailer failed execution (e.g. out of charges) against Serial Killer, SK also stabs Jailer!
          if (target && target.roleId === 'serial_killer' && target.alive && !deadPlayerIds.has(target.id) && !deadPlayerIds.has(actor.id)) {
            deadPlayerIds.add(actor.id);
            publicAnnouncements.push(
              `Sipir Penjara (Jailer — ${actor.name}) ditemukan tewas mengenaskan dengan luka tusukan pisau di dalam sel penjara!`
            );
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: 'Ditikam Serial Killer',
              message: `Aksi Jailer: Eksekusimu terhadap ${target.name} gagal! Sang Pembunuh Berantai (Serial Killer) menyerang balik dan menikammu hingga tewas di dalam sel!`,
              round,
            });
            seerResults.push({
              seerPlayerId: target.id,
              targetId: actor.id,
              targetName: actor.name,
              actionDescription: 'Menikam Jailer',
              message: `Aksi Serial Killer: Sipir Penjara (${actor.name}) gagal mengeksekusimu! Kamu memanfaatkan kesempatan untuk menikamnya hingga tewas di dalam sel!`,
              round,
            });
          }
        }
      }
    }
  }

  // Transporter: swaps targets of 2 players
  for (const act of actionList) {
    if (act.roleId === 'transporter' && act.targetPlayerId && act.secondaryTargetId) {
      const actor = players.get(act.playerId);
      if (actor && actor.alive && !blockedPlayerIds.has(actor.id)) {
        const t1 = act.targetPlayerId;
        const t2 = act.secondaryTargetId;

        // Cannot transport same target to themselves
        if (t1 === t2) continue;

        // Isolated prisoners in jail cannot be transported out of jail
        if (jailedPlayerIds.has(t1) || jailedPlayerIds.has(t2)) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: t1,
            targetName: players.get(t1)?.name || '',
            actionDescription: 'Gagal Memindahkan',
            message: 'Aksi Transporter: Pemindahan gagal karena salah satu target berada di dalam sel isolasi Sipir Penjara!',
            round,
          });
          continue;
        }

        // Swap targets across all non-transporter actions
        for (const targetAct of actionList) {
          if (targetAct.roleId !== 'transporter') {
            if (targetAct.targetPlayerId === t1) targetAct.targetPlayerId = t2;
            else if (targetAct.targetPlayerId === t2) targetAct.targetPlayerId = t1;
          }
        }

        const p1 = players.get(t1);
        const p2 = players.get(t2);

        seerResults.push({
          seerPlayerId: actor.id,
          targetId: t1,
          targetName: p1?.name || '',
          actionDescription: 'Menukar Posisi',
          message: `Aksi Transporter: Kamu berhasil menukar posisi ${p1?.name} dan ${p2?.name} semalam! Seluruh pengunjung mereka saling bertukar arah.`,
          round,
        });

        if (p1) {
          seerResults.push({
            seerPlayerId: p1.id,
            targetId: p1.id,
            targetName: p1.name,
            actionDescription: 'Dipindahkan Misterius',
            message: 'Sensasi Gaib: Kamu merasakan dirimu dipindahkan secara misterius oleh Pengangkut (Transporter) semalam!',
            round,
          });
        }
        if (p2) {
          seerResults.push({
            seerPlayerId: p2.id,
            targetId: p2.id,
            targetName: p2.name,
            actionDescription: 'Dipindahkan Misterius',
            message: 'Sensasi Gaib: Kamu merasakan dirimu dipindahkan secara misterius oleh Pengangkut (Transporter) semalam!',
            round,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. STAGE 2 — PROTECTIVE ACTIONS
  // -------------------------------------------------------------
  const protectedPlayers = new Set<string>(jailedPlayerIds);
  const guardedByBodyguard = new Map<string, string>(); // targetId -> bodyguardId
  const crusaderGuards = new Map<string, string>(); // targetId -> crusaderId
  const alertVeterans = new Set<string>();

  for (const act of actionList) {
    const actor = players.get(act.playerId);
    if (!actor || !actor.alive || blockedPlayerIds.has(actor.id)) continue;

    // Drunk role has NO real protective power!
    if (actor.roleId === 'drunk') continue;

    // Village curse penalty if Elder was lynched by village
    if (options.villageCursed && ALL_ROLES[actor.roleId]?.team === 'village' && actor.roleId !== 'villager') {
      continue;
    }

    if (act.roleId === 'guardian') {
      if (act.targetPlayerId) {
        const target = players.get(act.targetPlayerId);
        if (actor.lastProtectedTargetId && actor.lastProtectedTargetId === act.targetPlayerId) {
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Gagal melindungi ${target.name}`,
              message: `Aksi Guardian: Kamu tidak boleh melindungi ${target.name} dua malam berturut-turut! Perlindungan gagal.`,
              round,
            });
          }
        } else {
          actor.lastProtectedTargetId = act.targetPlayerId;
          protectedPlayers.add(act.targetPlayerId);
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Melindungi ${target.name}`,
              message: `Aksi Guardian: Kamu berhasil menyelimuti rumah ${target.name} dengan perisai suci pelindung semalam.`,
              round,
            });
          }
        }
      }
    } else if (act.roleId === 'crusader') {
      if (act.targetPlayerId) {
        const target = players.get(act.targetPlayerId);
        if (actor.lastProtectedTargetId && actor.lastProtectedTargetId === act.targetPlayerId) {
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Gagal menjaga ${target.name}`,
              message: `Aksi Crusader: Kamu tidak boleh menjaga ${target.name} dua malam berturut-turut! Penjagaan gagal.`,
              round,
            });
          }
        } else {
          actor.lastProtectedTargetId = act.targetPlayerId;
          protectedPlayers.add(act.targetPlayerId);
          crusaderGuards.set(act.targetPlayerId, actor.id);
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Melindungi & Menjaga ${target.name}`,
              message: `Aksi Crusader: Kamu bersiaga dengan pedang dan perisai menjaga ${target.name} dari penyusup.`,
              round,
            });
          }
        }
      }
    } else if (act.roleId === 'defender') {
      // Defender rule: Cannot protect same target two nights in a row
      if (act.targetPlayerId) {
        const target = players.get(act.targetPlayerId);
        if (actor.lastProtectedTargetId && actor.lastProtectedTargetId === act.targetPlayerId) {
          // Protection fails due to consecutive target restriction
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Gagal melindungi ${target.name}`,
              message: `Aksi Defender: Kamu tidak dapat melindungi ${target.name} dua malam berturut-turut! Perlindungan gagal.`,
              round,
            });
          }
        } else {
          actor.lastProtectedTargetId = act.targetPlayerId;
          protectedPlayers.add(act.targetPlayerId);
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Melindungi ${target.name}`,
              message: `Aksi Defender: Perisai cahayamu kokoh melindungi ${target.name} sepanjang malam.`,
              round,
            });
          }
        }
      }
    } else if (act.roleId === 'firefighter' && act.targetPlayerId) {
      // Firefighter extinguishes douse and shields target
      const washed = players.get(act.targetPlayerId);
      if (washed) {
        washed.isDoused = false;
        protectedPlayers.add(act.targetPlayerId);
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: washed.id,
          targetName: washed.name,
          actionDescription: `Menyiram & Melindungi ${washed.name}`,
          message: `Aksi Firefighter: Kamu menyiram dan membersihkan rumah ${washed.name} dari minyak Arsonist serta melindunginya semalam.`,
          round,
        });
      }
    } else if (act.roleId === 'bodyguard' && act.targetPlayerId) {
      const target = players.get(act.targetPlayerId);
      if (actor.lastProtectedTargetId && actor.lastProtectedTargetId === act.targetPlayerId) {
        if (target) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: `Gagal mengawal ${target.name}`,
            message: `Aksi Bodyguard: Kamu tidak boleh mengawal ${target.name} dua malam berturut-turut! Pengawalan gagal.`,
            round,
          });
        }
      } else {
        actor.lastProtectedTargetId = act.targetPlayerId;
        guardedByBodyguard.set(act.targetPlayerId, actor.id);
        if (target) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: `Mengawal ${target.name}`,
            message: `Aksi Bodyguard: Kamu bersiaga di depan pintu rumah ${target.name} siap menangkis segala ancaman.`,
            round,
          });
        }
      }
    } else if (act.roleId === 'veteran') {
      const alerts = actor.alertsLeft ?? 3;
      if (alerts > 0) {
        actor.alertsLeft = alerts - 1;
        alertVeterans.add(actor.id);
        protectedPlayers.add(actor.id); // Veteran on alert gains defense against attacks!
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Siaga Penuh',
          message: `Aksi Veteran: Kamu bersiap siaga di balik barikade senjata malam ini! (Sisa siaga: ${actor.alertsLeft})`,
          round,
        });
      }
    } else if (act.roleId === 'witch') {
      // Witch potion heal
      if (act.secondaryTargetId === 'heal' || act.secondaryTargetId === 'save') {
        if (actor.witchPotions?.heal !== false && act.targetPlayerId) {
          protectedPlayers.add(act.targetPlayerId);
          if (actor.witchPotions) actor.witchPotions.heal = false;
          const target = players.get(act.targetPlayerId);
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Menyembuhkan ${target.name}`,
              message: `Aksi Penyihir: Ramuan Penyembuhmu menyelamatkan ${target.name} dari ambang kematian!`,
              round,
            });
          }
        }
      }
    } else if (act.roleId === 'survivor') {
      const isSaving = act.targetPlayerId === 'save' || act.targetPlayerId === 'skip' || act.secondaryTargetId === 'save';
      const vests = actor.survivorVestsLeft ?? 3;

      if (isSaving) {
        // Survivor chooses to gamble and save their vest for later
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Menyimpan Rompi',
          message: `Aksi Survivor: Kamu memilih bertaruh dan menyimpan rompi antipelurumu malam ini. Kamu TIDAK terlindung dari serangan malam! (Sisa rompi: ${vests})`,
          round,
        });
      } else if (vests > 0) {
        // Wear vest: consumes 1 vest charge, grants protection
        actor.survivorVestsLeft = vests - 1;
        protectedPlayers.add(actor.id);
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Mengenakan Rompi Pelindung',
          message: `Aksi Survivor: Kamu mengenakan 1 rompi antipeluru kevlar malam ini! Pertahananmu aktif menahan segala serangan maut semalam. (Sisa rompi: ${actor.survivorVestsLeft})`,
          round,
        });
      } else {
        // Out of vests
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Rompi Habis',
          message: 'Aksi Survivor: Seluruh kuota rompi antipelurumu (3/3) telah habis! Kamu tidak terlindung dari serangan malam.',
          round,
        });
      }
    }
  }

  // Veteran kills anyone who visits him
  if (alertVeterans.size > 0) {
    for (const act of actionList) {
      const isVisitingTarget = act.targetPlayerId && alertVeterans.has(act.targetPlayerId);
      const isVisitingSecondary = act.secondaryTargetId && alertVeterans.has(act.secondaryTargetId);
      if (isVisitingTarget || isVisitingSecondary) {
        const visitor = players.get(act.playerId);
        if (visitor && visitor.alive && !alertVeterans.has(visitor.id)) {
          if (!deadPlayerIds.has(visitor.id)) {
            deadPlayerIds.add(visitor.id);
            publicAnnouncements.push('Seseorang tertembak mati saat mencoba menyelinap ke rumah Veteran yang sedang bersiaga!');
            seerResults.push({
              seerPlayerId: visitor.id,
              targetId: visitor.id,
              targetName: visitor.name,
              actionDescription: 'Ditembak Veteran',
              message: 'Tembakan Barikade: Kamu mendatangi rumah Veteran yang sedang siaga penuh dan tertembak mati seketika!',
              round,
            });
          }
        }
      }
    }
  }

  // Crusader attacks hostile visitors approaching the protected target
  if (crusaderGuards.size > 0) {
    for (const [targetId, crusaderId] of crusaderGuards.entries()) {
      const hostileVisitor = actionList.find(
        (a) => a.targetPlayerId === targetId && a.playerId !== targetId && a.playerId !== crusaderId && ALL_ROLES[a.roleId]?.team !== 'village'
      );
      if (hostileVisitor) {
        deadPlayerIds.add(hostileVisitor.playerId);
        publicAnnouncements.push(
          'Ksatria Salib (Crusader) menebas penyerang tak dikenal yang mendekati target perlindungannya!'
        );
      }
    }
  }

  // -------------------------------------------------------------
  // 3. STAGE 3 — KILLING ACTIONS (HIERARCHICAL RESOLUTION)
  // Hierarchy Order:
  // - Tier 1: Arsonist Ignite (Highest Priority: multi-night preparation culminates first)
  // - Tier 2: Sorcerer Guessing Strike (Deduction assassin strikes before physical killers)
  // - Tier 3: Serial Killer Attack (Solo Neutral Killer acts before Werewolf pack & Village)
  // - Tier 4: Werewolf Collective Attack & Special Werewolves
  // - Tier 5: Village Killing Roles (Witch Poison, Vigilante Shot, Slayer, Priest)
  // - Tier 6: Non-lethal & Conversions (Arsonist Douse, Cult Leader, Piper, Vampire, Wolf Hound)
  // -------------------------------------------------------------

  // =========================================================================
  // TIER 1: ARSONIST IGNITE (Prioritas Tertinggi / Puncak Persiapan Malam)
  // =========================================================================
  for (const act of actionList) {
    if (act.roleId === 'arsonist') {
      const actor = players.get(act.playerId);
      if (!actor || !actor.alive || blockedPlayerIds.has(actor.id)) continue;
      // Ignite action triggers if actor targets self or secondaryTargetId === 'ignite'
      if (act.targetPlayerId === actor.id || act.secondaryTargetId === 'ignite') {
        let burnedCount = 0;
        const burnedNames: string[] = [];
        for (const [pId, p] of players.entries()) {
          if (p.isDoused && p.alive && pId !== actor.id) {
            deadPlayerIds.add(pId);
            burnedCount++;
            burnedNames.push(p.name);
            seerResults.push({
              seerPlayerId: pId,
              targetId: actor.id,
              targetName: actor.name,
              actionDescription: 'Terbakar Kobaran Api',
              message: 'Kobaran Api Maut: Bensin yang menyelimuti tubuh dan rumahmu semalam tersulut api Arsonist! Kamu tewas terbakar mengenaskan sebelum sempat melancarkan aksimu!',
              round,
            });
          }
        }
        if (burnedCount > 0) {
          publicAnnouncements.push('Kobaran api meluap membakar seluruh rumah yang telah disiram bensin oleh Arsonist!');
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: actor.id,
            targetName: actor.name,
            actionDescription: 'Membakar Target',
            message: `Aksi Arsonist: Kamu menyulut pemantik api dan membakar ${burnedCount} korban (${burnedNames.join(', ')}) hingga hangus tak bersisa!`,
            round,
          });
        } else {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: actor.id,
            targetName: actor.name,
            actionDescription: 'Membakar Tanpa Target',
            message: 'Aksi Arsonist: Kamu menyalakan pemantik api, namun belum ada rumah yang disiram bensin sehingga kobaran api tidak menyala.',
            round,
          });
        }
      }
    }
  }

  // =========================================================================
  // TIER 2: SORCERER GUESS (Prioritas Deduksi Gaib: Mendahului Serial Killer)
  // =========================================================================
  for (const act of actionList) {
    if (act.roleId === 'sorcerer') {
      const actor = players.get(act.playerId);
      // Sorcerer cannot strike if already burned by Arsonist in Tier 1 or blocked
      if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id)) continue;
      if (!act.targetPlayerId) continue;

      const target = players.get(act.targetPlayerId);
      const guessedRoleId = act.secondaryTargetId;
      if (target && target.alive && guessedRoleId) {
        const actualRoleId = target.roleId;
        const actualRoleDef = ALL_ROLES[actualRoleId];
        const guessedRoleDef = ALL_ROLES[guessedRoleId];

        // If guess is correct, target is struck and killed by lightning!
        if (actualRoleId === guessedRoleId) {
          deadPlayerIds.add(target.id);
          publicAnnouncements.push(
            `⚡ Sambaran petir dahsyat menyambar dari langit malam yang gelap dan menghanguskan ${target.name} hingga tewas seketika!`
          );

          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: 'Kutukan Petir Tepat',
            message: `Aksi Sorcerer: Tebakan mantera gaibmu TEPAT SASARAN! ${target.name} terbukti adalah seorang ${actualRoleDef?.indonesianName || actualRoleId}! Kilatan petir kutukanmu menyambarnya hingga tewas seketika!`,
            round,
          });

          seerResults.push({
            seerPlayerId: target.id,
            targetId: actor.id,
            targetName: actor.name,
            actionDescription: 'Tersambar Petir',
            message: 'Kutukan Sorcerer: Peran rahasiamu berhasil ditebak dengan tepat oleh sang Penyihir Kegelapan (Sorcerer)! Petir dahsyat menyambarmu di tengah malam hingga tewas!',
            round,
          });
        } else {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: 'Tebakan Meleset',
            message: `Aksi Sorcerer: Tebakanmu bahwa ${target.name} adalah ${guessedRoleDef?.indonesianName || guessedRoleId} SALAH! Sambaran petirmu padam di kegelapan malam tanpa melukainya.`,
            round,
          });
        }
      }
    }
  }

  // =========================================================================
  // TIER 3: SERIAL KILLER (Prioritas Solo Netral: Mendahului Serigala)
  // =========================================================================
  for (const act of actionList) {
    if (act.roleId === 'serial_killer') {
      const actor = players.get(act.playerId);
      // Serial Killer cannot attack if already dead (burned by Arsonist or struck by Sorcerer lightning) or blocked
      if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id)) continue;
      if (!act.targetPlayerId) continue;

      const target = players.get(act.targetPlayerId);
      if (!target) continue;

      if (protectedPlayers.has(act.targetPlayerId)) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          actionDescription: 'Menyerang Terlindung',
          message: `Aksi Serial Killer: Seranganmu ke ${target.name} digagalkan oleh perlindungan gaib!`,
          round,
        });
      } else if (target.roleId === 'arsonist') {
        // Arsonist has natural basic defense against physical knife attacks
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          actionDescription: `Menyerang ${target.name}`,
          message: `Aksi Serial Killer: Pisau berdarahmu mengenai ${target.name}, namun targetmu memiliki ketahanan alami dan tidak terluka!`,
          round,
        });
        seerResults.push({
          seerPlayerId: target.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Ditikam Kebal',
          message: 'Pertahanan Diri: Seseorang mencoba menikammu semalam, namun ketahanan fisikmu yang luar biasa berhasil menangkis serangan maut mereka!',
          round,
        });
      } else {
        deadPlayerIds.add(target.id);
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          actionDescription: `Menikam ${target.name}`,
          message: `Aksi Serial Killer: Pisau berdarahmu berhasil merenggut nyawa ${target.name}.`,
          round,
        });
      }
    }
  }

  // =========================================================================
  // TIER 4: WEREWOLF COLLECTIVE ATTACK & SPECIAL WEREWOLVES
  // =========================================================================
  const wolfVotes: Record<string, number> = {};
  let wolfAttackerId: string | null = null;
  let hasCursedFatherInfect = false;

  for (const act of actionList) {
    const actor = players.get(act.playerId);
    // Crucial check: actor must NOT be dead (e.g. killed by Arsonist, Sorcerer, or SK earlier tonight!)
    if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id)) continue;

    const roleDef = ALL_ROLES[act.roleId];
    if (roleDef && roleDef.team === 'werewolf' && act.targetPlayerId) {
      const targetP = players.get(act.targetPlayerId);
      const isTargetWolf = targetP && ALL_ROLES[targetP.roleId]?.team === 'werewolf';

      // Check if actor has permission to target fellow wolf:
      // 1. White Werewolf (solo traitor hunter)
      // 2. Cross-team Lover (werewolf paired with non-werewolf partner)
      const isWhiteWerewolf = act.roleId === 'white_werewolf';
      let isCrossTeamLover = false;
      if (actor.partnerId) {
        const partner = players.get(actor.partnerId);
        if (partner && ALL_ROLES[partner.roleId]?.team !== 'werewolf') {
          isCrossTeamLover = true;
        }
      }

      // Standard werewolves cannot attack or vote against fellow wolves!
      if (isTargetWolf && !isWhiteWerewolf && !isCrossTeamLover) {
        if (targetP) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: targetP.id,
            targetName: targetP.name,
            actionDescription: 'Gagal Memangsa Kawan',
            message: `Naluri Serigala: Kamu tidak dapat memangsa sesama kawan serigala (${targetP.name})! Seranganmu dibatalkan.`,
            round,
          });
        }
        continue;
      }

      // If actor is white_werewolf targeting a fellow wolf, it's a private betrayal, not the pack vote!
      if (isWhiteWerewolf && isTargetWolf) {
        // Solo wolf hunt, processed below
      } else {
        wolfVotes[act.targetPlayerId] = (wolfVotes[act.targetPlayerId] || 0) + 1;
        wolfAttackerId = actor.id;
      }

      if (act.roleId === 'cursed_wolf_father' && !actor.cursedFatherUsedInfect) {
        hasCursedFatherInfect = true;
        actor.cursedFatherUsedInfect = true;
      }
    }
  }

  const wolfKillsQuota = options.wolfKillsQuota || 1;
  const sortedWolfTargets = Object.entries(wolfVotes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, wolfKillsQuota);

  // Bogeyman fallback: if pack failed to agree or 0 votes, Bogeyman attacks
  if (sortedWolfTargets.length === 0) {
    const bogeymanAct = actionList.find((a) => a.roleId === 'bogeyman' && a.targetPlayerId);
    if (bogeymanAct && bogeymanAct.targetPlayerId) {
      const bogeymanActor = players.get(bogeymanAct.playerId);
      if (bogeymanActor && bogeymanActor.alive && !deadPlayerIds.has(bogeymanActor.id) && !blockedPlayerIds.has(bogeymanActor.id)) {
        sortedWolfTargets.push([bogeymanAct.targetPlayerId, 1]);
        wolfAttackerId = bogeymanActor.id;
        publicAnnouncements.push(
          'Karena kawanan serigala gagal bersepakat, Bogeyman bangkit dan memilih mangsanya sendiri!'
        );
      }
    }
  }

  for (let i = 0; i < sortedWolfTargets.length; i++) {
    const [targetId] = sortedWolfTargets[i];
    const victim = players.get(targetId);

    // If Cursed Wolf-Father uses infection instead of kill (first victim only)
    if (i === 0 && hasCursedFatherInfect && victim && victim.alive && !protectedPlayers.has(targetId)) {
      victim.roleId = 'werewolf';
      convertedPlayerIds.push(targetId);
      publicAnnouncements.push('Sesuatu yang gelap dan buas telah menginfeksi salah seorang warga desa...');
    } else if (protectedPlayers.has(targetId)) {
      // Shielded!
    } else if (guardedByBodyguard.has(targetId)) {
      // Bodyguard sacrifice
      const bgId = guardedByBodyguard.get(targetId)!;
      deadPlayerIds.add(bgId);
      if (wolfAttackerId) deadPlayerIds.add(wolfAttackerId);
    } else if (victim && victim.roleId === 'elder' && (victim.elderShields ?? 0) > 0) {
      // Elder survives first wolf attack (depletes 1 shield regardless of round number)
      victim.elderShields = (victim.elderShields ?? 1) - 1;
      publicAnnouncements.push('Tetua Desa (Elder) berhasil menahan serangan pertama serigala dengan perisai tuanya!');
    } else if (victim && (victim.roleId === 'serial_killer' || victim.roleId === 'arsonist')) {
      // Neutral Killers have Basic Defense against normal Werewolf attacks!
      publicAnnouncements.push('Serangan serigala semalam terhalau oleh ketahanan fisik musuh yang luar biasa tangguh!');
      seerResults.push({
        seerPlayerId: victim.id,
        targetId: victim.id,
        targetName: victim.name,
        actionDescription: 'Ketahanan Alami',
        message: 'Pertahanan Diri: Kawanan serigala mencoba menerkammu semalam, namun ketahanan fisikmu yang luar biasa berhasil menangkis serangan maut mereka!',
        round,
      });
      if (wolfAttackerId) {
        seerResults.push({
          seerPlayerId: wolfAttackerId,
          targetId: victim.id,
          targetName: victim.name,
          actionDescription: 'Target Kebal',
          message: `Serangan Serigala: Cakaran kawananmu mengenai ${victim.name}, namun targetmu ternyata memiliki ketahanan alami dan tidak terluka!`,
          round,
        });
      }
    } else {
      deadPlayerIds.add(targetId);
    }
  }

  // Special Werewolves: White Werewolf & Big Bad Wolf
  for (const act of actionList) {
    const actor = players.get(act.playerId);
    if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id) || !act.targetPlayerId) continue;

    if (act.roleId === 'white_werewolf' && round % 2 === 0) {
      if (!protectedPlayers.has(act.targetPlayerId)) {
        deadPlayerIds.add(act.targetPlayerId);
        publicAnnouncements.push(
          'Serigala Putih (White Werewolf) mengkhianati kawanannya dan memangsa korbannya dalam keheningan malam!'
        );
      }
    } else if (act.roleId === 'big_bad_wolf') {
      const seating = options.seatingOrder || [];
      const livingSeats = seating.filter((id) => players.get(id)?.alive);
      const bbwIndex = livingSeats.indexOf(actor.id);
      const primaryVictimId = sortedWolfTargets[0]?.[0];
      if (bbwIndex !== -1 && primaryVictimId) {
        const leftNeighbor = livingSeats[(bbwIndex - 1 + livingSeats.length) % livingSeats.length];
        const rightNeighbor = livingSeats[(bbwIndex + 1) % livingSeats.length];
        if (primaryVictimId === leftNeighbor || primaryVictimId === rightNeighbor) {
          const neighborTarget = players.get(act.targetPlayerId);
          const isNeighborWolf = neighborTarget && ALL_ROLES[neighborTarget.roleId]?.team === 'werewolf';
          if (!isNeighborWolf && !protectedPlayers.has(act.targetPlayerId)) {
            deadPlayerIds.add(act.targetPlayerId);
            publicAnnouncements.push('Serigala Buas (Big Bad Wolf) memangsa tetangga korban serigala di dekat sarangnya!');
          }
        }
      }
    }
  }

  // =========================================================================
  // TIER 5: VILLAGE KILLING ROLES (WITCH, VIGILANTE, SLAYER, PRIEST)
  // =========================================================================
  for (const act of actionList) {
    const actor = players.get(act.playerId);
    if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id) || !act.targetPlayerId) continue;

    // Drunk has no real killing power!
    if (actor.roleId === 'drunk') continue;

    // Village curse penalty if Elder was lynched by village
    if (options.villageCursed && ALL_ROLES[actor.roleId]?.team === 'village' && actor.roleId !== 'villager') {
      continue;
    }

    if (act.roleId === 'vigilante') {
      const target = players.get(act.targetPlayerId);
      const targetRole = target ? ALL_ROLES[target.roleId] : null;

      // Vigilante guilt trigger if killing village member
      if (target && targetRole?.team === 'village') {
        actor.vigilanteGuilt = true;
      }

      // If Vigilante shoots Serial Killer or Arsonist, their basic defense blocks the bullet!
      if (target && (target.roleId === 'serial_killer' || target.roleId === 'arsonist')) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          actionDescription: `Menembak ${target.name}`,
          message: `Aksi Vigilante: Pelurumu tepat mengenai ${target.name}, namun targetmu memiliki ketahanan alami yang kebal terhadap tembakan!`,
          round,
        });
        seerResults.push({
          seerPlayerId: target.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Ditembak Kebal',
          message: 'Pertahanan Diri: Seseorang menembakmu semalam, namun peluru tersebut memantul dari tubuhmu tanpa melukaimu!',
          round,
        });
      } else if (!protectedPlayers.has(act.targetPlayerId)) {
        deadPlayerIds.add(act.targetPlayerId);
        if (target) {
          const guiltNotice =
            targetRole?.team === 'village'
              ? ' PERINGATAN: Targetmu adalah sesama warga desa! Kamu akan mati bunuh diri karena rasa bersalah di malam berikutnya.'
              : '';

          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: `Menembak ${target.name}`,
            message: `Aksi Vigilante: Tembakanmu tepat mengenai ${target.name} di kegelapan malam!${guiltNotice}`,
            round,
          });
        }
      } else if (target) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          actionDescription: `Menembak ${target.name}`,
          message: `Aksi Vigilante: Kamu menembak ${target.name}, namun targetmu selamat berkat perlindungan gaib!`,
          round,
        });
      }
    } else if (act.roleId === 'witch' && (act.secondaryTargetId === 'poison' || act.secondaryTargetId === 'kill')) {
      if (actor.witchPotions?.poison !== false) {
        const target = players.get(act.targetPlayerId);
        if (!protectedPlayers.has(act.targetPlayerId)) {
          deadPlayerIds.add(act.targetPlayerId);
          if (target) {
            seerResults.push({
              seerPlayerId: actor.id,
              targetId: target.id,
              targetName: target.name,
              actionDescription: `Meracuni ${target.name}`,
              message: `Aksi Penyihir: Ramuan racun mematikanmu berhasil diminum oleh ${target.name}!`,
              round,
            });
          }
        } else if (target) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: `Meracuni ${target.name}`,
            message: `Aksi Penyihir: Ramuan racunmu kepada ${target.name} gagal bekerja karena perlindungan suci!`,
            round,
          });
        }
        if (actor.witchPotions) actor.witchPotions.poison = false;
      }
    } else if (act.roleId === 'slayer') {
      if (!actor.slayerUsedShot) {
        actor.slayerUsedShot = true;
        const target = players.get(act.targetPlayerId);
        if (target && ALL_ROLES[target.roleId]?.team === 'werewolf') {
          if (!protectedPlayers.has(target.id)) {
            deadPlayerIds.add(target.id);
            publicAnnouncements.push(`Tebakan Slayer tepat! Peluru perak pembantai iblis menembus dada ${target.name} sang serigala!`);
          }
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: 'Tembakan Perak Tepat',
            message: `Aksi Slayer: Tebakanmu tepat sasaran! Peluru perakmu berhasil menembus dada ${target.name} sang serigala!`,
            round,
          });
        } else {
          publicAnnouncements.push('Tebakan Slayer meleset! Peluru pembantai iblis terbuang sia-sia.');
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target?.id || '',
            targetName: target?.name || '',
            actionDescription: 'Tembakan Perak Meleset',
            message: `Aksi Slayer: Tebakanmu meleset karena ${target?.name || 'target'} bukan serigala! Peluru perakmu telah habis terbuang.`,
            round,
          });
        }
      }
    } else if (act.roleId === 'priest') {
      if (!actor.holyWaterUsed) {
        actor.holyWaterUsed = true;
        const target = players.get(act.targetPlayerId);
        if (target && ALL_ROLES[target.roleId]?.team === 'werewolf') {
          deadPlayerIds.add(target.id);
          publicAnnouncements.push(`Percikan air suci Pendeta membakar ${target.name} sang serigala hingga binasa!`);
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: 'Air Suci Membakar',
            message: `Aksi Pendeta: Percikan air sucimu membakar habis ${target.name} sang serigala hingga binasa!`,
            round,
          });
        } else if (target && ALL_ROLES[target.roleId]?.team === 'village') {
          deadPlayerIds.add(actor.id);
          publicAnnouncements.push('Pendeta keliru menuduh sesama warga desa! Air suci berbalik merenggut nyawa sang Pendeta!');
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            actionDescription: 'Air Suci Berbalik',
            message: `Aksi Pendeta: Kamu keliru menyiramkan air suci pada sesama warga desa (${target.name})! Air suci berbalik merenggut nyawamu!`,
            round,
          });
        }
      }
    }
  }

  // =========================================================================
  // TIER 6: NON-LETHAL & CONVERSIONS (ARSONIST DOUSE, CULT LEADER, PIPER, VAMPIRE, WOLF HOUND)
  // =========================================================================
  for (const act of actionList) {
    const actor = players.get(act.playerId);
    if (!actor || !actor.alive || deadPlayerIds.has(actor.id) || blockedPlayerIds.has(actor.id) || !act.targetPlayerId) continue;

    if (act.roleId === 'arsonist' && act.targetPlayerId !== actor.id && act.secondaryTargetId !== 'ignite') {
      // Douse target
      const douseVictim = players.get(act.targetPlayerId);
      if (douseVictim) {
        douseVictim.isDoused = true;
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: douseVictim.id,
          targetName: douseVictim.name,
          actionDescription: `Menyiram Bensin ke ${douseVictim.name}`,
          message: `Aksi Arsonist: Kamu diam-diam menyiramkan bensin ke sekeliling rumah ${douseVictim.name}. Target siap dibakar kapan saja!`,
          round,
        });
      }
    } else if (act.roleId === 'cult_leader') {
      const cultVictim = players.get(act.targetPlayerId);
      if (cultVictim && cultVictim.alive) {
        const isWolf = ALL_ROLES[cultVictim.roleId]?.team === 'werewolf';
        if (isWolf) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: cultVictim.id,
            targetName: cultVictim.name,
            actionDescription: 'Rekrutmen Gagal',
            message: `Aksi Pemimpin Kultus: Ritual rekrutmenmu kepada ${cultVictim.name} gagal total! Jiwa buas dan naluri serigala mereka menolak ajaran kultusmu.`,
            round,
          });
        } else if (protectedPlayers.has(cultVictim.id)) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: cultVictim.id,
            targetName: cultVictim.name,
            actionDescription: 'Rekrutmen Dihalau',
            message: `Aksi Pemimpin Kultus: Pengaruh mistis ajaranmu pada ${cultVictim.name} terhalang oleh perisai pelindung suci!`,
            round,
          });
        } else {
          cultVictim.isCult = true;
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: cultVictim.id,
            targetName: cultVictim.name,
            actionDescription: 'Rekrutmen Sukses',
            message: `Aksi Pemimpin Kultus: Bisikan mantera sucimu berhasil memikat ${cultVictim.name}! Mereka kini resmi menjadi pengikut kultus setiamu.`,
            round,
          });
          seerResults.push({
            seerPlayerId: cultVictim.id,
            targetId: actor.id,
            targetName: actor.name,
            actionDescription: 'Masuk Kultus',
            message: 'Bisikan Malam: Kamu mendengar bisikan gaib yang memikat nuranimu semalam... Kamu kini telah dibaptis menjadi anggota Sekte Kultus (Cult Member)!',
            round,
          });
        }
      }
    } else if (act.roleId === 'piper') {
      const charmed1 = players.get(act.targetPlayerId);
      const charmedNames: string[] = [];
      if (charmed1 && charmed1.alive) {
        charmed1.isCharmed = true;
        charmedNames.push(charmed1.name);
        seerResults.push({
          seerPlayerId: charmed1.id,
          targetId: actor.id,
          targetName: actor.name,
          actionDescription: 'Terpesona Seruling',
          message: 'Irama Gaib: Sayup-sayup terdengar melodi seruling malam yang sangat indah dan memabukkan... Kamu kini telah terpesona (Charmed) oleh sang Peniup Seruling!',
          round,
        });
      }
      if (act.secondaryTargetId) {
        const charmed2 = players.get(act.secondaryTargetId);
        if (charmed2 && charmed2.alive) {
          charmed2.isCharmed = true;
          charmedNames.push(charmed2.name);
          seerResults.push({
            seerPlayerId: charmed2.id,
            targetId: actor.id,
            targetName: actor.name,
            actionDescription: 'Terpesona Seruling',
            message: 'Irama Gaib: Sayup-sayup terdengar melodi seruling malam yang sangat indah dan memabukkan... Kamu kini telah terpesona (Charmed) oleh sang Peniup Seruling!',
            round,
          });
        }
      }
      if (charmedNames.length > 0) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: act.targetPlayerId,
          targetName: charmedNames.join(', '),
          actionDescription: 'Mempesona Target',
          message: `Aksi Piper: Melodi seruling manjamu sukses mempesona ${charmedNames.join(' dan ')} semalam!`,
          round,
        });
      }
    } else if (act.roleId === 'vampire') {
      const vampVictim = players.get(act.targetPlayerId);
      if (vampVictim && vampVictim.alive && !protectedPlayers.has(vampVictim.id) && ALL_ROLES[vampVictim.roleId]?.team !== 'werewolf') {
        vampVictim.roleId = 'vampire';
        convertedPlayerIds.push(vampVictim.id);
        publicAnnouncements.push('Bekas gigitan dingin di leher... Salah satu warga telah diubah menjadi bangsa Vampir!');
      }
    } else if (act.roleId === 'wolf_hound') {
      if (round === 1) {
        const wantsWolf = act.targetPlayerId === 'werewolf' || act.secondaryTargetId === 'werewolf';
        actor.roleId = wantsWolf ? 'werewolf' : 'villager';
        convertedPlayerIds.push(actor.id);
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: actor.id,
          targetName: actor.name,
          message: wantsWolf
            ? 'Kesetiaan Anjing Serigala (Wolf Hound): Anda telah memilih berpihak pada KAWANAN SERIGALA! Anda kini berburu bersama serigala.'
            : 'Kesetiaan Anjing Serigala (Wolf Hound): Anda telah memilih setia pada WARGA DESA! Anda kini membela kedamaian desa sebagai warga biasa.',
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 4. STAGE 2 — INVESTIGATIVE ACTIONS
  // -------------------------------------------------------------
  for (const act of actionList) {
    const actor = players.get(act.playerId);
    if (!actor || !actor.alive || blockedPlayerIds.has(actor.id) || !act.targetPlayerId) continue;

    const target = players.get(act.targetPlayerId);
    if (!target) continue;

    const targetRole = ALL_ROLES[target.roleId];

    // Special Drunk Handing: Drunk actor receives randomized misinformation!
    if (actor.roleId === 'drunk') {
      const fakeWolf = Math.random() > 0.5;
      const fakeTeams = ['village', 'werewolf', 'neutral'];
      const randomTeam = fakeTeams[Math.floor(Math.random() * fakeTeams.length)];
      const randomRoleKeys = Object.keys(ALL_ROLES);
      const randomRole = ALL_ROLES[randomRoleKeys[Math.floor(Math.random() * randomRoleKeys.length)]];

      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        isWolf: fakeWolf,
        actionDescription: `Menerawang ${target.name}`,
        round,
        message: `Hasil terawangan (Mata Sayu): Penglihatan Anda yang berkabut melihat bahwa ${target.name} ${
          act.roleId === 'seer'
            ? `berpihak pada ${fakeWolf ? 'KAWANAN SERIGALA (Werewolf)' : 'WARGA DESA (Village)'}`
            : act.roleId === 'detective'
            ? `berstatus ${fakeWolf ? 'MENCURIGAKAN (Suspicious)' : 'BERSIH (Innocent)'}`
            : act.roleId === 'aura_seer'
            ? `memancarkan aura faksi ${randomTeam.toUpperCase()}`
            : `memiliki peran rahasia ${randomRole?.indonesianName || 'Warga'}`
        }.`,
      });
      continue;
    }

    if (act.roleId === 'seer') {
      let isWolf = false;
      if (target.roleId === 'alpha_wolf' || target.roleId === 'hoodlum') isWolf = false;
      else if (target.roleId === 'lycan' || target.roleId === 'recluse') isWolf = true;
      else if (targetRole) isWolf = targetRole.team === 'werewolf';

      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        isWolf,
        actionDescription: `Menerawang faksi ${target.name}`,
        round,
        message: `Hasil terawangan: ${target.name} berpihak pada ${
          isWolf ? 'KAWANAN SERIGALA (Werewolf)' : 'WARGA DESA (Village)'
        }.`,
      });
    } else if (act.roleId === 'detective') {
      const isSuspicious = target.roleId === 'recluse' || targetRole?.team === 'werewolf' || targetRole?.team === 'neutral';
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        isWolf: isSuspicious,
        actionDescription: `Investigasi kecurigaan ${target.name}`,
        round,
        message: `Hasil investigasi Detektif: ${target.name} berstatus ${
          isSuspicious ? 'MENCURIGAKAN (Suspicious)' : 'BERSIH (Innocent)'
        }.`,
      });
    } else if (act.roleId === 'aura_seer') {
      const auraTeam = target.roleId === 'recluse' ? 'werewolf' : (targetRole?.team || 'village');
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        team: auraTeam,
        actionDescription: `Melihat aura faksi ${target.name}`,
        round,
        message: `Aura Seer: ${target.name} memancarkan aura faksi ${auraTeam.toUpperCase()}.`,
      });
    } else if (act.roleId === 'psychic' || act.roleId === 'mystic_wolf') {
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        actionDescription: `Melihat peran batin ${target.name}`,
        round,
        message: `Penglihatan Batin: Peran persis ${target.name} adalah ${
          targetRole?.indonesianName || 'Warga'
        } (${targetRole?.name || 'Villager'}).`,
      });
    } else if (act.roleId === 'tracker') {
      // Find what target visited
      const targetAction = actionList.find((a) => a.playerId === target.id && a.targetPlayerId);
      const visitedPerson = targetAction?.targetPlayerId ? players.get(targetAction.targetPlayerId) : null;
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        message: visitedPerson
          ? `Pelacak: ${target.name} diam-diam mengunjungi rumah ${visitedPerson.name} semalam.`
          : `Pelacak: ${target.name} tetap berada di rumahnya semalam.`,
      });
    } else if (act.roleId === 'lookout') {
      // Find who visited target
      const visitors = actionList
        .filter((a) => a.targetPlayerId === target.id && a.playerId !== target.id)
        .map((a) => players.get(a.playerId)?.name)
        .filter(Boolean);

      seerResults.push({
        seerPlayerId: actor.id,
        targetId: target.id,
        targetName: target.name,
        message: visitors.length > 0
          ? `Pengintai: Rumah ${target.name} semalam dikunjungi oleh: ${visitors.join(', ')}.`
          : `Pengintai: Tidak ada seorang pun yang mengunjungi rumah ${target.name} semalam.`,
      });
    } else if (act.roleId === 'fox') {
      if (actor.foxLostPower) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          message: 'Penciuman Rubah: Kekuatan Anda telah padam selamanya karena investigasi masa lalu yang nihil serigala.',
        });
      } else {
        const seating = options.seatingOrder || Array.from(players.keys());
        const livingSeats = seating.filter((id) => players.get(id)?.alive);
        const idx = livingSeats.indexOf(target.id);
        const trioIds: string[] = [target.id];
        if (idx !== -1 && livingSeats.length > 2) {
          trioIds.push(livingSeats[(idx - 1 + livingSeats.length) % livingSeats.length]);
          trioIds.push(livingSeats[(idx + 1) % livingSeats.length]);
        }
        const hasWolf = trioIds.some((id) => {
          const p = players.get(id);
          return p && ALL_ROLES[p.roleId]?.team === 'werewolf';
        });

        if (hasWolf) {
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            isWolf: true,
            message: `Penciuman Rubah: Aroma serigala tercium di antara ${target.name} dan tetangganya! Kemampuan Rubah Anda tetap aktif.`,
          });
        } else {
          actor.foxLostPower = true;
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: target.id,
            targetName: target.name,
            isWolf: false,
            message: `Penciuman Rubah: Tidak ada aroma serigala sama sekali di sekitar ${target.name}. Anda kehilangan kekuatan Rubah selamanya!`,
          });
        }
      }
    } else if (act.roleId === 'paranormal_investigator') {
      if (actor.paranormalLostPower) {
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          message: 'Penyelidikan Paranormal: Kekuatan indra supranatural Anda telah hilang selamanya.',
        });
      } else if (target.roleId === 'villager') {
        actor.paranormalLostPower = true;
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          isWolf: false,
          message: `Penyelidikan Paranormal: ${target.name} hanyalah warga desa polos. Akibatnya, indra supranatural Anda padam selamanya!`,
        });
      } else {
        const isEvil = ALL_ROLES[target.roleId]?.team !== 'village';
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: target.id,
          targetName: target.name,
          isWolf: isEvil,
          message: `Penyelidikan Paranormal: ${target.name} memiliki aura ${isEvil ? 'MENCURIGAKAN (Bukan Warga Biasa)' : 'KUKUH'}. Kekuatan Anda tetap aktif!`,
        });
      }
    } else if (act.roleId === 'thief') {
      if (round === 1) {
        const targetP = players.get(act.targetPlayerId);
        if (targetP) {
          const originalTargetRole = targetP.roleId;
          targetP.roleId = actor.roleId;
          actor.roleId = originalTargetRole;
          convertedPlayerIds.push(actor.id, targetP.id);
          const newDef = ALL_ROLES[originalTargetRole];
          seerResults.push({
            seerPlayerId: actor.id,
            targetId: targetP.id,
            targetName: targetP.name,
            message: `Pencuri: Anda berhasil mencuri identitas peran ${targetP.name} dan kini menjadi ${newDef?.indonesianName || 'Warga'}!`,
          });
        }
      }
    } else if (act.roleId === 'amnesiac') {
      const deadPlayer = players.get(act.targetPlayerId);
      if (deadPlayer && !deadPlayer.alive) {
        actor.roleId = deadPlayer.roleId;
        convertedPlayerIds.push(actor.id);
        const newRoleDef = ALL_ROLES[deadPlayer.roleId];
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: deadPlayer.id,
          targetName: deadPlayer.name,
          message: `Ingatan Anda telah pulih seutuhnya! Anda mengingat bahwa peran sejati Anda adalah ${newRoleDef?.indonesianName || 'Warga Desa'} (${newRoleDef?.name}).`,
        });
      }
    } else if (act.roleId === 'doppelganger') {
      actor.doppelgangerTargetId = act.targetPlayerId;
      const targetP = players.get(act.targetPlayerId);
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: act.targetPlayerId,
        targetName: targetP?.name || '',
        message: `Doppelganger: Anda telah meniru wujud ${targetP?.name}. Anda akan mengambil alih perannya begitu ia gugur!`,
      });
    } else if (act.roleId === 'wild_child') {
      if (round === 1 && act.targetPlayerId) {
        actor.roleModelId = act.targetPlayerId;
        const model = players.get(act.targetPlayerId);
        seerResults.push({
          seerPlayerId: actor.id,
          targetId: act.targetPlayerId,
          targetName: model?.name || '',
          message: `Anak Liar: Anda telah memilih ${model?.name || 'seseorang'} sebagai panutan hidup Anda. Lindungi dia, karena jika dia gugur, Anda akan menjelma menjadi Serigala!`,
        });
      }
    } else if (act.roleId === 'gypsy') {
      const contact = players.get(act.targetPlayerId);
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: act.targetPlayerId,
        targetName: contact?.name || '',
        message: `Kontak Batin Gipsi: Anda berhasil membuka saluran gaib dengan ${contact?.name || 'target'}.`,
      });
    } else if (act.roleId === 'actor') {
      const targetP = players.get(act.targetPlayerId);
      seerResults.push({
        seerPlayerId: actor.id,
        targetId: act.targetPlayerId,
        targetName: targetP?.name || '',
        message: `Aktor: Anda mempelajari gaya dan gerak-gerik ${targetP?.name || 'target'} untuk meniru peran di malam berikutnya.`,
      });
    }
  }

  // Ghost automatically dies on Night 1 to unlock their spiritual clue ability
  if (round === 1) {
    for (const [pId, p] of players.entries()) {
      if (p.alive && p.roleId === 'ghost') {
        deadPlayerIds.add(pId);
        publicAnnouncements.push(
          `Arwah Hantu (Ghost — ${p.name}) telah terlepas dari raganya pada malam pertama! Hantu kini mengamati dari alam baka.`
        );
      }
    }
  }

  // Beholder: learns who the true Seer is on Night 1
  if (round === 1) {
    for (const [pId, p] of players.entries()) {
      if (p.alive && p.roleId === 'beholder') {
        const trueSeer = Array.from(players.values()).find((other) => other.alive && other.roleId === 'seer');
        seerResults.push({
          seerPlayerId: pId,
          targetId: trueSeer?.id || pId,
          targetName: trueSeer?.name || 'Tidak Ada',
          actionDescription: 'Penglihatan Beholder',
          message: trueSeer
            ? `Penglihatan Beholder: Peramal (Seer) sejati di desa adalah ${trueSeer.name}. Lindungi dan dengarkan petunjuknya!`
            : 'Penglihatan Beholder: Tidak ada Peramal sejati di desa malam ini.',
          round,
        });
      }
    }
  }

  // Little Girl: peeks at shadows of werewolves
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.roleId === 'little_girl') {
      const livingWolves = Array.from(players.values()).filter((other) => other.alive && ALL_ROLES[other.roleId]?.team === 'werewolf');
      if (livingWolves.length > 0) {
        const peekedWolf = livingWolves[Math.floor(Math.random() * livingWolves.length)];
        seerResults.push({
          seerPlayerId: p.id,
          targetId: peekedWolf.id,
          targetName: peekedWolf.name,
          actionDescription: 'Mengintip Serigala',
          message: `Intipan Gadis Kecil: Dari balik jendela kamarmu di keheningan malam, kamu melihat siluet mencurigakan mengarah ke rumah ${peekedWolf.name}...`,
          round,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 5. STAGE 3 — REACTIVE TRIGGERS (Lovers, Hunter, Knight, etc.)
  // -------------------------------------------------------------
  let newlyDead: string[] = Array.from(deadPlayerIds);

  while (newlyDead.length > 0) {
    const currentId = newlyDead.pop()!;
    const victim = players.get(currentId);
    if (!victim) continue;

    // Lovers chain death
    if (victim.partnerId && !deadPlayerIds.has(victim.partnerId)) {
      deadPlayerIds.add(victim.partnerId);
      newlyDead.push(victim.partnerId);
      const partner = players.get(victim.partnerId);
      if (partner) {
        publicAnnouncements.push(
          `${partner.name} tidak sanggup hidup tanpa pasangannya dan meninggal karena patah hati!`
        );
      }
    }

    // Knight with Rusty Sword: if killed, kills a werewolf attacker
    if (victim.roleId === 'knight_rusty_sword' && wolfAttackerId && !deadPlayerIds.has(wolfAttackerId)) {
      deadPlayerIds.add(wolfAttackerId);
      newlyDead.push(wolfAttackerId);
      const poisonedWolf = players.get(wolfAttackerId);
      if (poisonedWolf) {
        publicAnnouncements.push(
          `Pedang berkarat sang Ksatria meracuni serigala penyerangnya! ${poisonedWolf.name} ikut tewas karena infeksi karat!`
        );
        seerResults.push({
          seerPlayerId: wolfAttackerId,
          targetId: victim.id,
          targetName: victim.name,
          actionDescription: 'Keracunan Pedang Karat',
          message: `Pedang Berkarat: Kamu terkena infeksi racun karat mematikan saat menyerang Ksatria (${victim.name}) semalam dan tewas mengenaskan!`,
          round,
        });
      }
    }

    // Hunter revenge shot
    if (victim.roleId === 'hunter') {
      const hunterAction = actionList.find((a) => a.playerId === victim.id && a.targetPlayerId);
      const targetId = hunterAction?.targetPlayerId || victim.hunterTargetId;
      if (targetId && !deadPlayerIds.has(targetId)) {
        const hunterVictim = players.get(targetId);
        if (hunterVictim && hunterVictim.alive) {
          deadPlayerIds.add(targetId);
          newlyDead.push(targetId);
          publicAnnouncements.push(
            `Senapan terakhir Pemburu (${victim.name}) meletus sebelum ia gugur, menembak mati ${hunterVictim.name}!`
          );
          seerResults.push({
            seerPlayerId: victim.id,
            targetId: hunterVictim.id,
            targetName: hunterVictim.name,
            actionDescription: 'Tembakan Terakhir',
            message: `Tembakan Terakhir: Sebelum menghembuskan napas terakhir, senapanmu berhasil menembak mati ${hunterVictim.name}!`,
            round,
          });
          seerResults.push({
            seerPlayerId: hunterVictim.id,
            targetId: victim.id,
            targetName: victim.name,
            actionDescription: 'Ditembak Pemburu Gugur',
            message: `Tembakan Balas Dendam: Kamu tertembak peluru senapan terakhir sang Pemburu (${victim.name}) saat ia gugur!`,
            round,
          });
        }
      }
    }
  }

  // Apprentice Seer: inherits Seer abilities if true Seer died
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.roleId === 'apprentice_seer') {
      const isSeerDead = Array.from(players.values()).some((other) => other.roleId === 'seer' && (!other.alive || deadPlayerIds.has(other.id)));
      if (isSeerDead) {
        p.roleId = 'seer';
        convertedPlayerIds.push(p.id);
        publicAnnouncements.push('Murid Peramal (Apprentice Seer) telah mewarisi bola kristal dan kini menjadi Peramal sejati desa!');
        seerResults.push({
          seerPlayerId: p.id,
          targetId: p.id,
          targetName: p.name,
          actionDescription: 'Mewarisi Peramal',
          message: 'Warisan Bola Kristal: Sang Peramal telah gugur! Mulai fajar ini, Anda resmi mewarisi kekuatan batin sebagai Peramal (Seer) sejati desa!',
          round,
        });
      }
    }
  }

  // Executioner: becomes Jester if assigned target died at night
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.roleId === 'executioner' && p.executionerTargetId) {
      if (deadPlayerIds.has(p.executionerTargetId)) {
        p.roleId = 'jester';
        convertedPlayerIds.push(p.id);
        const targetVictim = players.get(p.executionerTargetId);
        publicAnnouncements.push('Seorang Algojo telah kehilangan target gantungnya semalam dan kehilangan akal sehatnya!');
        seerResults.push({
          seerPlayerId: p.id,
          targetId: p.executionerTargetId,
          targetName: targetVictim?.name || 'Target',
          actionDescription: 'Target Gugur Menjadi Jester',
          message: `Transformasi Algojo: Target hukuman gantungmu (${targetVictim?.name || 'Target'}) telah tewas semalam! Karena ambisimu musnah, kamu kini berubah menjadi Badut (Jester)! Buat warga desa mengeksekusimu di tiang gantungan untuk memenangkan permainan!`,
          round,
        });
      }
    }
  }

  // Wild Child: transforms into Werewolf if role model died tonight
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.roleId === 'wild_child' && p.roleModelId) {
      if (deadPlayerIds.has(p.roleModelId)) {
        p.roleId = 'werewolf';
        convertedPlayerIds.push(p.id);
        const model = players.get(p.roleModelId);
        publicAnnouncements.push('Panutan hidup Anak Liar (Wild Child) telah gugur! Kemarahan liar merasuki jiwanya hingga berubah menjadi Serigala!');
        seerResults.push({
          seerPlayerId: p.id,
          targetId: p.roleModelId,
          targetName: model?.name || 'Panutan',
          actionDescription: 'Menjadi Serigala',
          message: `Transformasi Jiwa Liar: Panutan hidupmu (${model?.name || 'Panutan'}) telah gugur semalam! Kemarahan membakar darahmu dan kamu kini resmi menjelma menjadi SERIGALA (Werewolf)! Mulai malam berikutnya, kamu berburu bersama kawanan.`,
          round,
        });
      }
    }
  }

  // Doppelganger: inherits role if their copied target died tonight
  for (const [pId, p] of players.entries()) {
    if (p.alive && p.roleId === 'doppelganger' && p.doppelgangerTargetId) {
      if (deadPlayerIds.has(p.doppelgangerTargetId)) {
        const copiedTarget = players.get(p.doppelgangerTargetId);
        if (copiedTarget) {
          p.roleId = copiedTarget.roleId;
          convertedPlayerIds.push(p.id);
          const newRoleDef = ALL_ROLES[copiedTarget.roleId] || ALL_ROLES.villager;
          publicAnnouncements.push('Sosok yang ditiru Doppelganger telah gugur semalam! Doppelganger mengambil alih wujud dan perannya!');
          seerResults.push({
            seerPlayerId: p.id,
            targetId: copiedTarget.id,
            targetName: copiedTarget.name,
            actionDescription: 'Mewarisi Peran',
            message: `Pewarisan Wujud Doppelganger: Target yang kamu tiru (${copiedTarget.name}) telah gugur semalam! Kamu kini mengambil alih perannya sebagai ${newRoleDef.indonesianName} (${newRoleDef.name})!`,
            round,
          });
        }
      }
    }
  }

  // Generate public morning announcements
  if (deadPlayerIds.size === 0) {
    publicAnnouncements.push('Malam berlalu dengan tenang. Tidak ada korban jiwa semalam.');
  } else {
    for (const deadId of deadPlayerIds) {
      const p = players.get(deadId);
      if (p) {
        publicAnnouncements.push(`${p.name} ditemukan tewas mengenaskan pagi ini.`);
      }
    }
  }

  // Ensure all private results have round set
  for (const sr of seerResults) {
    if (sr.round === undefined) {
      sr.round = round;
    }
  }

  return {
    deadPlayerIds: Array.from(deadPlayerIds),
    publicAnnouncements,
    seerResults,
    convertedPlayerIds,
  };
}
