import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/server/database.ts';

test('Party & Profile: Squad capacity limits and ready toggles', () => {
  const pId = 'party_test_leader';
  db.seedDefaultPlayer(pId, 'SquadLeader');

  const party = db.getPartyByPlayerId(pId);
  assert.ok(party);
  assert.equal(party.leaderId, pId);
  assert.equal(party.members.length, 1);
  assert.equal(party.maxSize, 5);

  // Add 4 squad members to reach 5/5
  for (let i = 1; i <= 4; i++) {
    party.members.push({
      id: `member_${i}`,
      username: `SquadMate_${i}`,
      level: 15,
      rating: 1300,
      isLeader: false,
      isReady: true,
    });
  }

  assert.equal(party.members.length, 5);
  // Toggle ready on member 1
  party.members[1].isReady = !party.members[1].isReady;
  assert.equal(party.members[1].isReady, false);
});

test('Profile & History: Match history records appended and paginated', () => {
  const pId = 'hist_test_player';
  db.seedDefaultPlayer(pId, 'HistAgent');

  const initial = db.getMatchHistory(pId, 10, 0);
  const initialTotal = initial.total;

  db.addMatchHistory(pId, {
    id: 'test_hist_rec_01',
    date: new Date().toISOString(),
    mode: 'COMPETITIVE',
    mapName: 'Vanguard Facility',
    result: 'VICTORY',
    score: '9 : 4',
    kills: 24,
    deaths: 8,
    assists: 5,
    ratingChange: 28,
    xpEarned: 510,
    durationSeconds: 840,
  });

  const updated = db.getMatchHistory(pId, 10, 0);
  assert.equal(updated.total, initialTotal + 1);
  assert.equal(updated.items[0].id, 'test_hist_rec_01');
  assert.equal(updated.items[0].result, 'VICTORY');
});
