import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';
import { MatchEngine } from '../src/server/matchEngine.ts';

test('Round Lifecycle: State machine transitions BUY -> LIVE -> ROUND_END -> REWARDS -> NEXT BUY', () => {
  const matchId = 'test_match_round_01';
  db.setMatch({
    id: matchId,
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    roundPhase: 'BUY',
    currentRound: 1,
    maxRounds: 17,
    phaseTimerSeconds: 15,
    scoreAlpha: 0,
    scoreOmega: 0,
    players: [
      {
        id: 'p1',
        username: 'Player1',
        team: 'ALPHA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        isAlive: true,
        isBot: false,
        ping: 20,
        selectedWeapon: 'vanguard_rifle',
      },
      {
        id: 'bot1',
        username: 'Bot1',
        team: 'OMEGA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        isAlive: true,
        isBot: true,
        ping: 5,
        selectedWeapon: 'vanguard_rifle',
      },
    ],
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
  });

  // 1. Initial phase is BUY
  let match = db.getMatch(matchId);
  assert.equal(match.roundPhase, 'BUY');

  // Shooting should be rejected in BUY phase
  const shotInBuy = MatchEngine.processAction(matchId, {
    playerId: 'p1',
    action: 'SHOOT',
    targetId: 'bot1',
    damage: 30,
  });
  assert.equal(shotInBuy.success, false);
  assert.match(shotInBuy.message, /only allowed in LIVE phase/);

  // 2. Advance to LIVE
  match = MatchEngine.advancePhase(matchId);
  assert.equal(match.roundPhase, 'LIVE');

  // Shooting should now be accepted
  const shotInLive = MatchEngine.processAction(matchId, {
    playerId: 'p1',
    action: 'SHOOT',
    targetId: 'bot1',
    damage: 40,
    isHeadshot: true,
  });
  assert.equal(shotInLive.success, true);

  // 3. Advance to ROUND_END
  match = MatchEngine.advancePhase(matchId);
  assert.equal(match.roundPhase, 'ROUND_END');

  // 4. Advance to REWARDS
  match = MatchEngine.advancePhase(matchId);
  assert.equal(match.roundPhase, 'REWARDS');

  // 5. Advance to next round (BUY)
  match = MatchEngine.advancePhase(matchId);
  assert.equal(match.roundPhase, 'BUY');
  assert.equal(match.currentRound, 2);
  // Players status reset
  assert.equal(match.players[0].isAlive, true);
  assert.equal(match.players[0].health, 100);
});

test('Round Lifecycle: Match concludes when target rounds reached', () => {
  const matchId = 'test_match_conclude_01';
  db.setMatch({
    id: matchId,
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    roundPhase: 'REWARDS',
    currentRound: 15,
    maxRounds: 17,
    phaseTimerSeconds: 4,
    scoreAlpha: 9, // First to 9 in Competitive
    scoreOmega: 6,
    players: [],
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
  });

  const match = MatchEngine.advancePhase(matchId);
  assert.equal(match.matchEnded, true);
  assert.equal(match.winningTeam, 'ALPHA');
});
