import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';
import { MatchEngine } from '../src/server/matchEngine.ts';

test('Spike Mechanics: Alpha plants spike on Site A, starts 45s countdown', () => {
  const matchId = 'test_spike_plant_01';
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
        id: 'alpha_p1',
        username: 'AlphaAgent',
        team: 'ALPHA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        credits: 800,
        isAlive: true,
        isBot: false,
        ping: 15,
        selectedWeapon: 'vanguard_rifle',
      },
      {
        id: 'omega_p1',
        username: 'OmegaAgent',
        team: 'OMEGA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        credits: 800,
        isAlive: true,
        isBot: false,
        ping: 15,
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

  // 1. Plant Spike on Site A
  const plantRes = MatchEngine.processAction(matchId, {
    playerId: 'alpha_p1',
    action: 'PLANT_SPIKE',
    site: 'A',
    pos: { x: -15, y: 0.1, z: -15 },
  });

  assert.equal(plantRes.success, true);
  assert.equal(plantRes.match.spike.isPlanted, true);
  assert.equal(plantRes.match.spike.site, 'A');
  assert.equal(plantRes.match.phaseTimerSeconds, 45); // Reset to 45s countdown

  // 2. Omega Defuses Spike
  const defuseRes1 = MatchEngine.processAction(matchId, {
    playerId: 'omega_p1',
    action: 'DEFUSE_SPIKE',
  });
  assert.equal(defuseRes1.success, true);
  assert.equal(defuseRes1.match.spike.defuseProgress, 25);

  // Complete defusal
  MatchEngine.processAction(matchId, { playerId: 'omega_p1', action: 'DEFUSE_SPIKE' });
  MatchEngine.processAction(matchId, { playerId: 'omega_p1', action: 'DEFUSE_SPIKE' });
  const finalDefuse = MatchEngine.processAction(matchId, { playerId: 'omega_p1', action: 'DEFUSE_SPIKE' });

  assert.equal(finalDefuse.match.spike.isDefused, true);
  assert.equal(finalDefuse.match.scoreOmega, 1); // Omega won the round!
  assert.equal(finalDefuse.match.roundEndReason, 'SPIKE_DEFUSED');
});

test('Spike Detonation: Expiration of 45s timer grants Alpha round win', () => {
  const matchId = 'test_spike_detonate_01';
  db.setMatch({
    id: matchId,
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    roundPhase: 'LIVE',
    currentRound: 1,
    maxRounds: 17,
    phaseTimerSeconds: 45,
    scoreAlpha: 0,
    scoreOmega: 0,
    players: [],
    spike: {
      isPlanted: true,
      site: 'B',
      planterId: 'alpha_p1',
      plantedAt: Date.now() - 46000, // 46 seconds ago
      defuseProgress: 0,
      defuserPlayerId: null,
      isDetonated: false,
      isDefused: false,
      pos: { x: 15, y: 0.1, z: -15 },
    },
    activeSmokes: [],
    winningTeam: null,
    matchEnded: false,
    startedAt: Date.now(),
  });

  const match = MatchEngine.advancePhase(matchId);
  assert.equal(match.spike.isDetonated, true);
  assert.equal(match.scoreAlpha, 1);
  assert.equal(match.roundEndReason, 'SPIKE_DETONATED');
});

test('Tactical Grenades: Smoke creates volumetric cloud & blocks Line-of-Sight', () => {
  const matchId = 'test_smoke_los_01';
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
        id: 'thrower_1',
        username: 'Thrower',
        team: 'ALPHA',
        health: 100,
        armor: 100,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        credits: 800,
        isAlive: true,
        isBot: false,
        ping: 15,
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

  // Deploy smoke at (0, 0)
  const throwRes = MatchEngine.processAction(matchId, {
    playerId: 'thrower_1',
    action: 'THROW_GRENADE',
    grenadeType: 'SMOKE',
    pos: { x: 0, y: 0.1, z: 0 },
  });

  assert.equal(throwRes.success, true);
  assert.equal(throwRes.match.activeSmokes.length, 1);
  assert.equal(throwRes.match.activeSmokes[0].radius, 4.5);

  // Line of sight from (-10, 0) to (10, 0) passes directly through smoke at (0, 0)
  const isOccluded = MatchEngine.checkSmokeOcclusion(-10, 0, 10, 0, throwRes.match.activeSmokes);
  assert.equal(isOccluded, true);

  // Line of sight far away from smoke (e.g. at z = 20) should NOT be occluded
  const notOccluded = MatchEngine.checkSmokeOcclusion(-10, 20, 10, 20, throwRes.match.activeSmokes);
  assert.equal(notOccluded, false);
});
