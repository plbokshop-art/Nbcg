import { GameModeId, MatchmakingQueueStatus, MatchPlayer, MatchSession, TacticalMapId, TACTICAL_MAPS } from '../shared/types.js';
import { db } from './database.js';

interface QueuedPlayer {
  playerId: string;
  username: string;
  rating: number;
  mode: GameModeId;
  region: string;
  mapId?: TacticalMapId;
  partyId?: string;
  joinedAt: number;
}

class Matchmaker {
  private queue: Map<string, QueuedPlayer> = new Map();
  private playerMatchMap: Map<string, string> = new Map(); // playerId -> matchId

  public enterQueue(
    playerId: string,
    username: string,
    rating: number,
    mode: GameModeId,
    region = 'EU-Central',
    mapId: TacticalMapId = 'SECTOR_07'
  ): { success: boolean; message: string } {
    if (this.queue.has(playerId)) {
      return { success: true, message: 'Already in queue' };
    }

    // Clear any stale match mapping for this player when joining queue
    const existingMatchId = this.playerMatchMap.get(playerId);
    if (existingMatchId) {
      const match = db.getMatch(existingMatchId);
      if (match && match.matchEnded) {
        this.playerMatchMap.delete(playerId);
      } else {
        // If re-queuing, player explicitly wishes to leave prior match
        this.playerMatchMap.delete(playerId);
      }
    }

    this.queue.set(playerId, {
      playerId,
      username,
      rating,
      mode,
      region,
      mapId,
      joinedAt: Date.now(),
    });

    return { success: true, message: 'Joined matchmaking queue' };
  }

  public leaveQueue(playerId: string): boolean {
    return this.queue.delete(playerId);
  }

  public getQueueStatus(playerId: string): MatchmakingQueueStatus {
    // Check if match already formed
    const matchedMatchId = this.playerMatchMap.get(playerId) || null;
    if (matchedMatchId) {
      const match = db.getMatch(matchedMatchId);
      if (match && match.matchEnded) {
        this.playerMatchMap.delete(playerId);
      } else if (match) {
        return {
          inQueue: false,
          mode: match.mode,
          region: 'EU-Central',
          mapId: match.mapId,
          searchTimeSeconds: 0,
          playersFound: match.players.length,
          maxPlayers: match.players.length,
          matchedMatchId,
        };
      }
    }

    const item = this.queue.get(playerId);
    if (!item) {
      return {
        inQueue: false,
        mode: 'COMPETITIVE',
        region: 'EU-Central',
        searchTimeSeconds: 0,
        playersFound: 0,
        maxPlayers: 10,
        matchedMatchId: null,
      };
    }

    const elapsed = Math.floor((Date.now() - item.joinedAt) / 1000);
    const maxPlayers = item.mode === 'TRAINING' ? 1 : 10;
    
    // Simulate real matchmaking progression
    // In competitive/casual 5v5: 1 player at t=0, 3 at t=2s, 6 at t=4s, 8 at t=6s, 10 at t=8s -> match made!
    let playersFound = Math.min(maxPlayers, Math.floor(1 + (elapsed / 2) * 2.5));
    if (item.mode === 'TRAINING') {
      playersFound = 1;
    }

    if (playersFound >= maxPlayers || elapsed >= 7 || item.mode === 'TRAINING') {
      // Create match!
      const match = this.createMatch(item);
      this.playerMatchMap.set(playerId, match.id);
      this.queue.delete(playerId);

      return {
        inQueue: false,
        mode: item.mode,
        region: item.region,
        mapId: item.mapId,
        searchTimeSeconds: elapsed,
        playersFound: maxPlayers,
        maxPlayers,
        matchedMatchId: match.id,
      };
    }

    return {
      inQueue: true,
      mode: item.mode,
      region: item.region,
      mapId: item.mapId,
      searchTimeSeconds: elapsed,
      playersFound,
      maxPlayers,
      matchedMatchId: null,
    };
  }

