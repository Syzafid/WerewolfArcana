import { ALL_ROLES, type BalanceEvaluation, type BalanceVerdict } from '@werewolf/shared';

interface TierAllowance {
  wolves: number;
  investigative: [number, number]; // [min, max]
  protective: [number, number];
  village_killer: [number, number];
  association: [number, number];
  outsider: [number, number];
  vote_empowerment: [number, number];
  reactive: [number, number];
  neutral_independent: [number, number];
  werewolf_deceptive: [number, number];
}

export function getTierAllowance(playerCount: number): TierAllowance {
  if (playerCount <= 6) {
    return {
      wolves: 1,
      investigative: [1, 1],
      protective: [0, 0],
      village_killer: [0, 0],
      association: [0, 0],
      outsider: [0, 0],
      vote_empowerment: [0, 0],
      reactive: [0, 0],
      neutral_independent: [0, 0],
      werewolf_deceptive: [0, 0],
    };
  }
  if (playerCount <= 9) {
    return {
      wolves: 2,
      investigative: [1, 1],
      protective: [0, 1],
      village_killer: [0, 0],
      association: [0, 1],
      outsider: [0, 0],
      vote_empowerment: [0, 0],
      reactive: [0, 0],
      neutral_independent: [0, 0],
      werewolf_deceptive: [0, 0],
    };
  }
  if (playerCount <= 13) {
    return {
      wolves: 3,
      investigative: [1, 2],
      protective: [1, 1],
      village_killer: [0, 1],
      association: [0, 1],
      outsider: [0, 1],
      vote_empowerment: [0, 1],
      reactive: [0, 1],
      neutral_independent: [0, 1],
      werewolf_deceptive: [0, 1],
    };
  }
  if (playerCount <= 18) {
    return {
      wolves: 4,
      investigative: [1, 2],
      protective: [1, 2],
      village_killer: [0, 1],
      association: [1, 2],
      outsider: [1, 2],
      vote_empowerment: [0, 1],
      reactive: [0, 1],
      neutral_independent: [0, 2],
      werewolf_deceptive: [0, 1],
    };
  }
  return {
    wolves: 5,
    investigative: [2, 3],
    protective: [1, 2],
    village_killer: [1, 2],
    association: [1, 2],
    outsider: [2, 3],
    vote_empowerment: [0, 1],
    reactive: [1, 2],
    neutral_independent: [1, 2],
    werewolf_deceptive: [0, 1],
  };
}

export function calculateBalanceScore(roleIds: string[], playerCount: number): BalanceEvaluation {
  let score = 100;
  const reasons: string[] = [];

  const tier = getTierAllowance(playerCount);

  // Group by category and team
  const categoryCounts: Record<string, number> = {};
  let totalWolves = 0;
  let totalNeutral = 0;

  for (const roleId of roleIds) {
    const def = ALL_ROLES[roleId];
    if (!def) continue;

    categoryCounts[def.balanceCategory] = (categoryCounts[def.balanceCategory] || 0) + 1;
    if (def.team === 'werewolf') {
      totalWolves++;
    }
    if (def.team === 'neutral') {
      totalNeutral++;
    }

    // Check minimum players per role
    if (playerCount < def.minPlayers) {
      score -= 10;
      reasons.push(`Role ${def.indonesianName} memerlukan minimal ${def.minPlayers} pemain (saat ini ${playerCount}).`);
    }

    // Check conflicts
    for (const conflictId of def.conflictsWith) {
      if (roleIds.includes(conflictId)) {
        score -= 15;
        const conflictRole = ALL_ROLES[conflictId];
        reasons.push(`Konflik: ${def.indonesianName} tidak disarankan bersama ${conflictRole?.indonesianName || conflictId} di game ukuran ini.`);
      }
    }
  }

  // 1. Werewolf ratio check
  const wolfDiff = Math.abs(totalWolves - tier.wolves);
  if (wolfDiff > 0) {
    const penalty = wolfDiff * 15;
    score -= penalty;
    reasons.push(
      totalWolves < tier.wolves
        ? `Jumlah Serigala (${totalWolves}) terlalu sedikit untuk ${playerCount} pemain (rekomendasi: ${tier.wolves}).`
        : `Jumlah Serigala (${totalWolves}) terlalu banyak untuk ${playerCount} pemain (rekomendasi: ${tier.wolves}).`
    );
  }

  // 2. Investigative check
  const invCount = categoryCounts['investigative'] || 0;
  if (invCount < tier.investigative[0]) {
    score -= 15;
    reasons.push(`Disarankan ada minimal ${tier.investigative[0]} role investigatif (misal Peramal/Seer).`);
  } else if (invCount > tier.investigative[1]) {
    const excess = invCount - tier.investigative[1];
    score -= excess * 10;
    reasons.push(`Kelebihan role investigatif (${invCount} aktif, rekomendasi maks ${tier.investigative[1]}).`);
  }

  // 3. Protective check
  const protCount = categoryCounts['protective'] || 0;
  if (protCount > tier.protective[1]) {
    const excess = protCount - tier.protective[1];
    score -= excess * 10;
    reasons.push(`Role protektif berlebih (${protCount} aktif, rekomendasi maks ${tier.protective[1]}).`);
  }

  // 4. Neutral check
  if (totalNeutral > tier.neutral_independent[1]) {
    const excess = totalNeutral - tier.neutral_independent[1];
    score -= excess * 20;
    reasons.push(`Terlalu banyak role netral (${totalNeutral} aktif, batas tier: ${tier.neutral_independent[1]}).`);
  }

  // 5. Reactive check
  const reactCount = categoryCounts['reactive'] || 0;
  if (reactCount > tier.reactive[1]) {
    const excess = reactCount - tier.reactive[1];
    score -= excess * 10;
    reasons.push(`Role reaktif/death-trigger terlalu banyak (${reactCount} aktif, batas tier: ${tier.reactive[1]}).`);
  }

  // 6. Even player count check (minor)
  if (playerCount % 2 === 0) {
    score -= 5;
    reasons.push('Jumlah pemain genap lebih rentan menghasilkan hasil vote seri (tie).');
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  let verdict: BalanceVerdict = 'green';
  let verdictLabel = 'Seimbang';

  if (score < 41) {
    verdict = 'red';
    verdictLabel = 'Tidak Seimbang';
  } else if (score < 71) {
    verdict = 'yellow';
    verdictLabel = 'Perlu Perhatian';
  }

  return {
    score,
    verdict,
    verdictLabel,
    reasons,
  };
}
