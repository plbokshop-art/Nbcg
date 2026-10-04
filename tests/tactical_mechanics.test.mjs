import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';
import { MatchEngine } from '../src/server/matchEngine.ts';

test('Melee Combat: Frontal slash vs Backstab critical damage', () => {
  const matchId = 'test_knife_match_01';
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
        id: 'knife_p1',
        username: 'Ninja',
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
        selectedWeapon: 'tactical_knife',
      },
      {
        id: 'victim_front',
        username: 'FrontTarget',
        team: 'OMEGA',
        health: 100,
        armor: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        credits: 800,
        isAlive: true,
        isBot: true,
        ping: 10,
        selectedWeapon: 'vanguard_rifle',
      },
      {
        id: 'victim_back',
        username: 'BackTarget',
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
        ping: 10,
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

  // 1. Frontal slash deals 50 DMG
  const frontalRes = MatchEngine.processAction(matchId, {
    playerId: 'knife_p1',
    action: 'KNIFE_SLASH',
    targetId: 'victim_front',
    isBackstab: false,
  });
  assert.equal(frontalRes.success, true);
  const targetFront = db.getMatch(matchId).players.find((p) => p.id === 'victim_front');
  assert.equal(targetFront.health, 50);

  // 2. Backstab deals 100 DMG (instant kill)
  const backstabRes = MatchEngine.processAction(matchId, {
    playerId: 'knife_p1',
    action: 'KNIFE_SLASH',
    targetId: 'victim_back',
    isBackstab: true,
  });
  assert.equal(backstabRes.success, true);
  const targetBack = db.getMatch(matchId).players.find((p) => p.id === 'victim_back');
  assert.equal(targetBack.health, 0);
  assert.equal(targetBack.isAlive, false);
});

test('Combat Simulation: Kevlar armor absorbs 40% of incoming bot damage', () => {
  const matchId = 'test_armor_match_01';
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
        id: 'armored_p1',
        username: 'ArmoredTank',
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

  // Bot inflicts 30 damage on player with 100 HP and 100 Armor
  // 40% absorbed by armor: 12 armor damage, 18 HP damage
  const dmgRes = MatchEngine.processAction(matchId, {
    playerId: 'armored_p1',
    action: 'BOT_DAMAGE',
    damage: 30,
  });
  assert.equal(dmgRes.success, true);

  const player = db.getMatch(matchId).players.find((p) => p.id === 'armored_p1');
  assert.equal(player.armor, 88); // 100 - 12
  assert.equal(player.health, 82); // 100 - 18
});
