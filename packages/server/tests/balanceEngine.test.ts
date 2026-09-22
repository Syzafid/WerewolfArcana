import { describe, it, expect } from 'vitest';
import { calculateBalanceScore } from '../src/engine/balanceEngine.js';

describe('Balance Engine', () => {
  it('should score balanced classic setup for 5 players as green', () => {
    // 5 players: 1 wolf, 1 seer, 3 villagers (odd player count)
    const roles = ['werewolf', 'seer', 'villager', 'villager', 'villager'];
    const evalResult = calculateBalanceScore(roles, 5);

    expect(evalResult.score).toBeGreaterThanOrEqual(71);
    expect(evalResult.verdict).toBe('green');
  });

  it('should penalize zero werewolves heavily', () => {
    const roles = ['seer', 'guardian', 'villager', 'villager', 'villager'];
    const evalResult = calculateBalanceScore(roles, 5);

    expect(evalResult.score).toBeLessThan(70);
    expect(evalResult.reasons.some((r) => r.includes('terlalu sedikit'))).toBe(true);
  });

  it('should penalize conflicting roles (alpha_wolf and lycan in small game)', () => {
    const roles = ['alpha_wolf', 'lycan', 'seer', 'villager', 'villager'];
    const evalResult = calculateBalanceScore(roles, 5);

    expect(evalResult.reasons.some((r) => r.includes('Konflik'))).toBe(true);
  });
});
