import { describe, it, expect } from 'vitest';
import type { Player, NightAction } from '@werewolf/shared';
import { resolveNightActions } from '../src/engine/nightResolver.js';

describe('Night Resolver Engine (4-Stage Pipeline)', () => {
  function createPlayer(id: string, name: string, roleId: string, partnerId?: string): Player {
    return {
      id,
      name,
      socketId: 'sock_' + id,
      sessionToken: 'tok_' + id,
      roleId,
      alive: true,
      connected: true,
      avatarSeed: 'seed_' + id,
      partnerId,
    };
  }

  it('should kill target when attacked by Werewolf without protection', () => {
    const players = new Map<string, Player>([
      ['p1', createPlayer('p1', 'Wolf', 'werewolf')],
      ['p2', createPlayer('p2', 'Victim', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'p1',
        {
          playerId: 'p1',
          roleId: 'werewolf',
          targetPlayerId: 'p2',
          timestamp: Date.now(),
        },
      ],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.deadPlayerIds).toContain('p2');
    expect(result.deadPlayerIds.length).toBe(1);
  });

  it('should save victim when protected by Guardian', () => {
    const players = new Map<string, Player>([
      ['p1', createPlayer('p1', 'Wolf', 'werewolf')],
      ['p2', createPlayer('p2', 'Doctor', 'guardian')],
      ['p3', createPlayer('p3', 'Victim', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'p1',
        {
          playerId: 'p1',
          roleId: 'werewolf',
          targetPlayerId: 'p3',
          timestamp: Date.now(),
        },
      ],
      [
        'p2',
        {
          playerId: 'p2',
          roleId: 'guardian',
          targetPlayerId: 'p3',
          timestamp: Date.now(),
        },
      ],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.deadPlayerIds.length).toBe(0);
  });

  it('should trigger chain death when a Lover partner dies (Stage 3 Reactive)', () => {
    const players = new Map<string, Player>([
      ['p1', createPlayer('p1', 'Wolf', 'werewolf')],
      ['p2', createPlayer('p2', 'Romeo', 'villager', 'p3')],
      ['p3', createPlayer('p3', 'Juliet', 'villager', 'p2')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'p1',
        {
          playerId: 'p1',
          roleId: 'werewolf',
          targetPlayerId: 'p2',
          timestamp: Date.now(),
        },
      ],
    ]);

    const result = resolveNightActions(actions, players);
    expect(result.deadPlayerIds).toContain('p2');
    expect(result.deadPlayerIds).toContain('p3');
    expect(result.deadPlayerIds.length).toBe(2);
  });

  it('should show Alpha Wolf as innocent to Seer, but Lycan as werewolf', () => {
    const players = new Map<string, Player>([
      ['s1', createPlayer('s1', 'Seer', 'seer')],
      ['a1', createPlayer('a1', 'Alpha', 'alpha_wolf')],
      ['l1', createPlayer('l1', 'LycanGuy', 'lycan')],
    ]);

    // Seer peeks Alpha Wolf
    const actions1 = new Map<string, NightAction>([
      [
        's1',
        {
          playerId: 's1',
          roleId: 'seer',
          targetPlayerId: 'a1',
          timestamp: Date.now(),
        },
      ],
    ]);
    const res1 = resolveNightActions(actions1, players);
    expect(res1.seerResults[0].isWolf).toBe(false);

    // Seer peeks Lycan
    const actions2 = new Map<string, NightAction>([
      [
        's1',
        {
          playerId: 's1',
          roleId: 'seer',
          targetPlayerId: 'l1',
          timestamp: Date.now(),
        },
      ],
    ]);
    const res2 = resolveNightActions(actions2, players);
    expect(res2.seerResults[0].isWolf).toBe(true);
    expect(res2.seerResults[0].actionDescription).toBeDefined();
  });

  it('should generate private logs for protective and support roles (Guardian, Escort)', () => {
    const players = new Map<string, Player>([
      ['g1', createPlayer('g1', 'Guardian', 'guardian')],
      ['e1', createPlayer('e1', 'Escort', 'escort')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
      ['w1', createPlayer('w1', 'Wolf', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'g1',
        {
          playerId: 'g1',
          roleId: 'guardian',
          targetPlayerId: 'v1',
          timestamp: Date.now(),
        },
      ],
      [
        'e1',
        {
          playerId: 'e1',
          roleId: 'escort',
          targetPlayerId: 'w1',
          timestamp: Date.now(),
        },
      ],
    ]);

    const res = resolveNightActions(actions, players, 1);
    const guardianFeedback = res.seerResults.find((r) => r.seerPlayerId === 'g1');
    const escortFeedback = res.seerResults.find((r) => r.seerPlayerId === 'e1');
    const blockedTargetFeedback = res.seerResults.find((r) => r.seerPlayerId === 'w1');

    expect(guardianFeedback).toBeDefined();
    expect(guardianFeedback?.message).toContain('berhasil menyelimuti rumah');
    expect(escortFeedback).toBeDefined();
    expect(escortFeedback?.message).toContain('berhasil mengalihkan perhatian');
    expect(blockedTargetFeedback).toBeDefined();
    expect(blockedTargetFeedback?.message).toContain('Perhatian Terganggu');
  });

  it('should prevent Guardian from protecting the same player two nights in a row', () => {
    const players = new Map<string, Player>([
      ['g1', createPlayer('g1', 'Guardian', 'guardian')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
      ['w1', createPlayer('w1', 'Wolf', 'werewolf')],
    ]);

    // Round 1: Guardian protects v1
    const round1Actions = new Map<string, NightAction>([
      ['g1', { playerId: 'g1', roleId: 'guardian', targetPlayerId: 'v1', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);
    const res1 = resolveNightActions(round1Actions, players, 1);
    expect(res1.deadPlayerIds).not.toContain('v1');
    expect(players.get('g1')?.lastProtectedTargetId).toBe('v1');

    // Round 2: Guardian attempts to protect v1 again -> protection fails, wolf kills v1!
    const round2Actions = new Map<string, NightAction>([
      ['g1', { playerId: 'g1', roleId: 'guardian', targetPlayerId: 'v1', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);
    const res2 = resolveNightActions(round2Actions, players, 2);
    expect(res2.deadPlayerIds).toContain('v1');
    const guardianFeedback = res2.seerResults.find((r) => r.seerPlayerId === 'g1');
    expect(guardianFeedback?.message).toContain('dua malam berturut-turut');
  });

  it('should prevent Escort from roleblocking the same player two nights in a row', () => {
    const players = new Map<string, Player>([
      ['e1', createPlayer('e1', 'Escort', 'escort')],
      ['w1', createPlayer('w1', 'Wolf', 'werewolf')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
    ]);

    // Round 1: Escort blocks wolf -> wolf cannot kill
    const round1Actions = new Map<string, NightAction>([
      ['e1', { playerId: 'e1', roleId: 'escort', targetPlayerId: 'w1', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);
    const res1 = resolveNightActions(round1Actions, players, 1);
    expect(res1.deadPlayerIds.length).toBe(0);
    expect(players.get('e1')?.lastRoleblockTargetId).toBe('w1');

    // Round 2: Escort tries to block wolf again -> block fails, wolf kills villager
    const round2Actions = new Map<string, NightAction>([
      ['e1', { playerId: 'e1', roleId: 'escort', targetPlayerId: 'w1', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);
    const res2 = resolveNightActions(round2Actions, players, 2);
    expect(res2.deadPlayerIds).toContain('v1');
    const escortFeedback = res2.seerResults.find((r) => r.seerPlayerId === 'e1');
    expect(escortFeedback?.message).toContain('dua malam berturut-turut');
  });

  it('should make Vigilante commit suicide from guilt after shooting a village member', () => {
    const players = new Map<string, Player>([
      ['vig1', createPlayer('vig1', 'Vigilante', 'vigilante')],
      ['innocent', createPlayer('innocent', 'Villager', 'villager')],
    ]);

    // Night 2: Vigilante shoots innocent villager
    const night2Actions = new Map<string, NightAction>([
      ['vig1', { playerId: 'vig1', roleId: 'vigilante', targetPlayerId: 'innocent', timestamp: Date.now() }],
    ]);
    const resNight2 = resolveNightActions(night2Actions, players, 2);
    expect(resNight2.deadPlayerIds).toContain('innocent');
    expect(players.get('vig1')?.vigilanteGuilt).toBe(true);

    // Night 3: Vigilante dies of guilt at start of night
    const night3Actions = new Map<string, NightAction>();
    const resNight3 = resolveNightActions(night3Actions, players, 3);
    expect(resNight3.deadPlayerIds).toContain('vig1');
    expect(resNight3.publicAnnouncements.some((msg) => msg.includes('rasa bersalah'))).toBe(true);
  });

  it('should prevent regular Werewolf from attacking a fellow Werewolf', () => {
    const players = new Map<string, Player>([
      ['w1', createPlayer('w1', 'Wolf1', 'werewolf')],
      ['w2', createPlayer('w2', 'Wolf2', 'alpha_wolf')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
    ]);

    // Wolf1 attempts to target Wolf2
    const actions = new Map<string, NightAction>([
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'w2', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    // Wolf2 must NOT die
    expect(res.deadPlayerIds).not.toContain('w2');
    const feedback = res.seerResults.find((r) => r.seerPlayerId === 'w1');
    expect(feedback?.message).toContain('tidak dapat memangsa sesama kawan serigala');
  });

  it('should allow White Werewolf to betray and kill a fellow Werewolf on even rounds', () => {
    const players = new Map<string, Player>([
      ['ww', createPlayer('ww', 'WhiteWolf', 'white_werewolf')],
      ['w1', createPlayer('w1', 'NormalWolf', 'werewolf')],
    ]);

    // Round 2 (even round): White Werewolf strikes fellow wolf
    const actions = new Map<string, NightAction>([
      ['ww', { playerId: 'ww', roleId: 'white_werewolf', targetPlayerId: 'w1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 2);
    expect(res.deadPlayerIds).toContain('w1');
  });

  it('should allow a Werewolf paired with a Villager (Cupid Lover) to target a fellow Werewolf', () => {
    const players = new Map<string, Player>([
      ['w1', createPlayer('w1', 'WolfLover', 'werewolf', 'v_partner')],
      ['v_partner', createPlayer('v_partner', 'VillagerPartner', 'villager', 'w1')],
      ['w2', createPlayer('w2', 'RivalWolf', 'werewolf')],
    ]);

    // w1 has a cross-team lover (v_partner), so w1 wants to eliminate w2 to win with their lover!
    const actions = new Map<string, NightAction>([
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'w2', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('w2');
  });

  it('should strip Jailer executions forever when executing an innocent villager', () => {
    const players = new Map<string, Player>([
      ['j1', createPlayer('j1', 'Jailer', 'jailer')],
      ['v1', createPlayer('v1', 'InnocentVillager', 'villager')],
    ]);

    // Night 1: Jailer jails and executes innocent villager
    const actions = new Map<string, NightAction>([
      ['j1', { playerId: 'j1', roleId: 'jailer', targetPlayerId: 'v1', secondaryTargetId: 'execute', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('v1');
    const jailer = players.get('j1');
    expect(jailer?.jailerLostExecutions).toBe(true);

    // Night 2: Jailer tries to execute another player, but execution is blocked
    const v2 = createPlayer('v2', 'Villager2', 'villager');
    players.set('v2', v2);
    const actions2 = new Map<string, NightAction>([
      ['j1', { playerId: 'j1', roleId: 'jailer', targetPlayerId: 'v2', secondaryTargetId: 'execute', timestamp: Date.now() }],
    ]);

    const res2 = resolveNightActions(actions2, players, 2);
    expect(res2.deadPlayerIds).not.toContain('v2');
    const feedback = res2.seerResults.find((r) => r.seerPlayerId === 'j1' && r.actionDescription === 'Eksekusi Ditolak');
    expect(feedback).toBeDefined();
  });

  it('should allow Transporter to redirect actions, but prevent transporting jailed players', () => {
    const players = new Map<string, Player>([
      ['t1', createPlayer('t1', 'Transporter', 'transporter')],
      ['j1', createPlayer('j1', 'Jailer', 'jailer')],
      ['w1', createPlayer('w1', 'Wolf', 'werewolf')],
      ['v1', createPlayer('v1', 'Victim1', 'villager')],
      ['v2', createPlayer('v2', 'Victim2', 'villager')],
    ]);

    // Normal swap: Wolf targets v1, Transporter swaps v1 and v2 -> v2 dies!
    const actions = new Map<string, NightAction>([
      ['t1', { playerId: 't1', roleId: 'transporter', targetPlayerId: 'v1', secondaryTargetId: 'v2', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('v2');
    expect(res.deadPlayerIds).not.toContain('v1');

    // Jailed swap: Jailer jails v1, Transporter tries to swap v1 and v2 -> swap fails because v1 is in jail!
    const actions2 = new Map<string, NightAction>([
      ['j1', { playerId: 'j1', roleId: 'jailer', targetPlayerId: 'v1', timestamp: Date.now() }],
      ['t1', { playerId: 't1', roleId: 'transporter', targetPlayerId: 'v1', secondaryTargetId: 'v2', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v2', timestamp: Date.now() }],
    ]);

    const res2 = resolveNightActions(actions2, players, 2);
    const transportFailFeedback = res2.seerResults.find((r) => r.seerPlayerId === 't1' && r.actionDescription === 'Gagal Memindahkan');
    expect(transportFailFeedback).toBeDefined();
    // Wolf attacked v2 directly, without being swapped
    expect(res2.deadPlayerIds).toContain('v2');
  });

  it('should cancel special village powers when villageCursed is active', () => {
    const players = new Map<string, Player>([
      ['g1', createPlayer('g1', 'Guardian', 'guardian')],
      ['w1', createPlayer('w1', 'Wolf', 'werewolf')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      ['g1', { playerId: 'g1', roleId: 'guardian', targetPlayerId: 'v1', timestamp: Date.now() }],
      ['w1', { playerId: 'w1', roleId: 'werewolf', targetPlayerId: 'v1', timestamp: Date.now() }],
    ]);

    // When villageCursed is true, Guardian cannot protect v1 -> v1 dies!
    const res = resolveNightActions(actions, players, 1, { villageCursed: true });
    expect(res.deadPlayerIds).toContain('v1');
  });

  it('should allow Veteran on alert to survive attack and kill visitors', () => {
    const players = new Map<string, Player>([
      ['vet', createPlayer('vet', 'Veteran', 'veteran')],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    // Veteran alerts, wolf attacks veteran -> Veteran survives, wolf dies!
    const actions = new Map<string, NightAction>([
      ['vet', { playerId: 'vet', roleId: 'veteran', targetPlayerId: 'vet', timestamp: Date.now() }],
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'vet', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('wolf');
    expect(res.deadPlayerIds).not.toContain('vet');
  });

  it('should allow Slayer to kill a werewolf with silver bullet, but miss on non-wolves', () => {
    const players = new Map<string, Player>([
      ['slay', createPlayer('slay', 'Slayer', 'slayer')],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
      ['villager', createPlayer('villager', 'Villager', 'villager')],
    ]);

    // Slayer guesses wolf correctly
    const actions = new Map<string, NightAction>([
      ['slay', { playerId: 'slay', roleId: 'slayer', targetPlayerId: 'wolf', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('wolf');
    const slayer = players.get('slay');
    expect(slayer?.slayerUsedShot).toBe(true);
  });

  it('should kill Priest when holy water is mistakenly poured on an innocent villager', () => {
    const players = new Map<string, Player>([
      ['priest', createPlayer('priest', 'Priest', 'priest')],
      ['innocent', createPlayer('innocent', 'Villager', 'villager')],
    ]);

    const actions = new Map<string, NightAction>([
      ['priest', { playerId: 'priest', roleId: 'priest', targetPlayerId: 'innocent', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('priest');
    expect(res.deadPlayerIds).not.toContain('innocent');
  });

  it('should poison and kill the attacking werewolf when Knight with Rusty Sword dies', () => {
    const players = new Map<string, Player>([
      ['knight', createPlayer('knight', 'Knight', 'knight_rusty_sword')],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'knight', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('knight');
    expect(res.deadPlayerIds).toContain('wolf');
  });

  it('should reveal the true Seer identity to the Beholder on Night 1', () => {
    const players = new Map<string, Player>([
      ['b1', createPlayer('b1', 'BeholderPlayer', 'beholder')],
      ['s1', createPlayer('s1', 'TrueSeer', 'seer')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
    ]);

    const actions = new Map<string, NightAction>();
    const res = resolveNightActions(actions, players, 1);
    const beholderFeedback = res.seerResults.find((r) => r.seerPlayerId === 'b1');
    expect(beholderFeedback).toBeDefined();
    expect(beholderFeedback?.message).toContain('TrueSeer');
  });

  it('should promote Apprentice Seer to Seer when the true Seer dies at night', () => {
    const players = new Map<string, Player>([
      ['app1', createPlayer('app1', 'Apprentice', 'apprentice_seer')],
      ['s1', createPlayer('s1', 'SeerToDie', 'seer')],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    // Wolf kills Seer
    const actions = new Map<string, NightAction>([
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 's1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('s1');
    // Apprentice Seer should have converted to seer
    const apprentice = players.get('app1');
    expect(apprentice?.roleId).toBe('seer');
    expect(res.convertedPlayerIds).toContain('app1');
  });

  it('should give Little Girl a nocturnal peek clue at werewolves', () => {
    const players = new Map<string, Player>([
      ['lg1', createPlayer('lg1', 'LittleGirlPlayer', 'little_girl')],
      ['w1', createPlayer('w1', 'WolfTarget', 'werewolf')],
      ['v1', createPlayer('v1', 'Villager', 'villager')],
    ]);

    const actions = new Map<string, NightAction>();
    const res = resolveNightActions(actions, players, 1);
    const lgFeedback = res.seerResults.find((r) => r.seerPlayerId === 'lg1');
    expect(lgFeedback).toBeDefined();
    expect(lgFeedback?.message).toContain('WolfTarget');
  });

  it('should deflect werewolf attack on Serial Killer due to basic defense', () => {
    const players = new Map<string, Player>([
      ['sk', createPlayer('sk', 'SerialKiller', 'serial_killer')],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'sk', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).not.toContain('sk');
    const skFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sk');
    expect(skFeedback?.message).toContain('Pertahanan Diri');
  });

  it('should kill Jailer if Serial Killer is jailed without being executed', () => {
    const players = new Map<string, Player>([
      ['jailer', createPlayer('jailer', 'TheJailer', 'jailer')],
      ['sk', createPlayer('sk', 'SerialKiller', 'serial_killer')],
    ]);

    const actions = new Map<string, NightAction>([
      ['jailer', { playerId: 'jailer', roleId: 'jailer', targetPlayerId: 'sk', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('jailer');
    expect(res.deadPlayerIds).not.toContain('sk');
    const jailerFeedback = res.seerResults.find((r) => r.seerPlayerId === 'jailer' && r.actionDescription === 'Ditikam Serial Killer');
    expect(jailerFeedback?.message).toContain('menikammu');
  });

  it('should convert Executioner into Jester when their target dies at night', () => {
    const target = createPlayer('target1', 'TargetVillager', 'villager');
    const execPlayer = createPlayer('exec1', 'ExecutionerPlayer', 'executioner');
    execPlayer.executionerTargetId = 'target1';

    const players = new Map<string, Player>([
      ['target1', target],
      ['exec1', execPlayer],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'target1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('target1');
    expect(execPlayer.roleId).toBe('jester');
    expect(res.convertedPlayerIds).toContain('exec1');
  });

  it('should transform Wild Child into Werewolf when their role model dies at night', () => {
    const model = createPlayer('model1', 'RoleModel', 'villager');
    const wildChild = createPlayer('wc1', 'WildChildPlayer', 'wild_child');
    wildChild.roleModelId = 'model1';

    const players = new Map<string, Player>([
      ['model1', model],
      ['wc1', wildChild],
      ['sk', createPlayer('sk', 'SerialKiller', 'serial_killer')],
    ]);

    const actions = new Map<string, NightAction>([
      ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'model1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('model1');
    expect(wildChild.roleId).toBe('werewolf');
    expect(res.convertedPlayerIds).toContain('wc1');
  });

  it('should inherit role for Doppelganger when copied target dies at night', () => {
    const copied = createPlayer('copied1', 'CopiedDoctor', 'doctor');
    const doppel = createPlayer('dp1', 'DoppelPlayer', 'doppelganger');
    doppel.doppelgangerTargetId = 'copied1';

    const players = new Map<string, Player>([
      ['copied1', copied],
      ['dp1', doppel],
      ['sk', createPlayer('sk', 'SerialKiller', 'serial_killer')],
    ]);

    const actions = new Map<string, NightAction>([
      ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'copied1', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('copied1');
    expect(doppel.roleId).toBe('doctor');
    expect(res.convertedPlayerIds).toContain('dp1');
  });

  it('should fail Cult Leader recruitment on Werewolf and succeed on non-wolf', () => {
    const players = new Map<string, Player>([
      ['cult', createPlayer('cult', 'Cultist', 'cult_leader')],
      ['wolf', createPlayer('wolf', 'WolfTarget', 'werewolf')],
      ['villager', createPlayer('villager', 'VillageTarget', 'villager')],
    ]);

    // Night 1: Cult targets Werewolf
    const act1 = new Map<string, NightAction>([
      ['cult', { playerId: 'cult', roleId: 'cult_leader', targetPlayerId: 'wolf', timestamp: Date.now() }],
    ]);
    const res1 = resolveNightActions(act1, players, 1);
    expect(players.get('wolf')?.isCult).toBeFalsy();
    const cultFailFeedback = res1.seerResults.find((r) => r.seerPlayerId === 'cult');
    expect(cultFailFeedback?.message).toContain('gagal total');
    expect(cultFailFeedback?.actionDescription).toBe('Rekrutmen Gagal');

    // Night 2: Cult targets Villager
    const act2 = new Map<string, NightAction>([
      ['cult', { playerId: 'cult', roleId: 'cult_leader', targetPlayerId: 'villager', timestamp: Date.now() }],
    ]);
    const res2 = resolveNightActions(act2, players, 2);
    expect(players.get('villager')?.isCult).toBe(true);
    const cultSuccessFeedback = res2.seerResults.find((r) => r.seerPlayerId === 'cult');
    expect(cultSuccessFeedback?.actionDescription).toBe('Rekrutmen Sukses');
    expect(cultSuccessFeedback?.message).toContain('berhasil memikat');
    const victimFeedback = res2.seerResults.find((r) => r.seerPlayerId === 'villager');
    expect(victimFeedback?.message).toContain('Cult Member');
  });

  it('should allow Survivor to wear vest, decrementing vest count and shielding from attack', () => {
    const survivor = createPlayer('surv', 'SurvivorPlayer', 'survivor');
    survivor.survivorVestsLeft = 3;

    const players = new Map<string, Player>([
      ['surv', survivor],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    const actions = new Map<string, NightAction>([
      ['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'surv', timestamp: Date.now() }],
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'surv', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).not.toContain('surv');
    expect(survivor.survivorVestsLeft).toBe(2);
    const survFeedback = res.seerResults.find((r) => r.seerPlayerId === 'surv');
    expect(survFeedback?.message).toContain('Sisa rompi: 2');
  });

  it('should allow Survivor to save vest, but die if attacked without vest', () => {
    const survivor = createPlayer('surv', 'SurvivorPlayer', 'survivor');
    survivor.survivorVestsLeft = 3;

    const players = new Map<string, Player>([
      ['surv', survivor],
      ['wolf', createPlayer('wolf', 'Wolf', 'werewolf')],
    ]);

    // Survivor explicitly chooses 'save' to gamble
    const actions = new Map<string, NightAction>([
      ['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'save', timestamp: Date.now() }],
      ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'surv', timestamp: Date.now() }],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('surv');
    // Vests should NOT be consumed when saving
    expect(survivor.survivorVestsLeft).toBe(3);
    const survFeedback = res.seerResults.find((r) => r.seerPlayerId === 'surv');
    expect(survFeedback?.actionDescription).toBe('Menyimpan Rompi');
  });

  it('should allow Survivor to use vests consecutively across nights until 0', () => {
    const survivor = createPlayer('surv', 'SurvivorPlayer', 'survivor');
    survivor.survivorVestsLeft = 3;

    const players = new Map<string, Player>([
      ['surv', survivor],
    ]);

    // Night 1
    resolveNightActions(new Map([['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'surv', timestamp: Date.now() }]]), players, 1);
    expect(survivor.survivorVestsLeft).toBe(2);

    // Night 2 (consecutive usage is allowed for Survivor!)
    resolveNightActions(new Map([['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'surv', timestamp: Date.now() }]]), players, 2);
    expect(survivor.survivorVestsLeft).toBe(1);

    // Night 3 (consecutive usage is allowed!)
    resolveNightActions(new Map([['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'surv', timestamp: Date.now() }]]), players, 3);
    expect(survivor.survivorVestsLeft).toBe(0);

    // Night 4: Out of vests!
    const res4 = resolveNightActions(new Map([['surv', { playerId: 'surv', roleId: 'survivor', targetPlayerId: 'surv', timestamp: Date.now() }]]), players, 4);
    expect(survivor.survivorVestsLeft).toBe(0);
    const feedback4 = res4.seerResults.find((r) => r.seerPlayerId === 'surv');
    expect(feedback4?.actionDescription).toBe('Rompi Habis');
  });

  it('should kill target by lightning strike when Sorcerer correctly guesses their role', () => {
    const players = new Map<string, Player>([
      ['sorc', createPlayer('sorc', 'TheSorcerer', 'sorcerer')],
      ['target', createPlayer('target', 'SeerPlayer', 'seer')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'sorc',
        {
          playerId: 'sorc',
          roleId: 'sorcerer',
          targetPlayerId: 'target',
          secondaryTargetId: 'seer', // Correct guess!
          timestamp: Date.now(),
        },
      ],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).toContain('target');
    expect(res.publicAnnouncements.some((a) => a.includes('petir dahsyat'))).toBe(true);

    const sorcFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sorc');
    expect(sorcFeedback?.actionDescription).toBe('Kutukan Petir Tepat');
    expect(sorcFeedback?.message).toContain('TEPAT SASARAN');

    const victimFeedback = res.seerResults.find((r) => r.seerPlayerId === 'target');
    expect(victimFeedback?.actionDescription).toBe('Tersambar Petir');
  });

  it('should not harm target when Sorcerer incorrectly guesses their role', () => {
    const players = new Map<string, Player>([
      ['sorc', createPlayer('sorc', 'TheSorcerer', 'sorcerer')],
      ['target', createPlayer('target', 'SeerPlayer', 'seer')],
    ]);

    const actions = new Map<string, NightAction>([
      [
        'sorc',
        {
          playerId: 'sorc',
          roleId: 'sorcerer',
          targetPlayerId: 'target',
          secondaryTargetId: 'doctor', // Incorrect guess!
          timestamp: Date.now(),
        },
      ],
    ]);

    const res = resolveNightActions(actions, players, 1);
    expect(res.deadPlayerIds).not.toContain('target');

    const sorcFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sorc');
    expect(sorcFeedback?.actionDescription).toBe('Tebakan Meleset');
    expect(sorcFeedback?.message).toContain('SALAH');
  });

  // =========================================================================
  // ACTION PRIORITY HIERARCHY TESTS
  // =========================================================================
  describe('Action Priority Hierarchy (Arsonist > Sorcerer > Serial Killer > Werewolf)', () => {
    it('should prioritize Serial Killer over Werewolf when they mutually attack each other', () => {
      const players = new Map<string, Player>([
        ['sk', createPlayer('sk', 'Dexter', 'serial_killer')],
        ['wolf', createPlayer('wolf', 'Fenrir', 'werewolf')],
      ]);

      const actions = new Map<string, NightAction>([
        ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'wolf', timestamp: Date.now() }],
        ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'sk', timestamp: Date.now() }],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Werewolf dies from SK stab
      expect(res.deadPlayerIds).toContain('wolf');
      // Serial Killer survives because SK acts first and has natural basic defense against normal werewolf attack
      expect(res.deadPlayerIds).not.toContain('sk');

      const skFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sk' && r.actionDescription?.includes('Menikam'));
      expect(skFeedback?.message).toContain('berhasil merenggut nyawa Fenrir');
    });

    it('should let Sorcerer defeat Serial Killer if Sorcerer correctly guesses their role', () => {
      const players = new Map<string, Player>([
        ['sorc', createPlayer('sorc', 'Voldy', 'sorcerer')],
        ['sk', createPlayer('sk', 'Dexter', 'serial_killer')],
      ]);

      // Both target each other!
      const actions = new Map<string, NightAction>([
        [
          'sorc',
          {
            playerId: 'sorc',
            roleId: 'sorcerer',
            targetPlayerId: 'sk',
            secondaryTargetId: 'serial_killer', // Correct guess!
            timestamp: Date.now(),
          },
        ],
        ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'sorc', timestamp: Date.now() }],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Sorcerer strikes SK with lightning first, so SK is dead
      expect(res.deadPlayerIds).toContain('sk');
      // SK dies BEFORE stabbing Sorcerer, so Sorcerer survives!
      expect(res.deadPlayerIds).not.toContain('sorc');

      const sorcFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sorc');
      expect(sorcFeedback?.actionDescription).toBe('Kutukan Petir Tepat');
    });

    it('should let Serial Killer defeat Sorcerer if Sorcerer incorrectly guesses their role', () => {
      const players = new Map<string, Player>([
        ['sorc', createPlayer('sorc', 'Voldy', 'sorcerer')],
        ['sk', createPlayer('sk', 'Dexter', 'serial_killer')],
      ]);

      // Both target each other, but Sorcerer guesses wrong!
      const actions = new Map<string, NightAction>([
        [
          'sorc',
          {
            playerId: 'sorc',
            roleId: 'sorcerer',
            targetPlayerId: 'sk',
            secondaryTargetId: 'arsonist', // Wrong guess!
            timestamp: Date.now(),
          },
        ],
        ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'sorc', timestamp: Date.now() }],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // Sorcerer missed, so SK was not killed by lightning
      expect(res.deadPlayerIds).not.toContain('sk');
      // SK stabs and kills Sorcerer
      expect(res.deadPlayerIds).toContain('sorc');

      const sorcFeedback = res.seerResults.find((r) => r.seerPlayerId === 'sorc');
      expect(sorcFeedback?.actionDescription).toBe('Tebakan Meleset');
    });

    it('should prioritize Arsonist Ignite over all attackers (Werewolf, SK, Sorcerer) who are doused', () => {
      const arso = createPlayer('arso', 'Pyromancer', 'arsonist');
      const wolf = createPlayer('wolf', 'Fenrir', 'werewolf');
      const sk = createPlayer('sk', 'Dexter', 'serial_killer');
      const sorc = createPlayer('sorc', 'Voldy', 'sorcerer');

      // All attackers have been doused in previous nights
      wolf.isDoused = true;
      sk.isDoused = true;
      sorc.isDoused = true;

      const players = new Map<string, Player>([
        ['arso', arso],
        ['wolf', wolf],
        ['sk', sk],
        ['sorc', sorc],
      ]);

      // Arsonist ignites, while all 3 enemies try to kill Arsonist simultaneously!
      const actions = new Map<string, NightAction>([
        ['arso', { playerId: 'arso', roleId: 'arsonist', targetPlayerId: 'arso', secondaryTargetId: 'ignite', timestamp: Date.now() }],
        ['wolf', { playerId: 'wolf', roleId: 'werewolf', targetPlayerId: 'arso', timestamp: Date.now() }],
        ['sk', { playerId: 'sk', roleId: 'serial_killer', targetPlayerId: 'arso', timestamp: Date.now() }],
        ['sorc', { playerId: 'sorc', roleId: 'sorcerer', targetPlayerId: 'arso', secondaryTargetId: 'arsonist', timestamp: Date.now() }],
      ]);

      const res = resolveNightActions(actions, players, 1);
      // All 3 doused attackers burn to death in Tier 1!
      expect(res.deadPlayerIds).toContain('wolf');
      expect(res.deadPlayerIds).toContain('sk');
      expect(res.deadPlayerIds).toContain('sorc');
      // Arsonist survives because their burning action resolved before any attack!
      expect(res.deadPlayerIds).not.toContain('arso');
      expect(res.publicAnnouncements.some((a) => a.includes('Kobaran api meluap membakar'))).toBe(true);
    });
  });
});


