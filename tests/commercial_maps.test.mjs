import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MapBuilder } from '../src/utils/mapBuilder.ts';
import { TextureGenerator } from '../src/utils/textures.ts';
import { matchmaker } from '../src/server/matchmaker.ts';
import { TACTICAL_MAPS } from '../src/shared/types.ts';

test('Commercial Maps: Sector-07 generates extensive 140m colliders and bomb sites', () => {
  const scene = new THREE.Scene();
  const colliders = MapBuilder.buildSector07(scene);

  assert.ok(colliders.length >= 20, `Expected >= 20 colliders for Sector-07, got ${colliders.length}`);
  assert.equal(MapBuilder.activeBoundary, 68);

  // Outer boundary walls exist
  const northWall = colliders.find((c) => c.minZ <= -60);
  assert.ok(northWall, 'North outer wall must exist');

  const southWall = colliders.find((c) => c.maxZ >= 60);
  assert.ok(southWall, 'South outer wall must exist');
});

test('Commercial Maps: Outpost Mirage generates 150m desert fortress colliders and colonnade', () => {
  const scene = new THREE.Scene();
  const colliders = MapBuilder.buildMirageDust(scene);

  assert.ok(colliders.length >= 20, `Expected >= 20 colliders for Mirage Dust, got ${colliders.length}`);
  assert.equal(MapBuilder.activeBoundary, 72);

  // Boundary clamping for Mirage (boundary 72)
  const incoming = new THREE.Vector3(120, 1.7, 120);
  const resolved = MapBuilder.resolvePlayerPosition(incoming);
  assert.ok(resolved.pos.x <= 72, `Player X must be clamped to 72, got: ${resolved.pos.x}`);
  assert.ok(resolved.pos.z <= 72, `Player Z must be clamped to 72, got: ${resolved.pos.z}`);
});

test('Commercial Maps: Cyber Hangar generates 160m subterranean base and turbine hall', () => {
  const scene = new THREE.Scene();
  const colliders = MapBuilder.buildCyberHangar(scene);

  assert.ok(colliders.length >= 20, `Expected >= 20 colliders for Cyber Hangar, got ${colliders.length}`);
  assert.equal(MapBuilder.activeBoundary, 78);

  // Boundary clamping for Cyber Hangar (boundary 78)
  const incoming = new THREE.Vector3(-120, 1.7, -120);
  const resolved = MapBuilder.resolvePlayerPosition(incoming);
  assert.ok(resolved.pos.x >= -78, `Player X must be clamped to -78, got: ${resolved.pos.x}`);
  assert.ok(resolved.pos.z >= -78, `Player Z must be clamped to -78, got: ${resolved.pos.z}`);
});

test('Commercial Maps: buildMapById correctly dispatches by mapId string', () => {
  const scene = new THREE.Scene();

  MapBuilder.buildMapById(scene, 'MIRAGE_DUST');
  assert.equal(MapBuilder.activeBoundary, 72);

  MapBuilder.buildMapById(scene, 'CYBER_HANGAR');
  assert.equal(MapBuilder.activeBoundary, 78);

  MapBuilder.buildMapById(scene, 'SECTOR_07');
  assert.equal(MapBuilder.activeBoundary, 68);
});

test('Commercial Maps: Real-time zone callouts detect sites, mid, and connectors', () => {
  const sectorCoords = MapBuilder.getSiteCoordinates('SECTOR_07');

  const calloutA = MapBuilder.getZoneCallout({ x: sectorCoords.siteA.x, z: sectorCoords.siteA.z }, 'SECTOR_07');
  assert.equal(calloutA, 'BOMB SITE A');

  const calloutB = MapBuilder.getZoneCallout({ x: sectorCoords.siteB.x, z: sectorCoords.siteB.z }, 'SECTOR_07');
  assert.equal(calloutB, 'BOMB SITE B');

  const calloutMid = MapBuilder.getZoneCallout({ x: 0, z: 0 }, 'SECTOR_07');
  assert.equal(calloutMid, 'MID COURTYARD');
});

test('Commercial Textures: All procedural PBR texture generators run safely in node/headless', () => {
  const textures = [
    TextureGenerator.createConcreteTiles(),
    TextureGenerator.createMetalWallPanel(),
    TextureGenerator.createHazardStripes(),
    TextureGenerator.createMilitaryCrate('TEST'),
    TextureGenerator.createSignage('TITLE', 'SUBTITLE'),
    TextureGenerator.createDiamondPlate(),
    TextureGenerator.createSandstoneBlocks(),
    TextureGenerator.createWoodenCrate('WOOD'),
    TextureGenerator.createCyberWallPanel(),
    TextureGenerator.createCorrugatedHangarSheet(),
    TextureGenerator.createSiteDecal('A'),
    TextureGenerator.createSiteDecal('B'),
    TextureGenerator.createServerRackTexture(),
    TextureGenerator.createExplosiveBarrelTexture(),
  ];

  textures.forEach((tex, i) => {
    assert.ok(tex instanceof THREE.Texture, `Texture index ${i} must be a valid THREE.Texture instance`);
  });
});

test('Matchmaking: Map selection propagates through queue to match session', () => {
  const playerId = 'agent_map_test_01';
  matchmaker.clearPlayerMatch(playerId);

  const res = matchmaker.enterQueue(
    playerId,
    'CommanderMap',
    1420,
    'COMPETITIVE',
    'EU-Central',
    'MIRAGE_DUST'
  );
  assert.equal(res.success, true);

  // Status returns mapId
  const status = matchmaker.getQueueStatus(playerId);
  assert.equal(status.mapId, 'MIRAGE_DUST');

  // Fast forward match creation with TRAINING mode
  matchmaker.leaveQueue(playerId);
  matchmaker.enterQueue(playerId, 'CommanderMap', 1420, 'TRAINING', 'EU-Central', 'MIRAGE_DUST');
  const trainingStatus = matchmaker.getQueueStatus(playerId);
  assert.ok(trainingStatus.matchedMatchId);
});
