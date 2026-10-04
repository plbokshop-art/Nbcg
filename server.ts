import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/database.js';
import { MatchEngine } from './src/server/matchEngine.js';
import { matchmaker } from './src/server/matchmaker.js';
import { GameModeId, TacticalMapId, TACTICAL_MAPS } from './src/shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: 'v0.20.0-lobby-alpha', timestamp: Date.now() });
});

// Session & Profile
app.get('/api/session', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || 'vanguard_agent_01';
  let profile = db.getPlayer(playerId);
  if (!profile) {
    profile = db.seedDefaultPlayer(playerId, 'VanguardAgent');
  }
  res.json({ success: true, profile });
});

app.post('/api/profile/loadout', (req: Request, res: Response) => {
  const { playerId, loadout } = req.body;
  const profile = db.getPlayer(playerId || 'vanguard_agent_01');
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Player not found' });
  }
  profile.loadout = { ...profile.loadout, ...loadout };
  db.updatePlayer(profile);
  res.json({ success: true, loadout: profile.loadout });
});

app.get('/api/profile/history', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || 'vanguard_agent_01';
  const limit = Number(req.query.limit) || 10;
  const offset = Number(req.query.offset) || 0;
  const result = db.getMatchHistory(playerId, limit, offset);
  res.json({ success: true, ...result });
});

// Party Management
app.get('/api/party', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || 'vanguard_agent_01';
  let party = db.getPartyByPlayerId(playerId);
  if (!party) {
    party = {
      partyId: `party_${playerId}`,
      leaderId: playerId,
      members: [
        {
          id: playerId,
          username: db.getPlayer(playerId)?.username || 'Agent',
          level: db.getPlayer(playerId)?.level || 1,
          rating: db.getPlayer(playerId)?.rating || 1000,
          isLeader: true,
          isReady: true,
        },
      ],
      maxSize: 5,
      selectedMode: 'COMPETITIVE',
    };
    db.setParty(party);
  }
  res.json({ success: true, party });
});

app.post('/api/party/ready', (req: Request, res: Response) => {
  const { playerId, isReady } = req.body;
  const party = db.getPartyByPlayerId(playerId || 'vanguard_agent_01');
  if (!party) {
    return res.status(404).json({ success: false, error: 'Party not found' });
  }
  const member = party.members.find((m) => m.id === playerId);
  if (member) {
    member.isReady = typeof isReady === 'boolean' ? isReady : !member.isReady;
  }
  db.setParty(party);
  res.json({ success: true, party });
});

app.post('/api/party/mode', (req: Request, res: Response) => {
  const { playerId, mode } = req.body;
  const party = db.getPartyByPlayerId(playerId || 'vanguard_agent_01');
  if (!party) {
    return res.status(404).json({ success: false, error: 'Party not found' });
  }
  if (party.leaderId !== playerId) {
    return res.status(403).json({ success: false, error: 'Only party leader can set mode' });
  }
  party.selectedMode = mode as GameModeId;
  db.setParty(party);
  res.json({ success: true, party });
});

app.post('/api/party/invite', (req: Request, res: Response) => {
  const { playerId, friendName } = req.body;
  const party = db.getPartyByPlayerId(playerId || 'vanguard_agent_01');
  if (!party) {
    return res.status(404).json({ success: false, error: 'Party not found' });
  }
  if (party.members.length >= party.maxSize) {
    return res.status(400).json({ success: false, error: 'Party is full (5/5)' });
  }

  const simulatedId = `agent_${Date.now()}`;
  party.members.push({
    id: simulatedId,
    username: friendName || `Vanguard_${party.members.length + 1}`,
    level: Math.floor(Math.random() * 30) + 10,
    rating: 1350 + Math.floor(Math.random() * 200),
    isLeader: false,
    isReady: true,
  });

  db.setParty(party);
  res.json({ success: true, party });
});

app.post('/api/party/leave', (req: Request, res: Response) => {
  const { playerId } = req.body;
  const party = db.getPartyByPlayerId(playerId || 'vanguard_agent_01');
  if (party) {
    party.members = party.members.filter((m) => m.id !== playerId);
    if (party.members.length === 0) {
      db.deleteParty(party.partyId);
    } else {
      if (party.leaderId === playerId) {
        party.leaderId = party.members[0].id;
        party.members[0].isLeader = true;
      }
      db.setParty(party);
    }
  }

  // Create new solo party
  const newParty = {
    partyId: `party_${playerId}`,
    leaderId: playerId,
    members: [
      {
        id: playerId,
        username: db.getPlayer(playerId)?.username || 'Agent',
        level: db.getPlayer(playerId)?.level || 1,
        rating: db.getPlayer(playerId)?.rating || 1000,
        isLeader: true,
        isReady: true,
      },
    ],
    maxSize: 5,
    selectedMode: 'COMPETITIVE' as GameModeId,
  };
  db.setParty(newParty);
  res.json({ success: true, party: newParty });
});

// Matchmaking
app.get('/api/maps', (_req: Request, res: Response) => {
  res.json({ success: true, maps: Object.values(TACTICAL_MAPS) });
});

app.post('/api/matchmaking/queue', (req: Request, res: Response) => {
  const { playerId, mode, region, mapId } = req.body;
  const profile = db.getPlayer(playerId || 'vanguard_agent_01');
  if (!profile) {
    return res.status(404).json({ success: false, error: 'Player profile not found' });
  }

  const result = matchmaker.enterQueue(
    profile.id,
    profile.username,
    profile.rating,
    mode || 'COMPETITIVE',
    region || 'EU-Central',
    mapId || 'SECTOR_07'
  );

  res.json(result);
});

app.delete('/api/matchmaking/queue', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || (req.body.playerId as string) || 'vanguard_agent_01';
  const left = matchmaker.leaveQueue(playerId);
  matchmaker.clearPlayerMatch(playerId);
  res.json({ success: true, cancelled: left });
});

app.post('/api/matchmaking/leave-match', (req: Request, res: Response) => {
  const { playerId, matchId } = req.body;
  if (playerId) {
    matchmaker.clearPlayerMatch(playerId);
    matchmaker.leaveQueue(playerId);
  }
  if (matchId) {
    const match = db.getMatch(matchId);
    if (match) {
      match.matchEnded = true;
      db.setMatch(match);
    }
  }
  res.json({ success: true });
});

app.get('/api/matchmaking/status', (req: Request, res: Response) => {
  const playerId = (req.query.playerId as string) || 'vanguard_agent_01';
  const status = matchmaker.getQueueStatus(playerId);
  res.json({ success: true, status });
});

// Matches
app.get('/api/matches/:id', (req: Request, res: Response) => {
  const match = db.getMatch(req.params.id);
  if (!match) {
    return res.status(404).json({ success: false, error: 'Match not found' });
  }
  res.json({ success: true, match });
});

app.post('/api/matches/:id/action', (req: Request, res: Response) => {
  try {
    const result = MatchEngine.processAction(req.params.id, req.body);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

app.post('/api/matches/:id/advance', (req: Request, res: Response) => {
  try {
    const match = MatchEngine.advancePhase(req.params.id);
    res.json({ success: true, match });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

app.post('/api/matches/:id/end', (req: Request, res: Response) => {
  try {
    const { playerId, idempotencyToken } = req.body;
    const result = MatchEngine.settleMatch(
      req.params.id,
      playerId || 'vanguard_agent_01',
      idempotencyToken
    );
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, error: message });
  }
});

// Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Project Vanguard] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
