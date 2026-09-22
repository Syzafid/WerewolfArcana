import { ALL_ROLES, type Player } from '@werewolf/shared';

export interface WinCheckResult {
  hasWinner: boolean;
  winner: string | string[] | null;
  winnerTitle: string;
  reason: string;
}

export function checkWinCondition(
  players: Player[],
  context: {
    lastExecutedPlayerId?: string | null;
    round?: number;
    phase?: string;
  } = { round: 1 }
): WinCheckResult {
  const alivePlayers = players.filter((p) => p.alive);
  const totalAlive = alivePlayers.length;

  // 1. Check Angel Win (if dies on Night 1 or Day 1)
  if (context.round === 1) {
    const deadAngel = players.find((p) => !p.alive && p.roleId === 'angel');
    if (deadAngel) {
      return {
        hasWinner: true,
        winner: 'angel',
        winnerTitle: 'Malaikat (Angel)',
        reason: `${deadAngel.name} (Angel) gugur pada hari pertama sesuai ramalan dan memenangkan permainan seketika!`,
      };
    }
  }

  // 2. Check Tanner / Jester / Executioner win right after execution
  if (context.lastExecutedPlayerId) {
    const executed = players.find((p) => p.id === context.lastExecutedPlayerId);
    if (executed && executed.roleId === 'tanner') {
      return {
        hasWinner: true,
        winner: 'tanner',
        winnerTitle: 'Tanner (Penyamak Kulit)',
        reason: `${executed.name} berhasil membuat dirinya dieksekusi oleh desa dan memenangkan permainan seorang diri!`,
      };
    }
    if (executed && executed.roleId === 'jester') {
      return {
        hasWinner: true,
        winner: 'jester',
        winnerTitle: 'Jester (Badut)',
        reason: `${executed.name} berhasil dieksekusi di tiang gantungan dan memenangkan permainan!`,
      };
    }

    // Executioner win
    if (executed) {
      const executioner = players.find(
        (p) => p.alive && p.roleId === 'executioner' && p.executionerTargetId === executed.id
      );
      if (executioner) {
        return {
          hasWinner: true,
          winner: 'executioner',
          winnerTitle: 'Algojo (Executioner)',
          reason: `${executioner.name} berhasil menghukum mati target rahasianya (${executed.name}) di tiang gantungan dan memenangkan permainan!`,
        };
      }
    }
  }

  // 3. Check Cult Leader win (if all alive players are cult members)
  const cultLeader = alivePlayers.find((p) => p.roleId === 'cult_leader');
  if (cultLeader && alivePlayers.every((p) => p.isCult || p.roleId === 'cult_leader')) {
    return {
      hasWinner: true,
      winner: 'cult_leader',
      winnerTitle: 'Pemimpin Kultus (Cult Leader)',
      reason: `Seluruh penyintas desa telah berhasil dibaptis ke dalam sekte ${cultLeader.name}! Kultus menguasai desa!`,
    };
  }

  // 4. Check Piper win (if all other alive players are charmed)
  const piper = alivePlayers.find((p) => p.roleId === 'piper');
  if (piper && alivePlayers.filter((p) => p.id !== piper.id).every((p) => p.isCharmed || p.charmedByPiper)) {
    return {
      hasWinner: true,
      winner: 'piper',
      winnerTitle: 'Peniup Seruling (Pied Piper)',
      reason: `Seluruh warga desa yang masih hidup telah terpesona dalam mantra musik sang Piper (${piper.name})!`,
    };
  }

  // 5. Check Vampire win (if vampires reach parity/majority)
  const aliveVampires = alivePlayers.filter((p) => p.roleId === 'vampire').length;
  if (aliveVampires > 0 && aliveVampires >= totalAlive - aliveVampires) {
    return {
      hasWinner: true,
      winner: 'vampire',
      winnerTitle: 'Bangsa Vampir (Vampires)',
      reason: `Bangsa Vampir (${aliveVampires}) telah mendominasi sisa populasi desa! Malam abadi dimulai.`,
    };
  }

  // 6. Check Lovers win (if only 2 players left and they are partners)
  if (totalAlive === 2) {
    const [p1, p2] = alivePlayers;
    if (p1.partnerId === p2.id && p2.partnerId === p1.id) {
      const p1Team = ALL_ROLES[p1.roleId]?.team || 'village';
      const p2Team = ALL_ROLES[p2.roleId]?.team || 'village';
      const isSameTeam = p1Team === p2Team && p1Team !== 'neutral';
      const winner = isSameTeam ? [p1Team, 'lovers'] : 'lovers';
      const winnerTitle = isSameTeam
        ? `${p1Team === 'village' ? 'Warga Desa (Village)' : 'Kawanan Serigala (Werewolf Pack)'} & Pasangan Sehidup Semati (Lovers)`
        : 'Pasangan Sehidup Semati (Lovers)';

      return {
        hasWinner: true,
        winner,
        winnerTitle,
        reason: `${p1.name} dan ${p2.name} adalah satu-satunya penyintas terakhir yang bertahan hidup bersama!`,
      };
    }
  }

  // 7. Check Serial Killer or White Werewolf solo win
  if (totalAlive === 1) {
    const soleSurvivor = alivePlayers[0];
    if (soleSurvivor.roleId === 'serial_killer') {
      return {
        hasWinner: true,
        winner: 'serial_killer',
        winnerTitle: 'Serial Killer (Pembunuh Berantai)',
        reason: `${soleSurvivor.name} membunuh semua orang dan menjadi satu-satunya yang bertahan hidup!`,
      };
    }
    if (soleSurvivor.roleId === 'white_werewolf') {
      return {
        hasWinner: true,
        winner: 'white_werewolf',
        winnerTitle: 'White Werewolf (Serigala Putih)',
        reason: `${soleSurvivor.name} membasmi desa sekaligus sesama serigala dan menguasai malam seorang diri!`,
      };
    }
    if (soleSurvivor.roleId === 'lone_wolf') {
      return {
        hasWinner: true,
        winner: 'lone_wolf',
        winnerTitle: 'Serigala Penyendiri (Lone Wolf)',
        reason: `${soleSurvivor.name} mengkhianati kawanan serigala dan desa, memenangkan malam seorang diri!`,
      };
    }
    if (soleSurvivor.roleId === 'arsonist') {
      return {
        hasWinner: true,
        winner: 'arsonist',
        winnerTitle: 'Pembakar (Arsonist)',
        reason: `${soleSurvivor.name} membakar seluruh desa menjadi abu dan menjadi satu-satunya yang bertahan hidup!`,
      };
    }
    if (soleSurvivor.roleId === 'sorcerer') {
      return {
        hasWinner: true,
        winner: 'sorcerer',
        winnerTitle: 'Penyihir Kegelapan (Sorcerer)',
        reason: `${soleSurvivor.name} membumihanguskan seluruh lawan dengan sambaran petir kutukan dan menjadi satu-satunya yang bertahan hidup!`,
      };
    }
  }

  // 8. Count alive teams
  let aliveWolves = 0;
  let aliveVillagers = 0;
  let aliveNeutrals = 0;

  for (const p of alivePlayers) {
    const roleDef = ALL_ROLES[p.roleId];
    if (!roleDef) continue;

    if (roleDef.team === 'werewolf') {
      aliveWolves++;
    } else if (roleDef.team === 'neutral') {
      aliveNeutrals++;
    } else {
      aliveVillagers++;
    }
  }

  const aliveNonWolves = totalAlive - aliveWolves;
  const aliveSurvivor = alivePlayers.find((p) => p.roleId === 'survivor');
  const survivorNote = aliveSurvivor ? ` (Bersama ${aliveSurvivor.name} Sang Penyintas yang berhasil bertahan hidup!)` : '';

  const survivingLovers = alivePlayers.filter(
    (p) => p.partnerId && alivePlayers.some((p2) => p2.id === p.partnerId)
  );
  const hasSurvivingLoversPair = survivingLovers.length >= 2;

  // Werewolf Win: wolves >= non-wolves (paritas atau mayoritas)
  if (aliveWolves > 0 && aliveWolves >= aliveNonWolves) {
    const winnerTeams = hasSurvivingLoversPair ? ['werewolf', 'lovers'] : 'werewolf';
    const winnerTitle = hasSurvivingLoversPair
      ? 'Kawanan Serigala (Werewolf Pack) & Pasangan Sehidup Semati (Lovers)'
      : 'Kawanan Serigala (Werewolf Pack)';

    return {
      hasWinner: true,
      winner: winnerTeams,
      winnerTitle,
      reason: `Jumlah Serigala (${aliveWolves}) telah mencapai paritas atau melampaui sisa warga (${aliveNonWolves}). Desa telah jatuh ke dalam cengkeraman malam!${survivorNote}`,
    };
  }

  // Village Win: all werewolves AND hostile independent threats eliminated
  const hasHostileThreats = alivePlayers.some((p) =>
    ['serial_killer', 'arsonist', 'cult_leader', 'piper', 'vampire', 'white_werewolf', 'lone_wolf'].includes(p.roleId)
  );

  if (aliveWolves === 0 && !hasHostileThreats) {
    const winnerTeams = hasSurvivingLoversPair ? ['village', 'lovers'] : 'village';
    const winnerTitle = hasSurvivingLoversPair
      ? 'Warga Desa (Village) & Pasangan Sehidup Semati (Lovers)'
      : 'Warga Desa (Village)';

    return {
      hasWinner: true,
      winner: winnerTeams,
      winnerTitle,
      reason: `Seluruh serigala jahat dan ancaman malam telah berhasil dieliminasi! Kedamaian kembali menyelimuti desa.${survivorNote}`,
    };
  }

  // Safety valve: 15 rounds without resolution
  if ((context.round ?? 1) >= 15) {
    return {
      hasWinner: true,
      winner: 'stalemate',
      winnerTitle: 'Permainan Berakhir Seri (Stalemate)',
      reason: 'Permainan telah berlangsung selama 15 ronde tanpa ada pemenang mutlak. Moderator mengakhiri sesi.',
    };
  }

  return {
    hasWinner: false,
    winner: null,
    winnerTitle: '',
    reason: '',
  };
}
