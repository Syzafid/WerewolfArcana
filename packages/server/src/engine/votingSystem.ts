import type { Player, Vote, PublicVote } from '@werewolf/shared';

export interface VoteResolutionResult {
  executedPlayerId: string | null;
  pardonedPlayerId?: string | null;
  hauntedPlayerId?: string | null;
  villageCursed?: boolean;
  voteCounts: Record<string, number>;
  isTie: boolean;
  abstainCount: number;
  message: string;
}

export function resolveVotes(
  votes: Map<string, Vote>,
  players: Map<string, Player>
): VoteResolutionResult {
  const voteCounts: Record<string, number> = {};
  let abstainCount = 0;

  for (const vote of votes.values()) {
    const voter = players.get(vote.voterId);
    if (!voter || !voter.alive || voter.canVote === false) continue;

    // Mayor vote has double weight (weight = 2)
    const weight = voter.roleId === 'mayor' ? 2 : 1;

    if (!vote.targetId) {
      abstainCount += weight;
    } else {
      const target = players.get(vote.targetId);
      if (target && target.alive) {
        voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + weight;
      } else {
        abstainCount += weight;
      }
    }
  }

  // Find max votes
  let maxVotes = 0;
  let candidatesWithMax: string[] = [];

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidatesWithMax = [targetId];
    } else if (count === maxVotes) {
      candidatesWithMax.push(targetId);
    }
  }

  // 1. No votes cast or all abstain
  if (candidatesWithMax.length === 0 || maxVotes === 0) {
    return {
      executedPlayerId: null,
      voteCounts,
      isTie: false,
      abstainCount,
      message: 'Mayoritas warga memilih abstain. Tidak ada yang dieksekusi hari ini.',
    };
  }

  // 2. Tie vote handling (check Scapegoat)
  if (candidatesWithMax.length > 1) {
    // Check if Scapegoat is alive
    const scapegoat = Array.from(players.values()).find((p) => p.alive && p.roleId === 'scapegoat');
    if (scapegoat) {
      return {
        executedPlayerId: scapegoat.id,
        voteCounts,
        isTie: true,
        abstainCount,
        message: `Hasil pemungutan suara seri (${maxVotes} suara). Sesuai takdirnya, Kambing Hitam (${scapegoat.name}) dikorbankan untuk menggantikan para tersangka!`,
      };
    }

    return {
      executedPlayerId: null,
      voteCounts,
      isTie: true,
      abstainCount,
      message: `Hasil pemungutan suara seri (${maxVotes} suara). Berdasarkan hukum desa, tidak ada yang dieksekusi hari ini.`,
    };
  }

  const executedId = candidatesWithMax[0];
  const executedPlayer = players.get(executedId);

  // 3. Village Idiot check (survives execution)
  if (executedPlayer && executedPlayer.roleId === 'village_idiot') {
    executedPlayer.canVote = false;
    executedPlayer.idiotPardoned = true;
    return {
      executedPlayerId: null, // does not die
      pardonedPlayerId: executedPlayer.id,
      voteCounts,
      isTie: false,
      abstainCount,
      message: `${executedPlayer.name} mendapat suara terbanyak, namun diampuni karena ia adalah Orang Bodoh Desa! Ia selamat dari tiang gantungan tetapi kehilangan hak voting.`,
    };
  }

  // 4. Jester execution (haunts 1 guilty voter)
  let hauntedPlayerId: string | null = null;
  if (executedPlayer && executedPlayer.roleId === 'jester') {
    const guiltyVoters = Array.from(votes.values())
      .filter((v) => v.targetId === executedId && v.voterId !== executedId)
      .map((v) => v.voterId);
    if (guiltyVoters.length > 0) {
      hauntedPlayerId = guiltyVoters[Math.floor(Math.random() * guiltyVoters.length)];
    }
  }

  // 5. Elder execution penalty (village is cursed, special village roles lose power)
  let villageCursed = false;
  if (executedPlayer && executedPlayer.roleId === 'elder') {
    villageCursed = true;
  }

  return {
    executedPlayerId: executedId,
    hauntedPlayerId,
    villageCursed,
    voteCounts,
    isTie: false,
    abstainCount,
    message: `${executedPlayer?.name || 'Seorang warga'} mendapat suara terbanyak (${maxVotes} suara) dan dieksekusi di tiang gantungan.${
      hauntedPlayerId ? ' Kutukan sang Badut (Jester) mengincar salah satu pemilihnya!' : ''
    }${villageCursed ? ' Tragedi! Warga telah menggantung Tetua Desa sendiri — desa kini terkutuk!' : ''}`,
  };
}

export function formatPublicVotes(
  votes: Map<string, Vote>,
  players: Map<string, Player>
): PublicVote[] {
  const result: PublicVote[] = [];

  for (const vote of votes.values()) {
    const voter = players.get(vote.voterId);
    if (!voter) continue;

    const target = vote.targetId ? players.get(vote.targetId) : null;
    result.push({
      voterId: voter.id,
      voterName: voter.name,
      targetId: vote.targetId,
      targetName: target ? target.name : 'Abstain',
    });
  }

  return result;
}
