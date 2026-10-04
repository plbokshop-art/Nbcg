export type AppState =
  | 'BOOT'
  | 'SESSION'
  | 'LOBBY'
  | 'MATCHMAKING'
  | 'MATCH_FOUND'
  | 'LOADING_GAME'
  | 'IN_GAME'
  | 'MATCH_END'
  | 'RETURNING_TO_LOBBY';

export type GameModeId = 'COMPETITIVE' | 'CASUAL' | 'DEATHMATCH' | 'TRAINING';

export type TacticalMapId = 'SECTOR_07' | 'MIRAGE_DUST' | 'CYBER_HANGAR';

export interface TacticalMapMeta {
  id: TacticalMapId;
  name: string;
  codename: string;
  theme: 'INDUSTRIAL' | 'DESERT' | 'CYBER';
  sizeMeters: string;
  description: string;
  accentColor: string;
  sites: {
    siteA: string;
    siteB: string;
    mid: string;
  };
  callouts: string[];
}

export const TACTICAL_MAPS: Record<TacticalMapId, TacticalMapMeta> = {
  SECTOR_07: {
    id: 'SECTOR_07',
    name: 'Sector-07 // Reactor Lab',
    codename: 'FACILITY_7',
    theme: 'INDUSTRIAL',
    sizeMeters: '140m x 140m',
    description: 'A fortified research reactor complex featuring multi-level catwalks, sniper nests, and central industrial courtyard.',
    accentColor: '#00f0ff',
    sites: {
      siteA: 'Core Reactor Chamber',
      siteB: 'Logistics Depot & Crane',
      mid: 'Central Overpass & Catwalk',
    },
    callouts: ['A-Site', 'A-Short', 'A-Long', 'Catwalk', 'Mid Overpass', 'Underpass', 'B-Site', 'B-Apartments', 'Crane Gantry', 'Alpha Spawn', 'Omega Spawn'],
  },
  MIRAGE_DUST: {
    id: 'MIRAGE_DUST',
    name: 'Outpost Mirage // Dust-X',
    codename: 'MIRAGE_X',
    theme: 'DESERT',
    sizeMeters: '150m x 150m',
    description: 'Arid desert fortress with ancient sandstone arches, sunlit market alleys, underground bunker B-site, and elevated palace perches.',
    accentColor: '#f59e0b',
    sites: {
      siteA: 'Palace Colonnade',
      siteB: 'Underground Munitions Bunker',
      mid: 'Dust Market & Archway',
    },
    callouts: ['A-Palace', 'A-Ramp', 'A-Site', 'Mid Market', 'Mid Doors', 'Catwalk', 'B-Apartments', 'B-Site Bunker', 'Snipers Nest', 'Alpha Base', 'Omega Gate'],
  },
  CYBER_HANGAR: {
    id: 'CYBER_HANGAR',
    name: 'Cyber Hangar // Zero',
    codename: 'HANGAR_ZERO',
    theme: 'CYBER',
    sizeMeters: '160m x 160m',
    description: 'Sub-arctic subterranean stealth hangar housing dual ICBM launch platforms, hydraulic gantries, and neon cyber grid chokepoints.',
    accentColor: '#a855f7',
    sites: {
      siteA: 'Missile Silo Platform',
      siteB: 'Submarine Drydock Bay',
      mid: 'Turbine Generator Hall',
    },
    callouts: ['Silo A', 'Gantry Heaven', 'A-Choke', 'Turbine Mid', 'Steam Pipes', 'Drydock B', 'Crane Bridge', 'Control Room', 'Alpha Staging', 'Omega Command'],
  },
};

export interface GameModeInfo {
  id: GameModeId;
  name: string;
  subtitle: string;
  teamSize: string;
  roundsToWin: number;
  description: string;
  hasEconomy: boolean;
  ranked: boolean;
  active: boolean;
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvpCount: number;
  playTimeMinutes: number;
}

export interface PlayerLoadout {
  primaryWeapon: 'vanguard_rifle' | 'vanguard_smg' | 'vanguard_shotgun';
  secondaryWeapon: 'vanguard_pistol';
  meleeWeapon: 'tactical_knife';
  grenade: 'frag_grenade' | 'smoke_grenade';
  rifleSkin: 'default_tactical' | 'neon_matrix' | 'void_shadow' | 'gold_vanguard';
  suitColor: 'black_ops' | 'arctic_camo' | 'desert_strike' | 'cyber_crimson';
}

export interface PlayerProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rating: number;
  rankTier: string;
  coins: number;
  vanguardCredits: number;
  stats: PlayerStats;
  loadout: PlayerLoadout;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  mode: GameModeId;
  mapName: string;
  result: 'VICTORY' | 'DEFEAT' | 'DRAW';
  score: string;
  kills: number;
  deaths: number;
  assists: number;
  ratingChange: number;
  xpEarned: number;
  durationSeconds: number;
}

export interface PartyMember {
  id: string;
  username: string;
  level: number;
  rating: number;
  isLeader: boolean;
  isReady: boolean;
}

export interface PartyState {
  partyId: string;
  leaderId: string;
  members: PartyMember[];
  maxSize: number;
  selectedMode: GameModeId;
  selectedMap?: TacticalMapId;
}

export interface MatchmakingQueueStatus {
  inQueue: boolean;
  mode: GameModeId;
  region: string;
  mapId?: TacticalMapId;
  searchTimeSeconds: number;
  playersFound: number;
  maxPlayers: number;
  matchedMatchId: string | null;
}

export type RoundPhase = 'BUY' | 'LIVE' | 'ROUND_END' | 'REWARDS';

export interface MatchPlayer {
  id: string;
  username: string;
  team: 'ALPHA' | 'OMEGA';
  health: number;
  armor: number;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  credits: number;
  isAlive: boolean;
  isBot: boolean;
  ping: number;
  selectedWeapon: string;
  hasSpike?: boolean;
  hasDefuseKit?: boolean;
  grenadeCount?: number;
}

export interface SpikeState {
  isPlanted: boolean;
  site: 'A' | 'B' | null;
  planterId: string | null;
  plantedAt: number | null;
  defuseProgress: number; // 0 to 100
  defuserPlayerId: string | null;
  isDetonated: boolean;
  isDefused: boolean;
  pos: { x: number; y: number; z: number };
}

export interface ActiveSmokeCloud {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  spawnedAt: number;
  durationMs: number;
}

export interface MatchSession {
  id: string;
  mode: GameModeId;
  mapId?: TacticalMapId;
  mapName: string;
  roundPhase: RoundPhase;
  currentRound: number;
  maxRounds: number;
  phaseTimerSeconds: number;
  scoreAlpha: number;
  scoreOmega: number;
  players: MatchPlayer[];
  spike: SpikeState;
  activeSmokes: ActiveSmokeCloud[];
  winningTeam: 'ALPHA' | 'OMEGA' | null;
  roundEndReason?: 'ELIMINATION' | 'SPIKE_DETONATED' | 'SPIKE_DEFUSED' | 'TIME_EXPIRED';
  matchEnded: boolean;
  startedAt: number;
  idempotencyToken?: string;
}
