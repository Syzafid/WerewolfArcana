import { describe, it, expect } from 'vitest';
import type { Player, NightAction } from '@werewolf/shared';
import { resolveNightActions } from '../src/engine/nightResolver.js';

describe('Drunk Role Mechanics Verification', () => {
  function createPlayer(id: string, name: string, roleId: string, fakeRoleId?: string): Player {
    return {
      id,
      name,
      socketId: 'sock_' + id,
      sessionToken: 'tok_' + id,
      roleId,
      fakeRoleId,
      alive: true,
      connected: true,
      avatarSeed: 'seed_' + id,
    };
  }

  it('Drunk acting as Seer receives drunken vision, but has no actual true knowledge', () => {
    const players = new Map<string, Player>([
      ['drunk1', createPlayer('drunk1', 'Pak Mabuk', 'drunk', 'seer')],
      ['target1', createPlayer('target1', 'Budi', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      ['drunk1', { playerId: 'drunk1', roleId: 'seer', targetPlayerId: 'target1', timestamp: Date.now() }],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.seerResults.length).toBe(1);
    expect(result.seerResults[0].seerPlayerId).toBe('drunk1');
    expect(result.seerResults[0].message).toContain('Mata Sayu'); // Drunk vision delivered!
  });

  it('Drunk acting as Doctor/Guardian CANNOT protect victim from werewolf kill', () => {
    const players = new Map<string, Player>([
      ['wolf1', createPlayer('wolf1', 'Serigala', 'werewolf')],
      ['drunkDoctor', createPlayer('drunkDoctor', 'Dokter Mabuk', 'drunk', 'guardian')],
      ['victim', createPlayer('victim', 'Korban', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      ['wolf1', { playerId: 'wolf1', roleId: 'werewolf', targetPlayerId: 'victim', timestamp: Date.now() }],
      ['drunkDoctor', { playerId: 'drunkDoctor', roleId: 'guardian', targetPlayerId: 'victim', timestamp: Date.now() }],
    ]);

    const result = resolveNightActions(actions, players);
    // Drunk doctor fails to protect! Victim dies!
    expect(result.deadPlayerIds).toContain('victim');
  });

  it('Drunk acting as Vigilante shoots a blank and cannot kill anyone', () => {
    const players = new Map<string, Player>([
      ['drunkVigi', createPlayer('drunkVigi', 'Koboi Mabuk', 'drunk', 'vigilante')],
      ['target', createPlayer('target', 'Warga Polos', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      ['drunkVigi', { playerId: 'drunkVigi', roleId: 'vigilante', targetPlayerId: 'target', timestamp: Date.now() }],
    ]);

    const result = resolveNightActions(actions, players);
    // Drunk vigilante misses, target survives!
    expect(result.deadPlayerIds).not.toContain('target');
    expect(result.deadPlayerIds.length).toBe(0);
  });
});