  private createMatch(queued: QueuedPlayer): MatchSession {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roundsToWin = queued.mode === 'COMPETITIVE' ? 9 : queued.mode === 'CASUAL' ? 5 : 3;

    // Resolve Map Metadata
    const selectedMapId = queued.mapId || 'SECTOR_07';
    const mapMeta = TACTICAL_MAPS[selectedMapId] || TACTICAL_MAPS.SECTOR_07;
    const mapName = queued.mode === 'TRAINING' ? `${mapMeta.name} // DRILL` : mapMeta.name;

    // Create 5v5 rosters: 5 Alpha, 5 Omega
    const alphaNames = ['Viper', 'Cipher', 'Valkyrie', 'Titan'];
    const omegaNames = ['Reaper', 'Shadow', 'Apex', 'Phantom', 'Wraith'];

    const players: MatchPlayer[] = [
      {
        id: queued.playerId,
        username: queued.username,
        team: 'ALPHA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        isAlive: true,
        isBot: false,
        ping: 18,
        selectedWeapon: 'vanguard_rifle',
        credits: 800,
        hasSpike: true,
        hasDefuseKit: false,
        grenadeCount: 1,
      },
    ];

    if (queued.mode !== 'TRAINING') {
      // 4 Alpha bots
      alphaNames.forEach((name, i) => {
        players.push({
          id: `bot_alpha_${i + 1}`,
          username: `[BOT] ${name}`,
          team: 'ALPHA',
          health: 100,
          armor: 100,
          kills: 0,
          deaths: 0,
          assists: 0,
          score: 0,
          credits: 800,
          isAlive: true,
          isBot: true,
          ping: 5,
          selectedWeapon: i % 2 === 0 ? 'vanguard_rifle' : 'vanguard_smg',
          hasSpike: false,
          hasDefuseKit: false,
          grenadeCount: 1,
        });
      });

      // 5 Omega bots
      omegaNames.forEach((name, i) => {
        players.push({
          id: `bot_omega_${i + 1}`,
          username: `[BOT] ${name}`,
          team: 'OMEGA',
          health: 100,
          armor: 100,
          kills: 0,
          deaths: 0,
          assists: 0,
          score: 0,
          credits: 800,
          isAlive: true,
          isBot: true,
          ping: 12,
          selectedWeapon: i % 2 === 0 ? 'vanguard_rifle' : 'vanguard_shotgun',
          hasSpike: false,
          hasDefuseKit: i === 0,
          grenadeCount: 1,
        });
      });
    } else {
      // Training: 3 target combat dummies
      for (let i = 1; i <= 3; i++) {
        players.push({
          id: `dummy_${i}`,
          username: `Target Drone 0${i}`,
          team: 'OMEGA',
          health: 100,
          armor: 50,
          kills: 0,
          deaths: 0,
          assists: 0,
          score: 0,
          credits: 0,
          isAlive: true,
          isBot: true,
          ping: 1,
          selectedWeapon: 'vanguard_pistol',
        });
      }
    }

    const match: MatchSession = {
      id: matchId,
      mode: queued.mode,
      mapId: selectedMapId,
      mapName,
      roundPhase: 'BUY',
      currentRound: 1,
      maxRounds: roundsToWin * 2 - 1,
      phaseTimerSeconds: 15,
      scoreAlpha: 0,
      scoreOmega: 0,
      players,
      spike: {
        isPlanted: false,
        site: null,
        planterId: null,
        plantedAt: null,
        defuseProgress: 0,
        defuserPlayerId: null,
        isDetonated: false,
        isDefused: false,
        pos: { x: 0, y: 0, z: 0 },
      },
      activeSmokes: [],
      winningTeam: null,
      matchEnded: false,
      startedAt: Date.now(),
      idempotencyToken: `token_${matchId}`,
    };

    db.setMatch(match);
    return match;
  }

  public clearPlayerMatch(playerId: string): void {
    this.playerMatchMap.delete(playerId);
  }
}

export const matchmaker = new Matchmaker();
