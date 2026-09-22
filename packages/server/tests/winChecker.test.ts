import { describe, it, expect } from 'vitest';
import type { Player } from '@werewolf/shared';
import { checkWinCondition } from '../src/engine/winChecker.js';

describe('Win Condition Checker', () => {
  function makePlayer(id: string, name: string, roleId: string, alive: boolean, partnerId?: string): Player {
    return {
      id,
      name,
      socketId: 'sock_' + id,
      sessionToken: 'tok_' + id,
      roleId,
      alive,
      connected: true,
      avatarSeed: 'seed_' + id,
      partnerId,
    };
  }

  it('should declare Werewolf win on parity (wolves >= non-wolves)', () => {
    const players: Player[] = [
      makePlayer('p1', 'Wolf', 'werewolf', true),
      makePlayer('p2', 'Villager', 'villager', true),
      makePlayer('p3', 'DeadGuy', 'villager', false),
    ];

    const result = checkWinCondition(players, { round: 1 });
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe('werewolf');
  });

  it('should declare Village win when all werewolves are eliminated', () => {
    const players: Player[] = [
      makePlayer('p1', 'Wolf', 'werewolf', false),
      makePlayer('p2', 'Villager 1', 'villager', true),
      makePlayer('p3', 'Seer', 'seer', true),
    ];

    const result = checkWinCondition(players, { round: 2 });
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe('village');
  });

  it('should declare Tanner victory if Tanner was just executed', () => {
    const players: Player[] = [
      makePlayer('p1', 'Wolf', 'werewolf', true),
      makePlayer('p2', 'TannerGuy', 'tanner', false),
      makePlayer('p3', 'Villager', 'villager', true),
    ];

    const result = checkWinCondition(players, { round: 1, lastExecutedPlayerId: 'p2' });
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe('tanner');
  });

  it('should declare Lovers win if only the two Lovers survive', () => {
    const players: Player[] = [
      makePlayer('p1', 'Romeo', 'werewolf', true, 'p2'),
      makePlayer('p2', 'Juliet', 'villager', true, 'p1'),
      makePlayer('p3', 'OtherWolf', 'werewolf', false),
    ];

    const result = checkWinCondition(players, { round: 3 });
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe('lovers');
  });
});
