import { describe, it, expect } from 'vitest';
import type { Player, NightAction, Vote } from '@werewolf/shared';
import { resolveNightActions } from '../src/engine/nightResolver.js';
import { resolveVotes } from '../src/engine/votingSystem.js';
import { checkWinCondition } from '../src/engine/winChecker.js';

describe('Expanded Roles Verification', () => {
  function createPlayer(id: string, name: string, roleId: string, alive: boolean = true, partnerId?: string): Player {
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

  it('Escort should block werewolf from attacking', () => {
    const players = new Map<string, Player>([
      ['p1', createPlayer('p1', 'Wolf', 'werewolf')],
      ['p2', createPlayer('p2', 'EscortGirl', 'escort')],
      ['p3', createPlayer('p3', 'Victim', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      ['p1', { playerId: 'p1', roleId: 'werewolf', targetPlayerId: 'p3', timestamp: Date.now() }],
      ['p2', { playerId: 'p2', roleId: 'escort', targetPlayerId: 'p1', timestamp: Date.now() }],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.deadPlayerIds.length).toBe(0); // Wolf was blocked by Escort!
  });

  it('Transporter should swap targets so werewolf kills other target', () => {
    const players = new Map<string, Player>([
      ['p1', createPlayer('p1', 'Wolf', 'werewolf')],
      ['p2', createPlayer('p2', 'TransporterGuy', 'transporter')],
      ['p3', createPlayer('p3', 'VictimA', 'villager')],
      ['p4', createPlayer('p4', 'VictimB', 'villager')],
    ]);

    // Wolf targets VictimA (p3). Transporter swaps p3 and p4!
    const actions = new Map<string, NightAction>([
      ['p1', { playerId: 'p1', roleId: 'werewolf', targetPlayerId: 'p3', timestamp: Date.now() }],
      ['p2', { playerId: 'p2', roleId: 'transporter', targetPlayerId: 'p3', secondaryTargetId: 'p4', timestamp: Date.now() }],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.deadPlayerIds).toContain('p4'); // p4 died instead of p3!
    expect(result.deadPlayerIds).not.toContain('p3');
  });

  it('Scapegoat should die if vote ends in a tie', () => {
    const players = new Map<string, Player>([
      ['voter1', createPlayer('voter1', 'Alice', 'villager')],
      ['voter2', createPlayer('voter2', 'Bob', 'villager')],
      ['candA', createPlayer('candA', 'CandidateA', 'villager')],
      ['candB', createPlayer('candB', 'CandidateB', 'villager')],
      ['goat', createPlayer('goat', 'BillyTheGoat', 'scapegoat')],
    ]);

    // 1 vote for candA, 1 vote for candB (tie)
    const votes = new Map<string, Vote>([
      ['voter1', { voterId: 'voter1', targetId: 'candA', round: 1, timestamp: Date.now() }],
      ['voter2', { voterId: 'voter2', targetId: 'candB', round: 1, timestamp: Date.now() }],
    ]);

    const result = resolveVotes(votes, players);
    expect(result.isTie).toBe(true);
    expect(result.executedPlayerId).toBe('goat'); // Scapegoat dies on tie!
  });

  it('Angel should win immediately if killed on Round 1', () => {
    const players: Player[] = [
      createPlayer('p1', 'AngelGuy', 'angel', false), // dead round 1
      createPlayer('p2', 'Wolf', 'werewolf', true),
      createPlayer('p3', 'Villager', 'villager', true),
    ];

    const result = checkWinCondition(players, { round: 1 });
    expect(result.hasWinner).toBe(true);
    expect(result.winner).toBe('angel');
  });
});
