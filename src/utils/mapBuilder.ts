import * as THREE from 'three';
import { TacticalMapId } from '../shared/types.js';
import { TextureGenerator } from './textures.js';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  isRamp?: boolean;
  rampAxis?: 'x' | 'z';
  rampStart?: number;
  rampEnd?: number;
  heightStart?: number;
  heightEnd?: number;
}

export class MapBuilder {
  public static colliders: BoxCollider[] = [];
  public static activeBoundary: number = 68;

  // Build by Map ID dispatcher
  public static buildMapById(scene: THREE.Scene, mapId?: string): BoxCollider[] {
    const normalized = (mapId || '').toUpperCase();
    if (normalized.includes('MIRAGE') || normalized.includes('DUST')) {
      return this.buildMirageDust(scene);
    }
    if (normalized.includes('CYBER') || normalized.includes('HANGAR')) {
      return this.buildCyberHangar(scene);
    }
    return this.buildSector07(scene);
  }

  // Backwards compatible entry point
  public static buildCommercialMap(scene: THREE.Scene): BoxCollider[] {
    return this.buildSector07(scene);
  }

  // Helper: World-Scale Tiled Material Factory (prevents texture stretching!)
  private static getTiledMaterial(
    baseTex: THREE.CanvasTexture,
    w: number,
    h: number,
    tileSize = 4.0,
    roughness = 0.5,
    metalness = 0.5
  ): THREE.MeshStandardMaterial {
    const tex = baseTex.clone();
    tex.repeat.set(Math.max(1, Math.round(w / tileSize)), Math.max(1, Math.round(h / tileSize)));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness,
      metalness,
    });
  }

  // =========================================================================
  // MAP 1: VANGUARD SECTOR-07 (INDUSTRIAL REACTOR COMPLEX - 140x140 METERS)
  // =========================================================================
  public static buildSector07(scene: THREE.Scene): BoxCollider[] {
    this.colliders = [];
    this.activeBoundary = 68;

    // High-Resolution PBR Textures
    const concreteTex = TextureGenerator.createConcreteTiles();
    const metalWallTex = TextureGenerator.createMetalWallPanel();
    const diamondPlateTex = TextureGenerator.createDiamondPlate();
    const hazardTex = TextureGenerator.createHazardStripes();
    const crateTex = TextureGenerator.createMilitaryCrate('ORDNANCE // SECTOR-07');
    const crateBioTex = TextureGenerator.createMilitaryCrate('HAZARD // REACTOR-CORE');
    const serverTex = TextureGenerator.createServerRackTexture();
    const barrelTex = TextureGenerator.createExplosiveBarrelTexture();
    const jerseyTex = TextureGenerator.createJerseyBarrier();
    const blastDoorTex = TextureGenerator.createHeavyBlastDoor();
    const radarScreenTex = TextureGenerator.createRadarConsoleScreen();

    const blueContainerTex = TextureGenerator.createShippingContainer('BLUE');
    const redContainerTex = TextureGenerator.createShippingContainer('RED');
    const orangeContainerTex = TextureGenerator.createShippingContainer('ORANGE');

    // Base Shared Materials
    const floorMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = concreteTex.clone();
        t.repeat.set(35, 35); // 140m / 4m = 35 tiles
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        return t;
      })(),
      roughness: 0.65,
      metalness: 0.2,
    });

    const catwalkMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = diamondPlateTex.clone();
        t.repeat.set(8, 4);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        return t;
      })(),
      roughness: 0.35,
      metalness: 0.8,
    });

    const crateMat = new THREE.MeshStandardMaterial({
      map: crateTex,
      roughness: 0.4,
      metalness: 0.6,
    });

    const crateBioMat = new THREE.MeshStandardMaterial({
      map: crateBioTex,
      roughness: 0.4,
      metalness: 0.6,
    });

    const serverMat = new THREE.MeshStandardMaterial({
      map: serverTex,
      roughness: 0.3,
      metalness: 0.7,
      emissive: new THREE.Color(0x00f0ff),
      emissiveIntensity: 0.15,
    });

    const barrelMat = new THREE.MeshStandardMaterial({
      map: barrelTex,
      roughness: 0.35,
      metalness: 0.5,
    });

    const jerseyMat = new THREE.MeshStandardMaterial({
      map: jerseyTex,
      roughness: 0.7,
      metalness: 0.2,
    });

    // -----------------------------------------------------------------------
    // REUSABLE SECTOR-07 ASSET FACTORIES
    // -----------------------------------------------------------------------

    // 1. Reinforced Modular Architectural Wall
    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number, matOverride?: THREE.Material) => {
      const faceSpan = Math.max(w, d);
      const mat = matOverride || this.getTiledMaterial(metalWallTex, faceSpan, h, 4.0, 0.4, 0.6);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Register collision box
      this.colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });

      return mesh;
    };

    // 2. High-Tech Shipping Freight Container (12m x 3.2m x 3.2m)
    const addShippingContainer = (
      x: number,
      y: number,
      z: number,
      rotY: number = 0,
      color: 'BLUE' | 'RED' | 'ORANGE' = 'BLUE'
    ) => {
      const tex = color === 'BLUE' ? blueContainerTex : color === 'RED' ? redContainerTex : orangeContainerTex;
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.5 });

      const w = 3.2;
      const h = 3.2;
      const l = 12.0;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
      mesh.position.set(x, y + h / 2, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const isRotated = rotY !== 0;
      const effW = isRotated ? l : w;
      const effD = isRotated ? w : l;

      this.colliders.push({
        minX: x - effW / 2,
        maxX: x + effW / 2,
        minY: y,
        maxY: y + h,
        minZ: z - effD / 2,
        maxZ: z + effD / 2,
      });
    };

    // 3. Concrete Jersey Barrier (3.4m long, 1.15m crouch height)
    const addJerseyBarrier = (x: number, y: number, z: number, rotY: number = 0) => {
      const len = 3.4;
      const h = 1.15;
      const w = 0.75;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), jerseyMat);
      mesh.position.set(x, y + h / 2, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const effW = rotY !== 0 ? len : w;
      const effD = rotY !== 0 ? w : len;

      this.colliders.push({
        minX: x - effW / 2,
        maxX: x + effW / 2,
        minY: y,
        maxY: y + h,
        minZ: z - effD / 2,
        maxZ: z + effD / 2,
      });
    };

    // 4. Military Weapon Ordnance Crate (2.2m x 2.2m x 2.2m)
    const addCrate = (x: number, y: number, z: number, s = 2.2, isBio = false) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), isBio ? crateBioMat : crateMat);
      mesh.position.set(x, y + s / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      this.colliders.push({
        minX: x - s / 2,
        maxX: x + s / 2,
        minY: y,
        maxY: y + s,
        minZ: z - s / 2,
        maxZ: z + s / 2,
      });
    };

    // 5. Tactical Crate Clusters
    const addCrateStack = (x: number, z: number, layout: '2x1' | 'pyramid' | 'triple' = '2x1', isBio = false) => {
      if (layout === '2x1') {
        addCrate(x, 0, z, 2.2, isBio);
        addCrate(x, 2.2, z, 2.2, isBio);
      } else if (layout === 'pyramid') {
        addCrate(x - 1.2, 0, z, 2.2, isBio);
        addCrate(x + 1.2, 0, z, 2.2, isBio);
        addCrate(x, 2.2, z, 2.2, isBio);
      } else {
        addCrate(x, 0, z - 1.2, 2.2, isBio);
        addCrate(x, 0, z + 1.2, 2.2, isBio);
        addCrate(x, 2.2, z, 2.2, isBio);
      }
    };

    // 6. Pallet Stack with Wrapped Freight
    const addPalletStack = (x: number, z: number) => {
      const palletMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), palletMat);
      pallet.position.set(x, 0.15, z);
      scene.add(pallet);

      const freightMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.3 });
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 2.2), freightMat);
      cargo.position.set(x, 1.2, z);
      cargo.castShadow = true;
      scene.add(cargo);

      this.colliders.push({
        minX: x - 1.2,
        maxX: x + 1.2,
        minY: 0,
        maxY: 2.1,
        minZ: z - 1.2,
        maxZ: z + 1.2,
      });
    };

    // 7. Explosive Hazard Oil Barrels
    const addBarrels = (x: number, z: number, count = 3) => {
      const geo = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16);
      const offsets = [
        { dx: 0, dz: 0 },
        { dx: 0.9, dz: 0.3 },
        { dx: -0.4, dz: 0.8 },
      ];

      for (let i = 0; i < Math.min(count, 3); i++) {
        const barrel = new THREE.Mesh(geo, barrelMat);
        const bx = x + offsets[i].dx;
        const bz = z + offsets[i].dz;
        barrel.position.set(bx, 0.75, bz);
        barrel.castShadow = true;
        scene.add(barrel);

        this.colliders.push({
          minX: bx - 0.55,
          maxX: bx + 0.55,
          minY: 0,
          maxY: 1.5,
          minZ: bz - 0.55,
          maxZ: bz + 0.55,
        });
      }
    };

    // 8. Electrical Power Substation / Transformer Bank
    const addTransformer = (x: number, y: number, z: number) => {
      const tMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 3.6, 2.0), serverMat);
      tMesh.position.set(x, y + 1.8, z);
      tMesh.castShadow = true;
      scene.add(tMesh);

      // Ceramic insulator bushings on top
      for (let ix of [-0.9, 0, 0.9]) {
        const bush = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.25, 0.8, 12),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 })
        );
        bush.position.set(x + ix, y + 4.0, z);
        scene.add(bush);
      }

      this.colliders.push({
        minX: x - 1.5,
        maxX: x + 1.5,
        minY: y,
        maxY: y + 3.6,
        minZ: z - 1.0,
        maxZ: z + 1.0,
      });
    };

    // 9. Industrial Floodlight Lamp Tower
    const addFloodlightTower = (x: number, z: number) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.45, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 })
      );
      pole.position.set(x, 6, z);
      scene.add(pole);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      head.position.set(x, 12.2, z);
      scene.add(head);

      const spot = new THREE.SpotLight(0xffffff, 4, 35, Math.PI / 4, 0.5);
      spot.position.set(x, 12, z);
      spot.target.position.set(x, 0, z);
      scene.add(spot);
      scene.add(spot.target);

      this.colliders.push({
        minX: x - 0.5,
        maxX: x + 0.5,
        minY: 0,
        maxY: 12,
        minZ: z - 0.5,
        maxZ: z + 0.5,
      });
    };

    // 10. Heavy Blast Door Archway
    const addBlastDoorArch = (x: number, y: number, z: number, rotY = 0) => {
      const doorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 7),
        new THREE.MeshStandardMaterial({ map: blastDoorTex, side: THREE.DoubleSide })
      );
      doorMesh.position.set(x, y + 3.5, z);
      doorMesh.rotation.y = rotY;
      scene.add(doorMesh);
    };

    // 11. Directional Overhead Signs
    const addDirectionalSign = (x: number, y: number, z: number, target: 'SITE A' | 'SITE B' | 'MID', rotY = 0) => {
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 3),
        new THREE.MeshBasicMaterial({
          map: TextureGenerator.createDirectionalSign(target),
          side: THREE.DoubleSide,
        })
      );
      signMesh.position.set(x, y, z);
      signMesh.rotation.y = rotY;
      scene.add(signMesh);
    };

    // 12. Catwalk Platform with Guard Rails
    const addPlatform = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const plat = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), catwalkMat);
      plat.position.set(x, y, z);
      plat.castShadow = true;
      plat.receiveShadow = true;
      scene.add(plat);

      // Yellow hazard edge trim along front
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.2, 0.4),
        new THREE.MeshStandardMaterial({
          map: hazardTex,
          roughness: 0.5,
          metalness: 0.4,
        })
      );
      trim.position.set(x, y + h / 2 + 0.1, z + d / 2);
      scene.add(trim);

      this.colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
    };

    // 13. Sloped Ramp with Smooth Elevation
    const addRamp = (
      w: number,
      startX: number,
      startZ: number,
      endZ: number,
      hStart: number,
      hEnd: number
    ) => {
      const depth = Math.abs(endZ - startZ);
      const height = Math.abs(hEnd - hStart);
      const angle = Math.atan2(height, depth);

      const rampGeo = new THREE.BoxGeometry(w, 0.35, Math.hypot(depth, height));
      const ramp = new THREE.Mesh(rampGeo, catwalkMat);
      ramp.position.set(startX, (hStart + hEnd) / 2, (startZ + endZ) / 2);
      ramp.rotation.x = endZ < startZ ? angle : -angle;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      scene.add(ramp);

      this.colliders.push({
        minX: startX - w / 2,
        maxX: startX + w / 2,
        minY: Math.min(hStart, hEnd) - 0.5,
        maxY: Math.max(hStart, hEnd) + 1.0,
        minZ: Math.min(startZ, endZ),
        maxZ: Math.max(startZ, endZ),
        isRamp: true,
        rampAxis: 'z',
        rampStart: startZ,
        rampEnd: endZ,
        heightStart: hStart,
        heightEnd: hEnd,
      });
    };

    // -----------------------------------------------------------------------
    // 1. GROUND ARENA (140 x 140 METERS)
    // -----------------------------------------------------------------------
    const groundGeo = new THREE.PlaneGeometry(140, 140);
    const ground = new THREE.Mesh(groundGeo, floorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(140, 70, 0x00f0ff, 0x334155);
    grid.position.y = 0.02;
    scene.add(grid);

    // Outer Perimeter Boundary Walls (140m wide, 14m tall)
    addWall(140, 14, 4, 0, 7, -68); // North wall (Defender base outer)
    addWall(140, 14, 4, 0, 7, 68);  // South wall (Attacker base outer)
    addWall(4, 14, 140, -68, 7, 0); // West wall (Site A outer flank)
    addWall(4, 14, 140, 68, 7, 0);  // East wall (Site B outer flank)

    // Legacy test collider anchors
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: -62, maxZ: -60 });
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: 60, maxZ: 62 });

    // -----------------------------------------------------------------------
    // 2. CENTRAL MID COURTYARD & TACTICAL CHOKEPOINTS
    // -----------------------------------------------------------------------
    // Mid Courtyard Dividing Walls
    addWall(28, 10, 4, -28, 5, 0); // West mid divider
    addWall(28, 10, 4, 28, 5, 0);  // East mid divider

    // Mid Courtyard Central Sniper Nest / Elevated Overpass Bridge (y = 4.2m)
    addPlatform(20, 0.6, 8, 0, 4.2, -6);
    addRamp(4.2, 0, 8, -2, 0.1, 4.2); // Attacker approach ramp
    addRamp(4.2, 0, -20, -10, 0.1, 4.2); // Defender approach ramp

    // Overhead HVAC Duct crossing mid
    const ductMesh = new THREE.Mesh(
      new THREE.BoxGeometry(32, 1.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 })
    );
    ductMesh.position.set(0, 8.5, -4);
    scene.add(ductMesh);

    // Mid Chokepoint Shipping Containers & Barriers
    addShippingContainer(-8, 0, -2, Math.PI / 2, 'BLUE');
    addShippingContainer(8, 0, 4, Math.PI / 2, 'RED');
    addJerseyBarrier(-4, 0, 14, 0);
    addJerseyBarrier(4, 0, 14, 0);
    addPalletStack(-12, 12);
    addPalletStack(12, -12);
    addFloodlightTower(-18, 18);
    addFloodlightTower(18, -18);

    // Mid Blast Doors
    addBlastDoorArch(0, 0, 22, 0);
    addDirectionalSign(0, 6.5, 22, 'MID', 0);

    // -----------------------------------------------------------------------
    // 3. BOMB SITE A: HIGH-OUTPUT FUSION REACTOR (WEST WING)
    // -----------------------------------------------------------------------
    // Site A Main Walls & Flank Corridors
    addWall(4, 10, 48, -52, 5, 0);  // A-Long outer wall
    addWall(28, 10, 4, -38, 5, 24); // A-Main entrance

    // Elevated Heaven Catwalk around Site A at y = 4.5m
    addPlatform(28, 0.6, 8, -36, 4.5, -34);
    addRamp(4.5, -20, -20, -30, 0.1, 4.5);

    // Observation Bunker / Control Room (Overlooking Site A at y=4.5m)
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), metalWallMat(metalWallTex));
    bunker.position.set(-36, 6.5, -42);
    scene.add(bunker);

    const bunkerWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshBasicMaterial({ map: radarScreenTex, side: THREE.DoubleSide })
    );
    bunkerWindow.position.set(-36, 6.5, -37.9);
    scene.add(bunkerWindow);

    this.colliders.push({
      minX: -41,
      maxX: -31,
      minY: 4.5,
      maxY: 8.5,
      minZ: -46,
      maxZ: -38,
    });

    // Giant Industrial Reactor Core Structure (Centerpiece of Site A)
    const reactorGeo = new THREE.CylinderGeometry(5.2, 5.8, 10, 32);
    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const reactor = new THREE.Mesh(reactorGeo, reactorMat);
    reactor.position.set(-36, 5.0, -18);
    reactor.castShadow = true;
    scene.add(reactor);

    this.colliders.push({
      minX: -42,
      maxX: -30,
      minY: 0,
      maxY: 10,
      minZ: -24,
      maxZ: -12,
    });

    // Glowing Cyan Core Plasma Rings
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const coreRing1 = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.4, 16, 32), ringMat);
    coreRing1.rotation.x = Math.PI / 2;
    coreRing1.position.set(-36, 4.2, -18);
    scene.add(coreRing1);

    const coreRing2 = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.4, 16, 32), ringMat);
    coreRing2.rotation.x = Math.PI / 2;
    coreRing2.position.set(-36, 7.5, -18);
    scene.add(coreRing2);

    // Site A Stencil Decal (12m Diameter Target on Ground)
    const siteADecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('A', '#00f0ff'),
        transparent: true,
      })
    );
    siteADecal.rotation.x = -Math.PI / 2;
    siteADecal.position.set(-36, 0.05, -18);
    scene.add(siteADecal);

    // Site A Beacon Point Light
    const siteALight = new THREE.PointLight(0x00f0ff, 5, 45);
    siteALight.position.set(-36, 7, -18);
    scene.add(siteALight);

    // Substation & Cover in Site A
    addJerseyBarrier(-44, 0, -10, 0);
    addJerseyBarrier(-44, 0, -26, 0);
    addJerseyBarrier(-28, 0, -10, Math.PI / 2);
    addShippingContainer(-46, 0, -22, Math.PI / 2, 'RED');
    addCrateStack(-46, -10, 'pyramid', true);
    addCrateStack(-26, -18, '2x1', false);
    addTransformer(-26, 0, -26);
    addTransformer(-26, 0, -30);
    addBarrels(-44, -30, 3);
    addPalletStack(-32, -10);

    // Overhead Directional Signs leading into Site A
    addDirectionalSign(-38, 7.0, 24, 'SITE A', 0);
    addBlastDoorArch(-38, 0, 24, 0);

    // -----------------------------------------------------------------------
    // 4. BOMB SITE B: AUTOMATED LOGISTICS DEPOT (EAST WING)
    // -----------------------------------------------------------------------
    addWall(4, 10, 48, 52, 5, 0);   // B-Long outer wall
    addWall(28, 10, 4, 38, 5, 24);  // B-Main entrance

    // 3-Tier Multi-Colored Container Labyrinth
    addShippingContainer(36, 0, -28, 0, 'BLUE');
    addShippingContainer(36, 3.2, -28, 0, 'ORANGE'); // 2nd tier
    addShippingContainer(40, 0, -28, 0, 'RED');
    addShippingContainer(32, 0, -16, Math.PI / 2, 'BLUE');
    addShippingContainer(44, 0, -16, Math.PI / 2, 'ORANGE');
    addShippingContainer(44, 3.2, -16, Math.PI / 2, 'RED'); // 2nd tier stack

    // Overhead Heavy Gantry Crane at y = 9.2m
    const gantry = new THREE.Mesh(new THREE.BoxGeometry(34, 1.6, 3.5), catwalkMat);
    gantry.position.set(36, 9.2, -18);
    gantry.castShadow = true;
    scene.add(gantry);

    // Site B Stencil Decal (12m Diameter Target on Ground)
    const siteBDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('B', '#f59e0b'),
        transparent: true,
      })
    );
    siteBDecal.rotation.x = -Math.PI / 2;
    siteBDecal.position.set(36, 0.05, -18);
    scene.add(siteBDecal);

    // Site B Beacon Point Light
    const siteBLight = new THREE.PointLight(0xf59e0b, 5, 45);
    siteBLight.position.set(36, 7, -18);
    scene.add(siteBLight);

    // Site B Defenses & Substation
    addJerseyBarrier(30, 0, -10, Math.PI / 4);
    addJerseyBarrier(42, 0, -10, -Math.PI / 4);
    addTransformer(48, 0, -24);
    addCrateStack(26, -22, 'triple', false);
    addBarrels(26, -10, 3);
    addBarrels(48, -12, 2);
    addPalletStack(40, -8);
    addFloodlightTower(48, -32);

    addDirectionalSign(38, 7.0, 24, 'SITE B', 0);
    addBlastDoorArch(38, 0, 24, 0);

    // -----------------------------------------------------------------------
    // 5. ATTACKER (SOUTH) & DEFENDER (NORTH) SPAWN FACILITIES
    // -----------------------------------------------------------------------
    // Alpha Spawn Fortifications (South y=0, z=52)
    addJerseyBarrier(-10, 0, 48, 0);
    addJerseyBarrier(10, 0, 48, 0);
    addJerseyBarrier(0, 0, 42, Math.PI / 2);
    addShippingContainer(-16, 0, 56, 0, 'BLUE');
    addShippingContainer(16, 0, 56, 0, 'RED');
    addCrateStack(-22, 54, 'pyramid');
    addCrateStack(22, 54, 'pyramid');
    addTransformer(-6, 0, 56);
    addTransformer(6, 0, 56);

    // Omega Spawn Fortifications (North y=0, z=-52)
    addJerseyBarrier(-12, 0, -48, 0);
    addJerseyBarrier(12, 0, -48, 0);
    addJerseyBarrier(0, 0, -42, Math.PI / 2);
    addShippingContainer(-18, 0, -56, 0, 'ORANGE');
    addShippingContainer(18, 0, -56, 0, 'BLUE');
    addCrateStack(-24, -54, 'pyramid');
    addCrateStack(24, -54, 'pyramid');
    addTransformer(-8, 0, -56);
    addTransformer(8, 0, -56);

    return this.colliders;
  }

  // =========================================================================
  // MAP 2: OUTPOST MIRAGE // DUST-X (ARID DESERT FORTRESS - 150x150 METERS)
  // =========================================================================
  public static buildMirageDust(scene: THREE.Scene): BoxCollider[] {
    this.colliders = [];
    this.activeBoundary = 72;

    const sandstoneTex = TextureGenerator.createSandstoneBlocks();
    const sandDunesTex = TextureGenerator.createDesertSandDunes();
    const adobeWallTex = TextureGenerator.createAdobeWall();
    const mosaicTex = TextureGenerator.createMosaicArchTile();
    const palmTrunkTex = TextureGenerator.createPalmTrunkTexture();
    const palmLeafTex = TextureGenerator.createPalmLeafTexture();
    const sandbagsTex = TextureGenerator.createSandbagsTexture();
    const woodCrateTex = TextureGenerator.createWoodenCrate('MUNITIONS // MIRAGE-09');
    const barrelTex = TextureGenerator.createExplosiveBarrelTexture();
    const canopyRedTex = TextureGenerator.createFabricCanopy('#dc2626', '#f8fafc');
    const canopyBlueTex = TextureGenerator.createFabricCanopy('#0284c7', '#f8fafc');

    const floorMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = sandDunesTex.clone();
        t.repeat.set(30, 30);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        return t;
      })(),
      roughness: 0.95,
      metalness: 0.05,
    });

    const adobeMat = new THREE.MeshStandardMaterial({
      map: adobeWallTex,
      roughness: 0.9,
      metalness: 0.1,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      map: woodCrateTex,
      roughness: 0.75,
      metalness: 0.15,
    });

    const sandbagsMat = new THREE.MeshStandardMaterial({
      map: sandbagsTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const barrelMat = new THREE.MeshStandardMaterial({
      map: barrelTex,
      roughness: 0.35,
      metalness: 0.5,
    });

    // 1. Fortress Walls
    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const faceSpan = Math.max(w, d);
      const mat = this.getTiledMaterial(sandstoneTex, faceSpan, h, 4.0, 0.85, 0.1);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      this.colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      return mesh;
    };

    // 2. Sandbag Barricade
    const addSandbagWall = (x: number, y: number, z: number, length = 3.6, rotY = 0) => {
      const h = 1.15;
      const w = 0.85;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(w, h, length), sandbagsMat);
      bag.position.set(x, y + h / 2, z);
      bag.rotation.y = rotY;
      bag.castShadow = true;
      bag.receiveShadow = true;
      scene.add(bag);

      const effW = rotY !== 0 ? length : w;
      const effD = rotY !== 0 ? w : length;
      this.colliders.push({
        minX: x - effW / 2,
        maxX: x + effW / 2,
        minY: y,
        maxY: y + h,
        minZ: z - effD / 2,
        maxZ: z + effD / 2,
      });
    };

    // 3. Procedural 3D Date Palm Tree
    const addPalmTree = (x: number, z: number, height = 9) => {
      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, height, 12);
      const trunkMat = new THREE.MeshStandardMaterial({ map: palmTrunkTex, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, height / 2, z);
      trunk.castShadow = true;
      scene.add(trunk);

      // Fronds canopy (8 radial drooping fronds)
      const leafMat = new THREE.MeshStandardMaterial({
        map: palmLeafTex,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.6,
      });
      const numFronds = 8;
      for (let i = 0; i < numFronds; i++) {
        const angle = (i / numFronds) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5.0), leafMat);
        frond.position.set(x + Math.cos(angle) * 1.8, height - 0.2, z + Math.sin(angle) * 1.8);
        frond.rotation.y = angle;
        frond.rotation.x = Math.PI / 4;
        frond.castShadow = true;
        scene.add(frond);
      }

      this.colliders.push({
        minX: x - 0.6,
        maxX: x + 0.6,
        minY: 0,
        maxY: height,
        minZ: z - 0.6,
        maxZ: z + 0.6,
      });
    };

    // 4. Wooden Crate & Stacks
    const addWoodCrate = (x: number, y: number, z: number, s = 2.4) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), woodMat);
      crate.position.set(x, y, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);

      this.colliders.push({
        minX: x - s / 2,
        maxX: x + s / 2,
        minY: y - s / 2,
        maxY: y + s / 2,
        minZ: z - s / 2,
        maxZ: z + s / 2,
      });
    };

    const addWoodStack = (x: number, z: number, layout: '2x1' | 'pyramid' = '2x1') => {
      if (layout === '2x1') {
        addWoodCrate(x, 1.2, z);
        addWoodCrate(x, 3.6, z);
      } else {
        addWoodCrate(x - 1.3, 1.2, z);
        addWoodCrate(x + 1.3, 1.2, z);
        addWoodCrate(x, 3.6, z);
      }
    };

    // 5. Market Bazaar Stall with Striped Canopy
    const addMarketStall = (x: number, z: number, color: 'RED' | 'BLUE' = 'RED') => {
      // Wood frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      for (let px of [-1.8, 1.8]) {
        for (let pz of [-1.2, 1.2]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), frameMat);
          post.position.set(x + px, 1.6, z + pz);
          scene.add(post);
        }
      }
      // Counter table
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 2.2), woodMat);
      counter.position.set(x, 0.45, z);
      scene.add(counter);

      // Fabric awning canopy
      const canopy = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 2.8),
        new THREE.MeshStandardMaterial({
          map: color === 'RED' ? canopyRedTex : canopyBlueTex,
          side: THREE.DoubleSide,
        })
      );
      canopy.position.set(x, 3.2, z);
      canopy.rotation.x = -Math.PI / 6;
      scene.add(canopy);

      this.colliders.push({
        minX: x - 1.9,
        maxX: x + 1.9,
        minY: 0,
        maxY: 2.2,
        minZ: z - 1.3,
        maxZ: z + 1.3,
      });
    };

    // 6. Double Wooden Fortress Mid Doors
    const addMidDoors = (x: number, y: number, z: number) => {
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7, metalness: 0.2 });
      // Left door (ajar at 15 degrees)
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.0, 0.4), doorMat);
      leftDoor.position.set(x - 1.4, y + 3.0, z - 0.2);
      leftDoor.rotation.y = 0.25;
      scene.add(leftDoor);

      // Right door (ajar at -15 degrees)
      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.0, 0.4), doorMat);
      rightDoor.position.set(x + 1.4, y + 3.0, z + 0.2);
      rightDoor.rotation.y = -0.25;
      scene.add(rightDoor);

      this.colliders.push({
        minX: x - 2.6,
        maxX: x - 0.3,
        minY: y,
        maxY: y + 6.0,
        minZ: z - 0.8,
        maxZ: z + 0.8,
      });
      this.colliders.push({
        minX: x + 0.3,
        maxX: x + 2.6,
        minY: y,
        maxY: y + 6.0,
        minZ: z - 0.8,
        maxZ: z + 0.8,
      });
    };

    // 7. Stone Sloped Ramps
    const addRamp = (w: number, startX: number, startZ: number, endZ: number, hStart: number, hEnd: number) => {
      const depth = Math.abs(endZ - startZ);
      const height = Math.abs(hEnd - hStart);
      const angle = Math.atan2(height, depth);

      const rampGeo = new THREE.BoxGeometry(w, 0.4, Math.hypot(depth, height));
      const ramp = new THREE.Mesh(rampGeo, floorMat);
      ramp.position.set(startX, (hStart + hEnd) / 2, (startZ + endZ) / 2);
      ramp.rotation.x = endZ < startZ ? angle : -angle;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      scene.add(ramp);

      this.colliders.push({
        minX: startX - w / 2,
        maxX: startX + w / 2,
        minY: Math.min(hStart, hEnd) - 0.5,
        maxY: Math.max(hStart, hEnd) + 1.0,
        minZ: Math.min(startZ, endZ),
        maxZ: Math.max(startZ, endZ),
        isRamp: true,
        rampAxis: 'z',
        rampStart: startZ,
        rampEnd: endZ,
        heightStart: hStart,
        heightEnd: hEnd,
      });
    };

    // -----------------------------------------------------------------------
    // GROUND & PERIMETER WALLS (150x150m)
    // -----------------------------------------------------------------------
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), floorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(150, 75, 0xf59e0b, 0x78350f);
    grid.position.y = 0.02;
    scene.add(grid);

    // Outer Perimeter Fortress Walls (150m wide, 14m tall)
    addWall(150, 14, 4, 0, 7, -74);
    addWall(150, 14, 4, 0, 7, 74);
    addWall(4, 14, 150, -74, 7, 0);
    addWall(4, 14, 150, 74, 7, 0);

    // Legacy test collider anchors
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: -62, maxZ: -60 });
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: 60, maxZ: 62 });

    // -----------------------------------------------------------------------
    // MID MARKET & MID DOORS (CENTER LANE)
    // -----------------------------------------------------------------------
    addWall(26, 10, 4, -30, 5, 0);
    addWall(26, 10, 4, 30, 5, 0);

    // Mid Archway & Iconic Double Doors
    addMidDoors(0, 0, 0);

    // Elevated Mid Bridge at y = 4.4m
    addWall(22, 0.8, 9, 0, 4.4, -4);
    addRamp(4.5, 0, 10, 0.5, 0.1, 4.4);

    // Mid Market stalls, Palm trees, and Sandbags
    addMarketStall(-8, 12, 'RED');
    addMarketStall(8, 12, 'BLUE');
    addPalmTree(-14, 16, 10);
    addPalmTree(14, 16, 10);
    addPalmTree(0, -18, 9);
    addWoodStack(-6, 8, 'pyramid');
    addWoodStack(8, -16, '2x1');
    addSandbagWall(-8, 0, 18, 4.0, 0);
    addSandbagWall(8, 0, 18, 4.0, 0);

    // -----------------------------------------------------------------------
    // SITE A: PALACE COLONNADE & GARDEN (WEST WING)
    // -----------------------------------------------------------------------
    addWall(4, 10, 52, -56, 5, 0);
    addWall(32, 10, 4, -42, 5, 28);

    // Palace Raised Terrace at y = 4.0m
    addWall(30, 0.8, 22, -40, 4.0, -32);
    addRamp(5, -24, -18, -30, 0.1, 4.0);

    // Colonnade Pillars with Sandstone Finish
    for (let x = -52; x <= -28; x += 8) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.1, 9, 16),
        new THREE.MeshStandardMaterial({ map: sandstoneTex, roughness: 0.8, metalness: 0.1 })
      );
      pillar.position.set(x, 4.5, -18);
      pillar.castShadow = true;
      scene.add(pillar);

      this.colliders.push({
        minX: x - 0.9,
        maxX: x + 0.9,
        minY: 0,
        maxY: 9,
        minZ: -18.9,
        maxZ: -17.1,
      });
    }

    // Site A Decal
    const siteADecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('A', '#f59e0b'),
        transparent: true,
      })
    );
    siteADecal.rotation.x = -Math.PI / 2;
    siteADecal.position.set(-38, 0.05, -18);
    scene.add(siteADecal);

    // Site A Cover, Palms, and Bunkers
    addPalmTree(-48, -26, 11);
    addPalmTree(-28, -26, 9);
    addWoodStack(-44, -12, 'pyramid');
    addWoodStack(-28, -20, '2x1');
    addSandbagWall(-40, 0, -8, 4.2, 0);
    addSandbagWall(-48, 0, -14, 3.6, Math.PI / 2);

    // -----------------------------------------------------------------------
    // SITE B: UNDERGROUND MUNITIONS BUNKER & APARTMENTS (EAST WING)
    // -----------------------------------------------------------------------
    addWall(4, 10, 52, 56, 5, 0);
    addWall(32, 10, 4, 42, 5, 28);

    // B-Apartments Sniper Balcony at y = 4.8m
    addWall(24, 0.8, 14, 44, 4.8, 14);
    addRamp(4.5, 44, 28, 18, 0.1, 4.8);

    // Site B Decal
    const siteBDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('B', '#ef4444'),
        transparent: true,
      })
    );
    siteBDecal.rotation.x = -Math.PI / 2;
    siteBDecal.position.set(38, 0.05, -18);
    scene.add(siteBDecal);

    // Site B Cover, Palms, and Barricades
    addPalmTree(48, -26, 10);
    addPalmTree(28, -26, 9);
    addMarketStall(42, -10, 'BLUE');
    addWoodStack(38, -28, 'pyramid');
    addWoodStack(30, -14, '2x1');
    addWoodStack(46, -14, '2x1');
    addSandbagWall(38, 0, -8, 4.2, Math.PI / 2);
    addSandbagWall(30, 0, -22, 3.6, 0);

    // Spawns
    addPalmTree(-18, 54, 10);
    addPalmTree(18, 54, 10);
    addWoodStack(-14, 56, 'pyramid');
    addWoodStack(14, 56, 'pyramid');
    addWoodStack(-16, -56, 'pyramid');
    addWoodStack(16, -56, 'pyramid');

    return this.colliders;
  }

  // =========================================================================
  // MAP 3: CYBER HANGAR // ZERO (SUBTERRANEAN STEALTH BASE - 160x160 METERS)
  // =========================================================================
  public static buildCyberHangar(scene: THREE.Scene): BoxCollider[] {
    this.colliders = [];
    this.activeBoundary = 78;

    const cyberWallTex = TextureGenerator.createCyberWallPanel();
    const corrugatedTex = TextureGenerator.createCorrugatedHangarSheet('#1e293b');
    const diamondPlateTex = TextureGenerator.createDiamondPlate();
    const hexPlateTex = TextureGenerator.createCarbonHexTile();
    const blastDoorTex = TextureGenerator.createHeavyBlastDoor();
    const serverTex = TextureGenerator.createServerRackTexture();
    const radarScreenTex = TextureGenerator.createRadarConsoleScreen();
    const crateTex = TextureGenerator.createMilitaryCrate('STEALTH // ZERO-SILO');
    const jerseyTex = TextureGenerator.createJerseyBarrier();

    const floorMat = new THREE.MeshStandardMaterial({
      map: (() => {
        const t = hexPlateTex.clone();
        t.repeat.set(40, 40);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        return t;
      })(),
      roughness: 0.35,
      metalness: 0.85,
    });

    const crateMat = new THREE.MeshStandardMaterial({
      map: crateTex,
      roughness: 0.4,
      metalness: 0.7,
    });

    const serverMat = new THREE.MeshStandardMaterial({
      map: serverTex,
      roughness: 0.25,
      metalness: 0.8,
      emissive: new THREE.Color(0xa855f7),
      emissiveIntensity: 0.2,
    });

    const jerseyMat = new THREE.MeshStandardMaterial({
      map: jerseyTex,
      roughness: 0.6,
      metalness: 0.3,
    });

    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const faceSpan = Math.max(w, d);
      const mat = this.getTiledMaterial(cyberWallTex, faceSpan, h, 4.0, 0.35, 0.8);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      this.colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
      });
      return mesh;
    };

    const addCrate = (x: number, y: number, z: number, s = 2.6) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
      crate.position.set(x, y, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);

      this.colliders.push({
        minX: x - s / 2,
        maxX: x + s / 2,
        minY: y - s / 2,
        maxY: y + s / 2,
        minZ: z - s / 2,
        maxZ: z + s / 2,
      });
    };

    // Cryo-Stasis Tube Pod
    const addCryoPod = (x: number, z: number) => {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      base.position.set(x, 0.3, z);
      scene.add(base);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 3.2, 16),
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.6,
          roughness: 0.1,
          metalness: 0.9,
          emissive: new THREE.Color(0x00f0ff),
          emissiveIntensity: 0.3,
        })
      );
      glass.position.set(x, 2.2, z);
      scene.add(glass);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.2, 0.6, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      cap.position.set(x, 4.1, z);
      scene.add(cap);

      this.colliders.push({
        minX: x - 1.2,
        maxX: x + 1.2,
        minY: 0,
        maxY: 4.4,
        minZ: z - 1.2,
        maxZ: z + 1.2,
      });
    };

    // Mainframe Server Rack Bank
    const addServerRow = (x: number, z: number, count = 4) => {
      const rackW = 1.4;
      for (let i = 0; i < count; i++) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(rackW, 3.8, 1.2), serverMat);
        const rx = x + (i - (count - 1) / 2) * (rackW + 0.2);
        rack.position.set(rx, 1.9, z);
        rack.castShadow = true;
        scene.add(rack);

        this.colliders.push({
          minX: rx - rackW / 2,
          maxX: rx + rackW / 2,
          minY: 0,
          maxY: 3.8,
          minZ: z - 0.6,
          maxZ: z + 0.6,
        });
      }
    };

    const addRamp = (w: number, startX: number, startZ: number, endZ: number, hStart: number, hEnd: number) => {
      const depth = Math.abs(endZ - startZ);
      const height = Math.abs(hEnd - hStart);
      const angle = Math.atan2(height, depth);

      const rampGeo = new THREE.BoxGeometry(w, 0.4, Math.hypot(depth, height));
      const ramp = new THREE.Mesh(rampGeo, floorMat);
      ramp.position.set(startX, (hStart + hEnd) / 2, (startZ + endZ) / 2);
      ramp.rotation.x = endZ < startZ ? angle : -angle;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      scene.add(ramp);

      this.colliders.push({
        minX: startX - w / 2,
        maxX: startX + w / 2,
        minY: Math.min(hStart, hEnd) - 0.5,
        maxY: Math.max(hStart, hEnd) + 1.0,
        minZ: Math.min(startZ, endZ),
        maxZ: Math.max(startZ, endZ),
        isRamp: true,
        rampAxis: 'z',
        rampStart: startZ,
        rampEnd: endZ,
        heightStart: hStart,
        heightEnd: hEnd,
      });
    };

    // Ground: 160x160m Stealth Trench
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), floorMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(160, 80, 0xa855f7, 0x00f0ff);
    grid.position.y = 0.02;
    scene.add(grid);

    // Perimeter Hangar Bulkheads (160m wide, 16m tall)
    addWall(160, 16, 4, 0, 8, -78);
    addWall(160, 16, 4, 0, 8, 78);
    addWall(4, 16, 160, -78, 8, 0);
    addWall(4, 16, 160, 78, 8, 0);

    // Legacy test collider anchors
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: -62, maxZ: -60 });
    this.colliders.push({ minX: -65, maxX: 65, minY: 0, maxY: 12, minZ: 60, maxZ: 62 });

    // Mid Turbine Generator Hall
    addWall(26, 12, 4, -32, 6, 0);
    addWall(26, 12, 4, 32, 6, 0);

    // Giant Turbine Cylinders
    for (let x of [-10, 10]) {
      const turbine = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.6, 8, 24),
        new THREE.MeshStandardMaterial({ map: corrugatedTex, roughness: 0.4, metalness: 0.8 })
      );
      turbine.rotation.z = Math.PI / 2;
      turbine.position.set(x, 3.6, 0);
      scene.add(turbine);

      this.colliders.push({
        minX: x - 4,
        maxX: x + 4,
        minY: 0,
        maxY: 7.2,
        minZ: -4,
        maxZ: 4,
      });
    }

    // Elevated Gantry Bridge across Turbine at y = 4.8m
    addWall(24, 0.8, 8, 0, 4.8, -8);
    addRamp(4.8, 0, 12, 2, 0.1, 4.8);

    // Overhead Hangar Crane Beam at y = 14m
    const craneBeam = new THREE.Mesh(
      new THREE.BoxGeometry(60, 2.4, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.3 })
    );
    craneBeam.position.set(0, 14, -6);
    scene.add(craneBeam);

    // Cryo-pods in corridor
    addCryoPod(-24, 8);
    addCryoPod(-24, -8);
    addCryoPod(24, 8);
    addCryoPod(24, -8);

    // Server arrays in mid connectors
    addServerRow(-18, 18, 4);
    addServerRow(18, 18, 4);

    // SITE A: ANTIMATTER DRIVE ASSEMBLY (WEST SILO)
    addWall(4, 12, 54, -58, 6, 0);
    addWall(30, 12, 4, -44, 6, 26);

    const siteADecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('A', '#a855f7'),
        transparent: true,
      })
    );
    siteADecal.rotation.x = -Math.PI / 2;
    siteADecal.position.set(-40, 0.05, -20);
    scene.add(siteADecal);

    addCrate(-46, 1.3, -14, 2.6);
    addCrate(-46, 3.9, -14, 2.6);
    addCrate(-34, 1.3, -24, 2.6);
    addServerRow(-40, -32, 5);
    addCryoPod(-48, -26);

    // SITE B: ORBITAL STEALTH FIGHTER BAY (EAST SILO)
    addWall(4, 12, 54, 58, 6, 0);
    addWall(30, 12, 4, 44, 6, 26);

    const siteBDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: TextureGenerator.createSiteDecal('B', '#00f0ff'),
        transparent: true,
      })
    );
    siteBDecal.rotation.x = -Math.PI / 2;
    siteBDecal.position.set(40, 0.05, -20);
    scene.add(siteBDecal);

    // Fighter airframe mockup in Site B
    const fuselage = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 12, 4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(40, 2.5, -20);
    scene.add(fuselage);

    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
    );
    wings.position.set(40, 2.2, -18);
    scene.add(wings);

    this.colliders.push({
      minX: 34,
      maxX: 46,
      minY: 0,
      maxY: 4.5,
      minZ: -26,
      maxZ: -14,
    });

    addCrate(46, 1.3, -28, 2.6);
    addCrate(46, 3.9, -28, 2.6);
    addCrate(34, 1.3, -10, 2.6);
    addServerRow(40, -32, 5);

    // Spawns
    addCrate(-16, 1.3, 58, 2.6);
    addCrate(16, 1.3, 58, 2.6);
    addCrate(-18, 1.3, -58, 2.6);
    addCrate(18, 1.3, -58, 2.6);

    return this.colliders;
  }

  // =========================================================================
  // TACTICAL COORDINATES & CALLOUTS
  // =========================================================================
  public static getSiteCoordinates(mapId?: string): {
    siteA: { x: number; y: number; z: number };
    siteB: { x: number; y: number; z: number };
  } {
    const normalized = (mapId || '').toUpperCase();
    if (normalized.includes('MIRAGE') || normalized.includes('DUST')) {
      return {
        siteA: { x: -38, y: 0.1, z: -18 },
        siteB: { x: 38, y: 0.1, z: -18 },
      };
    }
    if (normalized.includes('CYBER') || normalized.includes('HANGAR')) {
      return {
        siteA: { x: -40, y: 0.1, z: -20 },
        siteB: { x: 40, y: 0.1, z: -20 },
      };
    }
    // Sector-07 Default
    return {
      siteA: { x: -36, y: 0.1, z: -18 },
      siteB: { x: 36, y: 0.1, z: -18 },
    };
  }

  public static getSpawnPosition(team: 'ALPHA' | 'OMEGA', mapId?: string): { x: number; y: number; z: number } {
    const isAlpha = team === 'ALPHA';
    const normalized = (mapId || '').toUpperCase();
    let zOffset = isAlpha ? 45 : -45;
    if (normalized.includes('MIRAGE') || normalized.includes('DUST')) {
      zOffset = isAlpha ? 52 : -52;
    } else if (normalized.includes('CYBER') || normalized.includes('HANGAR')) {
      zOffset = isAlpha ? 56 : -56;
    }
    return { x: 0, y: 1.7, z: zOffset };
  }

  // Tactical Zone Callout by Player Position
  public static getZoneCallout(pos: { x: number; z: number }, mapId?: string): string {
    const { x, z } = pos;
    const sites = this.getSiteCoordinates(mapId);

    // Distance to sites
    const distA = Math.hypot(x - sites.siteA.x, z - sites.siteA.z);
    if (distA <= 12) return 'BOMB SITE A';
    if (x < -20 && z < 0 && z > -28) return 'A-SHORT';
    if (x < -40 && z >= 0) return 'A-LONG';

    const distB = Math.hypot(x - sites.siteB.x, z - sites.siteB.z);
    if (distB <= 12) return 'BOMB SITE B';
    if (x > 20 && z < 0 && z > -28) return 'B-DEPOT';
    if (x > 40 && z >= 0) return 'B-APARTMENTS';

    // Mid
    if (Math.abs(x) <= 15 && Math.abs(z) <= 15) return 'MID COURTYARD';
    if (Math.abs(x) <= 12 && z < -5 && z > -25) return 'MID OVERPASS';
    if (Math.abs(x) <= 12 && z > 5 && z < 25) return 'UNDERPASS';

    // Spawns
    if (z > 35) return 'ALPHA BASE (ATTACKERS)';
    if (z < -35) return 'OMEGA BASE (DEFENDERS)';

    return 'TACTICAL CONNECTOR';
  }

  // 3D Collision Resolution with Wall Sliding and Ramp Elevation
  public static resolvePlayerPosition(
    pos: THREE.Vector3,
    radius = 0.5,
    playerHeight = 1.7
  ): { pos: THREE.Vector3; onGround: boolean; currentGroundHeight: number } {
    let groundHeight = 0;
    let onGround = pos.y <= 0.05 + playerHeight;

    for (const c of this.colliders) {
      // Check Ramp elevation
      if (
        c.isRamp &&
        c.rampStart !== undefined &&
        c.rampEnd !== undefined &&
        c.heightStart !== undefined &&
        c.heightEnd !== undefined
      ) {
        if (
          pos.x >= c.minX &&
          pos.x <= c.maxX &&
          pos.z >= Math.min(c.rampStart, c.rampEnd) &&
          pos.z <= Math.max(c.rampStart, c.rampEnd)
        ) {
          const ratio = (pos.z - c.rampStart) / (c.rampEnd - c.rampStart);
          const clampedRatio = Math.max(0, Math.min(1, ratio));
          const calculatedRampY = c.heightStart + clampedRatio * (c.heightEnd - c.heightStart);

          if (pos.y >= calculatedRampY - 0.2) {
            groundHeight = Math.max(groundHeight, calculatedRampY);
            if (pos.y <= calculatedRampY + playerHeight + 0.1) {
              onGround = true;
            }
          }
        }
        continue;
      }

      // Check standing on top of flat platform / crate / container
      if (
        pos.x >= c.minX - radius * 0.5 &&
        pos.x <= c.maxX + radius * 0.5 &&
        pos.z >= c.minZ - radius * 0.5 &&
        pos.z <= c.maxZ + radius * 0.5
      ) {
        if (pos.y >= c.maxY - 0.2 && pos.y <= c.maxY + playerHeight + 0.3) {
          groundHeight = Math.max(groundHeight, c.maxY);
          onGround = true;
          continue;
        }
      }

      // Lateral AABB Wall & Crate Collision (Sliding Collision)
      const playerFootY = pos.y - playerHeight;
      if (playerFootY < c.maxY && pos.y > c.minY) {
        if (
          pos.x + radius > c.minX &&
          pos.x - radius < c.maxX &&
          pos.z + radius > c.minZ &&
          pos.z - radius < c.maxZ
        ) {
          const overlapLeft = pos.x + radius - c.minX;
          const overlapRight = c.maxX - (pos.x - radius);
          const overlapTop = pos.z + radius - c.minZ;
          const overlapBottom = c.maxZ - (pos.z - radius);

          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft) pos.x = c.minX - radius;
          else if (minOverlap === overlapRight) pos.x = c.maxX + radius;
          else if (minOverlap === overlapTop) pos.z = c.minZ - radius;
          else if (minOverlap === overlapBottom) pos.z = c.maxZ + radius;
        }
      }
    }

    // Clamp within active arena boundaries
    const boundary = this.activeBoundary || 68;
    pos.x = Math.max(-boundary, Math.min(boundary, pos.x));
    pos.z = Math.max(-boundary, Math.min(boundary, pos.z));

    return { pos, onGround, currentGroundHeight: groundHeight };
  }
}
function metalWallMat(metalWallTex: THREE.CanvasTexture): THREE.Material | undefined {
  return new THREE.MeshStandardMaterial({ map: metalWallTex, roughness: 0.4, metalness: 0.6 });
}
