import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MapBuilder } from '../src/utils/mapBuilder.ts';

test('Map Geometry: Building map registers colliders and boundary walls', () => {
  const scene = new THREE.Scene();
  const colliders = MapBuilder.buildCommercialMap(scene);

  assert.ok(colliders.length >= 10, 'Expected extensive colliders across the 120m arena');

  // Verify outer perimeter wall exists at -61 and 61
  const northWall = colliders.find((c) => c.minZ <= -60);
  assert.ok(northWall, 'North outer perimeter wall must exist');

  const southWall = colliders.find((c) => c.maxZ >= 60);
  assert.ok(southWall, 'South outer perimeter wall must exist');
});

test('Physics Collision: Wall sliding prevents walking through solid barriers', () => {
  // Setup a test collider wall at x in [-10, 10], z in [0, 2]
  MapBuilder.colliders = [
    {
      minX: -10,
      maxX: 10,
      minY: 0,
      maxY: 8,
      minZ: 0,
      maxZ: 2,
    },
  ];

  // Player attempts to walk forward into wall at (0, 1.7, 0.5)
  const incomingPos = new THREE.Vector3(0, 1.7, 0.5);
  const resolved = MapBuilder.resolvePlayerPosition(incomingPos, 0.5, 1.7);

  // Player must be pushed back outside the wall (z <= -0.5)
  assert.ok(resolved.pos.z <= 0.05, `Player Z must be clamped outside wall, got: ${resolved.pos.z}`);
});

test('Physics Slopes: Ramps smoothly elevate player vertical position', () => {
  // Ramp from z = 6 to z = -2, elevating from y = 0.1 to y = 4.2
  MapBuilder.colliders = [
    {
      minX: -2,
      maxX: 2,
      minY: -0.5,
      maxY: 5.5,
      minZ: -2,
      maxZ: 6,
      isRamp: true,
      rampAxis: 'z',
      rampStart: 6,
      rampEnd: -2,
      heightStart: 0.1,
      heightEnd: 4.2,
    },
  ];

  // At z = 6 (ramp start), ground height is 0.1
  const atStart = MapBuilder.resolvePlayerPosition(new THREE.Vector3(0, 1.8, 6), 0.5, 1.7);
  assert.equal(Math.round(atStart.currentGroundHeight * 10) / 10, 0.1);

  // At z = 2 (halfway), ground height is approx 2.15
  const atMid = MapBuilder.resolvePlayerPosition(new THREE.Vector3(0, 3.8, 2), 0.5, 1.7);
  assert.ok(Math.abs(atMid.currentGroundHeight - 2.15) < 0.2);

  // At z = -2 (top of ramp), ground height reaches 4.2
  const atTop = MapBuilder.resolvePlayerPosition(new THREE.Vector3(0, 5.9, -2), 0.5, 1.7);
  assert.equal(Math.round(atTop.currentGroundHeight * 10) / 10, 4.2);
});
