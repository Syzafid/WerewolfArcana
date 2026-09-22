import { ALL_ROLES } from '@werewolf/shared';
import { getTierAllowance, calculateBalanceScore } from './balanceEngine.js';

export interface SetupGeneratorResult {
  roles: string[];
  evaluation: ReturnType<typeof calculateBalanceScore>;
}

export function generateSetup(playerCount: number, recentRolesHistory: string[] = []): SetupGeneratorResult {
  const tier = getTierAllowance(playerCount);
  const selectedRoles: string[] = [];

  // Helper to pick from pool with rotation (preferring roles not recently used)
  function pickFromPool(roleIds: string[]): string | null {
    const valid = roleIds.filter((id) => {
      const def = ALL_ROLES[id];
      return def && def.minPlayers <= playerCount;
    });
    if (valid.length === 0) return null;

    // Weight inversely to recency
    const weighted = valid.map((id) => {
      const indexInHistory = recentRolesHistory.indexOf(id);
      const weight = indexInHistory === -1 ? 10 : Math.max(1, indexInHistory + 1);
      return { id, weight };
    });

    const totalWeight = weighted.reduce((acc, curr) => acc + curr.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of weighted) {
      rand -= item.weight;
      if (rand <= 0) return item.id;
    }
    return weighted[0].id;
  }

  // 1. Add Werewolf core slots
  for (let i = 0; i < tier.wolves; i++) {
    if (i === 0) {
      selectedRoles.push('werewolf');
    } else {
      const wolfPool = ['werewolf', 'alpha_wolf', 'mystic_wolf', 'wolf_cub'];
      const picked = pickFromPool(wolfPool) || 'werewolf';
      selectedRoles.push(picked);
    }
  }

  // 2. Add Investigative
  if (tier.investigative[0] > 0) {
    const invPool = ['seer'];
    const picked = pickFromPool(invPool) || 'seer';
    selectedRoles.push(picked);
  }

  // 3. Add Protective if tier allows
  if (tier.protective[1] > 0) {
    const protPool = ['guardian', 'bodyguard'];
    const picked = pickFromPool(protPool);
    if (picked) selectedRoles.push(picked);
  }

  // 4. Add Killer if tier allows
  if (tier.village_killer[1] > 0 && Math.random() > 0.4) {
    const killerPool = ['vigilante', 'hunter'];
    const picked = pickFromPool(killerPool);
    if (picked) selectedRoles.push(picked);
  }

  // 5. Add Association if tier allows
  if (tier.association[1] > 0 && Math.random() > 0.5) {
    const assocPool = ['mason', 'cupid'];
    const picked = pickFromPool(assocPool);
    if (picked) {
      selectedRoles.push(picked);
      if (picked === 'mason' && selectedRoles.length < playerCount) {
        selectedRoles.push('mason'); // Mason is paired
      }
    }
  }

  // 6. Add Neutral if tier allows
  if (tier.neutral_independent[1] > 0 && Math.random() > 0.5) {
    const neutralPool = ['tanner', 'jester', 'serial_killer'];
    const picked = pickFromPool(neutralPool);
    if (picked) selectedRoles.push(picked);
  }

  // 7. Add Outsider if tier allows
  if (tier.outsider[1] > 0 && Math.random() > 0.5) {
    const outsiderPool = ['lycan', 'drunk'];
    const picked = pickFromPool(outsiderPool);
    if (picked) selectedRoles.push(picked);
  }

  // 8. Fill remaining slots with Villagers
  while (selectedRoles.length < playerCount) {
    selectedRoles.push('villager');
  }

  // Truncate if somehow exceeded
  if (selectedRoles.length > playerCount) {
    selectedRoles.length = playerCount;
  }

  // 9. Apply compensation rules (e.g. Mason under 10 players -> add werewolf)
  if (selectedRoles.includes('mason') && playerCount < 10) {
    const villagerIndex = selectedRoles.indexOf('villager');
    if (villagerIndex !== -1) {
      selectedRoles[villagerIndex] = 'werewolf';
    }
  }

  const evaluation = calculateBalanceScore(selectedRoles, playerCount);
  return { roles: selectedRoles, evaluation };
}
