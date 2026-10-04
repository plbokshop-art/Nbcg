import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';
import { MatchEngine } from '../src/server/matchEngine.ts';

test('Security & Idempotency: Multiple MATCH_END requests result in single settlement', () => {
  const playerId = 'security_agent_01';
  db.seedDefaultPlayer(playerId, 'SecAgent');

  const initialProfile = db.getPlayer(playerId);
  const initialMatches = initialProfile.stats.totalMatches;
  const initialRating = initialProfile.rating;
  const initialCoins = initialProfile.coins;

  const matchId = 'security_match_100';
  db.setMatch({
    id: matchId,
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    roundPhase: 'ROUND_END',
    currentRound: 15,
    maxRounds: 17,
    phaseTimerSeconds: 0,
    scoreAlpha: 9,
    scoreOmega: 6,
    players: [
      {
        id: playerId,
        username: 'SecAgent',
        team: 'ALPHA',
        health: 100,
        armor: 100,
        kills: 16,
        deaths: 8,
        assists: 4,
        score: 1600,
        isAlive: true,
        isBot: false,
        ping: 15,
        selectedWeapon: 'vanguard_rifle',
      },
    ],
    winningTeam: 'ALPHA',
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
    matchEnded: true,
    startedAt: Date.now() - 600000,
  });

  // Call 1: First Settlement
  const settle1 = MatchEngine.settleMatch(matchId, playerId, 'nonce_123');
  assert.equal(settle1.success, true);
  assert.equal(settle1.isDuplicate, false);

  const updatedProfile1 = db.getPlayer(playerId);
  assert.equal(updatedProfile1.stats.totalMatches, initialMatches + 1);
  assert.ok(updatedProfile1.rating > initialRating);
  assert.ok(updatedProfile1.coins > initialCoins);

  // Call 2: Duplicate / Replayed Settlement with same matchId
  const settle2 = MatchEngine.settleMatch(matchId, playerId, 'nonce_123');
  assert.equal(settle2.success, true);
  assert.equal(settle2.isDuplicate, true); // Marked as duplicate!

  // Profile must NOT have been modified a second time!
  const updatedProfile2 = db.getPlayer(playerId);
  assert.equal(updatedProfile2.stats.totalMatches, initialMatches + 1);
  assert.equal(updatedProfile2.rating, updatedProfile1.rating);
  assert.equal(updatedProfile2.coins, updatedProfile1.coins);
});

test('Anti-Cheat: Dead players cannot fire or inflict damage', () => {
  const matchId = 'security_match_dead_fire';
  db.setMatch({
    id: matchId,
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    roundPhase: 'LIVE',
    currentRound: 1,
    maxRounds: 17,
    phaseTimerSeconds: 80,
    scoreAlpha: 0,
    scoreOmega: 0,
    players: [
      {
        id: 'dead_p1',
        username: 'DeadPlayer',
        team: 'ALPHA',
        health: 0,
        armor: 0,
        kills: 0,
        deaths: 1,
        assists: 0,
        score: 0,
        isAlive: false, // DEAD
        isBot: false,
        ping: 20,
        selectedWeapon: 'vanguard_rifle',
      },
      {
        id: 'alive_target',
        username: 'Target',
        team: 'OMEGA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        isAlive: true,
        isBot: true,
        ping: 10,
        selectedWeapon: 'vanguard_rifle',
      },
    ],
    winningTeam: null,
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
    matchEnded: false,
    startedAt: Date.now(),
  });

  const res = MatchEngine.processAction(matchId, {
    playerId: 'dead_p1',
    action: 'SHOOT',
    targetId: 'alive_target',
    damage: 100,
  });

  assert.equal(res.success, false);
  assert.match(res.message, /Dead players cannot shoot/);

  // Target must remain untouched
  const target = db.getMatch(matchId).players.find((p) => p.id === 'alive_target');
  assert.equal(target.health, 100);
});
