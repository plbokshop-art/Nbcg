import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';
import { matchmaker } from '../src/server/matchmaker.ts';

test('Matchmaking: Queue insertion and duplicate check', () => {
  const playerId = 'test_mm_p1';
  db.seedDefaultPlayer(playerId, 'TesterOne');

  const join1 = matchmaker.enterQueue(playerId, 'TesterOne', 1400, 'COMPETITIVE');
  assert.equal(join1.success, true);

  const join2 = matchmaker.enterQueue(playerId, 'TesterOne', 1400, 'COMPETITIVE');
  assert.equal(join2.success, true);
  assert.equal(join2.message, 'Already in queue');

  const status = matchmaker.getQueueStatus(playerId);
  assert.equal(status.inQueue, true);
  assert.equal(status.mode, 'COMPETITIVE');

  const cancelled = matchmaker.leaveQueue(playerId);
  assert.equal(cancelled, true);

  const afterCancel = matchmaker.getQueueStatus(playerId);
  assert.equal(afterCancel.inQueue, false);
});

test('Matchmaking: Training mode immediately provisions match session', () => {
  const playerId = 'test_training_p1';
  db.seedDefaultPlayer(playerId, 'SoloAgent');

  matchmaker.enterQueue(playerId, 'SoloAgent', 1200, 'TRAINING');
  const status = matchmaker.getQueueStatus(playerId);

  assert.equal(status.inQueue, false);
  assert.ok(status.matchedMatchId);

  const match = db.getMatch(status.matchedMatchId);
  assert.ok(match);
  assert.equal(match.mode, 'TRAINING');
  assert.equal(match.mapName, 'Firing Range & Combat Facility');
});
