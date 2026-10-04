import { GameModeId, MatchHistoryItem, MatchSession, PartyState, PlayerProfile } from '../shared/types.js';

// Server-authoritative in-memory database
class GameDatabase {
  private players: Map<string, PlayerProfile> = new Map();
  private matchHistories: Map<string, MatchHistoryItem[]> = new Map();
  private parties: Map<string, PartyState> = new Map();
  private matches: Map<string, MatchSession> = new Map();
  private settledMatches: Set<string> = new Set(); // Idempotency protection for settlements

  constructor() {
    this.seedDefaultPlayer('vanguard_agent_01', 'GhostOperator');
  }

  public seedDefaultPlayer(id: string, username: string): PlayerProfile {
    const defaultProfile: PlayerProfile = {
      id,
      username,
      level: 24,
      xp: 3450,
      xpToNextLevel: 5000,
      rating: 1420,
      rankTier: 'Gold II',
      coins: 1250,
      vanguardCredits: 4800,
      stats: {
        totalMatches: 48,
        wins: 31,
        losses: 17,
        kills: 842,
        deaths: 512,
        assists: 219,
        headshots: 384,
        mvpCount: 16,
        playTimeMinutes: 720,
      },
      loadout: {
        primaryWeapon: 'vanguard_rifle',
        secondaryWeapon: 'vanguard_pistol',
        meleeWeapon: 'tactical_knife',
        grenade: 'frag_grenade',
        rifleSkin: 'void_shadow',
        suitColor: 'black_ops',
      },
    };

    this.players.set(id, defaultProfile);

    // Initial match history
    const initialHistory: MatchHistoryItem[] = [
      {
        id: 'match_hist_001',
        date: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        mode: 'COMPETITIVE',
        mapName: 'Vanguard Facility',
        result: 'VICTORY',
        score: '9 : 6',
        kills: 22,
        deaths: 11,
        assists: 7,
        ratingChange: 26,
        xpEarned: 450,
        durationSeconds: 980,
      },
      {
        id: 'match_hist_002',
        date: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
        mode: 'COMPETITIVE',
        mapName: 'Sub-Zero Outpost',
        result: 'DEFEAT',
        score: '7 : 9',
        kills: 18,
        deaths: 14,
        assists: 4,
        ratingChange: -18,
        xpEarned: 280,
        durationSeconds: 1120,
      },
      {
        id: 'match_hist_003',
        date: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        mode: 'DEATHMATCH',
        mapName: 'Industrial Yard',
        result: 'VICTORY',
        score: '30 : 22',
        kills: 30,
        deaths: 12,
        assists: 9,
        ratingChange: 15,
        xpEarned: 520,
        durationSeconds: 600,
      },
    ];

    this.matchHistories.set(id, initialHistory);

    // Default Solo Party
    this.parties.set(`party_${id}`, {
      partyId: `party_${id}`,
      leaderId: id,
      members: [
        {
          id,
          username,
          level: 24,
          rating: 1420,
          isLeader: true,
          isReady: true,
        },
      ],
      maxSize: 5,
      selectedMode: 'COMPETITIVE',
    });

    return defaultProfile;
  }

  public getPlayer(id: string): PlayerProfile | undefined {
    return this.players.get(id);
  }

  public updatePlayer(profile: PlayerProfile): void {
    this.players.set(profile.id, profile);
  }

  public getMatchHistory(playerId: string, limit = 10, offset = 0): { items: MatchHistoryItem[]; total: number } {
    const list = this.matchHistories.get(playerId) || [];
    return {
      items: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  public addMatchHistory(playerId: string, record: MatchHistoryItem): void {
    const list = this.matchHistories.get(playerId) || [];
    list.unshift(record);
    this.matchHistories.set(playerId, list);
  }

  public getParty(partyId: string): PartyState | undefined {
    return this.parties.get(partyId);
  }

  public getPartyByPlayerId(playerId: string): PartyState | undefined {
    for (const party of this.parties.values()) {
      if (party.members.some((m) => m.id === playerId)) {
        return party;
      }
    }
    return undefined;
  }

  public setParty(party: PartyState): void {
    this.parties.set(party.partyId, party);
  }

  public deleteParty(partyId: string): void {
    this.parties.delete(partyId);
  }

  public getMatch(matchId: string): MatchSession | undefined {
    return this.matches.get(matchId);
  }

  public setMatch(match: MatchSession): void {
    this.matches.set(match.id, match);
  }

  public isMatchSettled(matchId: string): boolean {
    return this.settledMatches.has(matchId);
  }

  public markMatchSettled(matchId: string): void {
    this.settledMatches.add(matchId);
  }
}

export const db = new GameDatabase();
