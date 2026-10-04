import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ActiveSmokeCloud, MatchPlayer, MatchSession, RoundPhase, SpikeState } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';
import { MapBuilder } from '../../utils/mapBuilder.js';

interface Props {
  matchId: string;
  playerId: string;
  onMatchComplete: (match: MatchSession) => void;
  onReturnToLobby: () => void;
}

interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot: boolean;
}

export const GameView: React.FC<Props> = ({
  matchId,
  playerId,
  onMatchComplete,
  onReturnToLobby,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Match State from Server
  const [match, setMatch] = useState<MatchSession | null>(null);
  const [showBuyMenu, setShowBuyMenu] = useState<boolean>(false);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(false);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [hitmarkerActive, setHitmarkerActive] = useState<boolean>(false);
  const [isHeadshotHit, setIsHeadshotHit] = useState<boolean>(false);
  const [roundNotification, setRoundNotification] = useState<string | null>(null);
  const [damageVignette, setDamageVignette] = useState<boolean>(false);

  // Weapon & ADS State
  const [activeSlot, setActiveSlot] = useState<1 | 2 | 3>(1); // 1: Rifle, 2: Pistol, 3: Knife
  const [isADS, setIsADS] = useState<boolean>(false);
  const [ammo, setAmmo] = useState<number>(30);
  const [reserveAmmo, setReserveAmmo] = useState<number>(90);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [health, setHealth] = useState<number>(100);
  const [armor, setArmor] = useState<number>(100);
  const [credits, setCredits] = useState<number>(800);
  const [currentWeapon, setCurrentWeapon] = useState<string>('VANGUARD RIFLE');
  const [grenadeCount, setGrenadeCount] = useState<number>(2);
  const [hasDefuseKit, setHasDefuseKit] = useState<boolean>(false);

  // Spike Planting & Defusal State
  const [isPlanting, setIsPlanting] = useState<boolean>(false);
  const [plantProgress, setPlantProgress] = useState<number>(0);
  const [isDefusing, setIsDefusing] = useState<boolean>(false);
  const [defuseProgress, setDefuseProgress] = useState<number>(0);
  const [inSiteA, setInSiteA] = useState<boolean>(false);
  const [inSiteB, setInSiteB] = useState<boolean>(false);

  // Spectator State
  const [isSpectating, setIsSpectating] = useState<boolean>(false);
  const [spectatedTargetId, setSpectatedTargetId] = useState<string | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const weaponMeshRef = useRef<THREE.Group | null>(null);
  const muzzleFlashRef = useRef<THREE.PointLight | null>(null);
  const enemyMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const friendlyMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const spikeMeshRef = useRef<THREE.Group | null>(null);
  const smokeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Input Movement State
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const playerPosRef = useRef(new THREE.Vector3(0, 1.7, 45));
  const velocityYRef = useRef(0);
  const isOnGroundRef = useRef(true);
  const playerYawRef = useRef(0);
  const playerPitchRef = useRef(0);
  const isPointerLockedRef = useRef(false);

  // Synchronize slot switch to weapon ammo/name
  useEffect(() => {
    if (activeSlot === 1) {
      setCurrentWeapon('VANGUARD VANDAL');
      setAmmo(30);
      setReserveAmmo(90);
    } else if (activeSlot === 2) {
      setCurrentWeapon('GHOST PISTOL');
      setAmmo(15);
      setReserveAmmo(45);
    } else if (activeSlot === 3) {
      setCurrentWeapon('TACTICAL KNIFE');
      setAmmo(1);
      setReserveAmmo(0);
    }
  }, [activeSlot]);

  // 1. Fetch & Poll Server Match State
  const fetchMatchState = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      if (data.success && data.match) {
        setMatch(data.match);

        if (data.match.matchEnded) {
          onMatchComplete(data.match);
          return;
        }

        const me = data.match.players.find((p: MatchPlayer) => p.id === playerId);
        if (me) {
          setHealth(me.health);
          setArmor(me.armor);
          setCredits(me.credits || 800);

          if (!me.isAlive && !isSpectating) {
            setIsSpectating(true);
            const aliveAlly = data.match.players.find(
              (p: MatchPlayer) => p.team === me.team && p.isAlive && p.id !== playerId
            );
            if (aliveAlly) setSpectatedTargetId(aliveAlly.id);
          } else if (me.isAlive && isSpectating) {
            setIsSpectating(false);
          }
        }
      }
    } catch (e) {
      console.error('Failed to sync match state', e);
    }
  };

  useEffect(() => {
    fetchMatchState();
    const interval = setInterval(fetchMatchState, 1200);
    return () => clearInterval(interval);
  }, [matchId, isSpectating]);

  // Round phase advancement simulation on server
  useEffect(() => {
    if (!match) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/advance`, { method: 'POST' });
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
          if (data.match.roundPhase === 'ROUND_END') {
            const reason = data.match.roundEndReason;
            const won = data.match.scoreAlpha > (match?.scoreAlpha || 0);
            const msg = won
              ? reason === 'SPIKE_DETONATED'
                ? 'ROUND WON // SPIKE DETONATED'
                : 'ROUND WON // TEAM ELIMINATED'
              : reason === 'SPIKE_DEFUSED'
              ? 'ROUND LOST // SPIKE DEFUSED'
              : 'ROUND LOST';
            setRoundNotification(msg);
            setTimeout(() => setRoundNotification(null), 3500);
          } else if (data.match.roundPhase === 'BUY') {
            setShowBuyMenu(true);
            setAmmo(30);
            setReserveAmmo(90);
            setIsPlanting(false);
            setIsDefusing(false);
            setPlantProgress(0);
            setDefuseProgress(0);
            playerPosRef.current.set(0, 1.7, 18);
          } else if (data.match.roundPhase === 'LIVE') {
            setShowBuyMenu(false);
          }

          if (data.match.matchEnded) {
            onMatchComplete(data.match);
          }
        }
      } catch (e) {
        console.error('Error advancing match phase', e);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [matchId, match]);

  // Simulated bot combat bursts during LIVE phase
  useEffect(() => {
    if (match?.roundPhase !== 'LIVE' || isSpectating) return;

    const botInterval = setInterval(async () => {
      // Check if any alive Omega bot is in range
      const aliveEnemies = match.players.filter((p) => p.team === 'OMEGA' && p.isAlive);
      if (aliveEnemies.length === 0) return;

      // Distance to nearest bot
      const dist = Math.hypot(playerPosRef.current.x - aliveEnemies[0].score, playerPosRef.current.z);
      if (dist < 28 && Math.random() < 0.35) {
        // Player takes bot fire damage!
        setDamageVignette(true);
        setTimeout(() => setDamageVignette(false), 220);

        try {
          const res = await fetch(`/api/matches/${matchId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              action: 'BOT_DAMAGE',
              damage: 18,
            }),
          });
          const data = await res.json();
          if (data.success && data.match) {
            setMatch(data.match);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }, 2500);

    return () => clearInterval(botInterval);
  }, [match?.roundPhase, isSpectating]);

  // Spike Beep loop
  useEffect(() => {
    if (!match?.spike.isPlanted || match?.spike.isDefused || match?.spike.isDetonated) return;
    const remaining = match.phaseTimerSeconds || 45;
    const urgency = Math.max(0.5, 1.0 + (45 - remaining) * 0.08);
    const intervalTime = Math.max(180, 1000 - (45 - remaining) * 20);

    const beepInterval = setInterval(() => {
      soundEngine.playSpikeBeep(urgency);
    }, intervalTime);

    return () => clearInterval(beepInterval);
  }, [match?.spike.isPlanted, match?.phaseTimerSeconds]);

  // 2. Initialize 3D FPS World
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const mapIdKey = (match?.mapId || match?.mapName || '').toUpperCase();
    const isDesert = mapIdKey.includes('MIRAGE') || mapIdKey.includes('DUST');
    const isCyber = mapIdKey.includes('CYBER') || mapIdKey.includes('HANGAR');

    const scene = new THREE.Scene();
    // Bright tactical sky & light fog for high visibility
    scene.background = new THREE.Color(isDesert ? 0x60a5fa : isCyber ? 0x0f172a : 0x1e293b);
    scene.fog = new THREE.FogExp2(isDesert ? 0xdbeafe : isCyber ? 0x0f172a : 0x1e293b, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 300);
    camera.position.copy(playerPosRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // High-visibility crisp tactical lighting
    const ambLight = new THREE.AmbientLight(
      isDesert ? 0xffedd5 : isCyber ? 0xe2e8f0 : 0xf1f5f9,
      isDesert ? 1.6 : isCyber ? 1.4 : 1.5
    );
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(
      isDesert ? 0xfef08a : isCyber ? 0xddd6fe : 0xffffff,
      isDesert ? 2.2 : isCyber ? 2.0 : 2.2
    );
    dirLight.position.set(40, 70, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Hemispherical fill light for soft ground bounce
    const hemiLight = new THREE.HemisphereLight(
      isDesert ? 0x93c5fd : 0x94a3b8,
      isDesert ? 0xd97706 : 0x334155,
      0.6
    );
    scene.add(hemiLight);

    // Point lights for key tactical sites
    const siteALight = new THREE.PointLight(isDesert ? 0xf59e0b : isCyber ? 0xa855f7 : 0x00f0ff, 4, 40);
    siteALight.position.set(-36, 6, -18);
    scene.add(siteALight);

    const siteBLight = new THREE.PointLight(isDesert ? 0xef4444 : isCyber ? 0x00f0ff : 0xf59e0b, 4, 40);
    siteBLight.position.set(36, 6, -18);
    scene.add(siteBLight);

    // Muzzle Flash
    const mFlash = new THREE.PointLight(0xffaa33, 0, 8);
    mFlash.position.set(0.2, -0.15, -0.6);
    camera.add(mFlash);
    muzzleFlashRef.current = mFlash;
    scene.add(camera);

    // Build Commercial Large Tactical Map by ID with Full Textures & Collision Geometry
    MapBuilder.buildMapById(scene, match?.mapId || match?.mapName);

    // Build First Person Weapon Model
    const weaponGroup = buildWeaponModel(activeSlot);
    camera.add(weaponGroup);
    weaponMeshRef.current = weaponGroup;

    // Spawn 3D Bots
    spawnCombatants(scene);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();

      // Smooth ADS FOV Transition
      const targetFOV = isADS ? 48 : 75;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.2);
      camera.updateProjectionMatrix();

      // If alive, process player movement
      if (!isSpectating) {
        const moveSpeed = (isADS ? 4.5 : 7.0) * delta;
        const forwardVec = new THREE.Vector3(
          -Math.sin(playerYawRef.current),
          0,
          -Math.cos(playerYawRef.current)
        ).normalize();
        const rightVec = new THREE.Vector3(
          Math.cos(playerYawRef.current),
          0,
          -Math.sin(playerYawRef.current)
        ).normalize();

        if (moveStateRef.current.forward) playerPosRef.current.addScaledVector(forwardVec, moveSpeed);
        if (moveStateRef.current.backward) playerPosRef.current.addScaledVector(forwardVec, -moveSpeed);
        if (moveStateRef.current.left) playerPosRef.current.addScaledVector(rightVec, -moveSpeed);
        if (moveStateRef.current.right) playerPosRef.current.addScaledVector(rightVec, moveSpeed);

        // Apply vertical physics (gravity & jump velocity)
        velocityYRef.current -= 19.6 * delta;
        playerPosRef.current.y += velocityYRef.current * delta;

        // Resolve 3D collisions with walls, crates, and sloped ramps
        const collision = MapBuilder.resolvePlayerPosition(playerPosRef.current, 0.5, 1.7);
        if (collision.onGround) {
          playerPosRef.current.y = collision.currentGroundHeight + 1.7;
          velocityYRef.current = 0;
          isOnGroundRef.current = true;
        } else {
          isOnGroundRef.current = false;
        }

        camera.position.copy(playerPosRef.current);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = playerYawRef.current;
        camera.rotation.x = playerPitchRef.current;

        // Check if inside Bomb Sites (Site A at -35, -18, Site B at 35, -18)
        const distA = Math.hypot(playerPosRef.current.x - -35, playerPosRef.current.z - -18);
        const distB = Math.hypot(playerPosRef.current.x - 35, playerPosRef.current.z - -18);
        setInSiteA(distA < 6.5);
        setInSiteB(distB < 6.5);
      } else {
        // SPECTATOR CAMERA
        if (spectatedTargetId && friendlyMeshesRef.current.has(spectatedTargetId)) {
          const allyMesh = friendlyMeshesRef.current.get(spectatedTargetId)!;
          camera.position.set(allyMesh.position.x, allyMesh.position.y + 2.5, allyMesh.position.z + 4);
          camera.lookAt(allyMesh.position.x, allyMesh.position.y + 1.2, allyMesh.position.z);
        }
      }

      // Smooth Weapon Alignment (ADS vs Hip-fire)
      if (weaponGroup && !isSpectating) {
        const isMoving =
          moveStateRef.current.forward ||
          moveStateRef.current.backward ||
          moveStateRef.current.left ||
          moveStateRef.current.right;
        const time = clock.getElapsedTime();
        const swayAmount = isMoving ? 0.012 : 0.003;

        // Target coordinates: centered when in ADS!
        const targetWeaponX = isADS ? 0.0 : 0.28;
        const targetWeaponY = isADS ? -0.16 : -0.24;
        const targetWeaponZ = isADS ? -0.38 : -0.5;

        weaponGroup.position.x = THREE.MathUtils.lerp(
          weaponGroup.position.x,
          targetWeaponX + (isADS ? 0 : Math.sin(time * 6) * swayAmount),
          0.2
        );
        weaponGroup.position.y = THREE.MathUtils.lerp(
          weaponGroup.position.y,
          targetWeaponY + (isADS ? 0 : Math.cos(time * 12) * (swayAmount * 0.8)),
          0.2
        );
        weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, targetWeaponZ, 0.2);
      }

      // Animate Enemy Bots
      const time = clock.getElapsedTime();
      enemyMeshesRef.current.forEach((mesh, id) => {
        mesh.rotation.y = Math.sin(time * 0.8 + id.length) * 0.5;
      });

      // Synchronize Spike Mesh on Map
      if (match?.spike.isPlanted && !spikeMeshRef.current) {
        const spikeObj = buildSpikeModel(match.spike.pos.x, match.spike.pos.z);
        scene.add(spikeObj);
        spikeMeshRef.current = spikeObj;
      } else if (!match?.spike.isPlanted && spikeMeshRef.current) {
        scene.remove(spikeMeshRef.current);
        spikeMeshRef.current = null;
      }

      // Synchronize Smoke Clouds
      if (match?.activeSmokes) {
        const currentSmokes = match.activeSmokes;
        currentSmokes.forEach((smoke) => {
          if (!smokeMeshesRef.current.has(smoke.id)) {
            const smokeMesh = new THREE.Mesh(
              new THREE.SphereGeometry(smoke.radius, 16, 16),
              new THREE.MeshStandardMaterial({
                color: 0x8899aa,
                transparent: true,
                opacity: 0.8,
                roughness: 0.9,
              })
            );
            smokeMesh.position.set(smoke.x, 2.0, smoke.z);
            scene.add(smokeMesh);
            smokeMeshesRef.current.set(smoke.id, smokeMesh);
          }
        });
      }

      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isSpectating, spectatedTargetId, isADS, activeSlot]);

  // Build First-Person Weapon Model based on Slot
  const buildWeaponModel = (slot: 1 | 2 | 3): THREE.Group => {
    const group = new THREE.Group();
    group.position.set(0.28, -0.24, -0.5);

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.3, metalness: 0.85 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    if (slot === 1) {
      // Primary Rifle
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.45), gunMat);
      group.add(body);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.015, -0.32);
      group.add(barrel);

      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.12), gunMat);
      scope.position.set(0, 0.075, -0.05);
      group.add(scope);

      const reticle = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.012, 16), accentMat);
      reticle.position.set(0, 0.075, -0.11);
      group.add(reticle);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.08), gunMat);
      mag.position.set(0, -0.1, 0.04);
      mag.rotation.x = 0.2;
      group.add(mag);
    } else if (slot === 2) {
      // Secondary Pistol
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.25), gunMat);
      group.add(body);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.15, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, -0.18);
      group.add(barrel);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), gunMat);
      grip.position.set(0, -0.08, 0.05);
      grip.rotation.x = 0.15;
      group.add(grip);
    } else {
      // Tactical Knife
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 0.14), gunMat);
      group.add(handle);

      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.22), bladeMat);
      blade.position.set(0, 0.01, -0.16);
      group.add(blade);
    }

    return group;
  };

  // Build 3D Spike Model
  const buildSpikeModel = (x: number, z: number): THREE.Group => {
    const spikeGroup = new THREE.Group();
    spikeGroup.position.set(x, 0.1, z);

    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111622, metalness: 0.9, roughness: 0.2 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2244 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8), spikeMat);
    base.position.y = 0.15;
    spikeGroup.add(base);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), glowMat);
    core.position.y = 0.5;
    spikeGroup.add(core);

    const beaconLight = new THREE.PointLight(0xff2244, 4, 15);
    beaconLight.position.y = 0.6;
    spikeGroup.add(beaconLight);

    return spikeGroup;
  };

  // Spawn Combatants (Allies & Enemies)
  const spawnCombatants = (scene: THREE.Scene) => {
    // Enemy Bots (Omega)
    const enemies = [
      { id: 'bot_omega_1', x: -15, z: -15, name: 'Omega Reaper' },
      { id: 'bot_omega_2', x: 0, z: -18, name: 'Omega Shadow' },
      { id: 'bot_omega_3', x: 15, z: -15, name: 'Omega Apex' },
      { id: 'bot_omega_4', x: -8, z: -5, name: 'Omega Phantom' },
      { id: 'bot_omega_5', x: 8, z: -5, name: 'Omega Wraith' },
    ];

    enemies.forEach((pos) => {
      const enemyGroup = new THREE.Group();
      enemyGroup.position.set(pos.x, 0, pos.z);

      const enemyBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x3d1a1f, roughness: 0.5, metalness: 0.5 })
      );
      enemyBody.position.y = 0.9;
      enemyGroup.add(enemyBody);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xff3344 })
      );
      visor.position.set(0, 1.5, 0.28);
      enemyGroup.add(visor);

      scene.add(enemyGroup);
      enemyMeshesRef.current.set(pos.id, enemyGroup);
    });

    // Friendly Bots (Alpha)
    const allies = [
      { id: 'bot_alpha_1', x: -5, z: 12, name: 'Alpha Viper' },
      { id: 'bot_alpha_2', x: 5, z: 12, name: 'Alpha Cipher' },
      { id: 'bot_alpha_3', x: -10, z: 8, name: 'Alpha Valkyrie' },
      { id: 'bot_alpha_4', x: 10, z: 8, name: 'Alpha Titan' },
    ];

    allies.forEach((pos) => {
      const allyGroup = new THREE.Group();
      allyGroup.position.set(pos.x, 0, pos.z);

      const allyBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x182436, roughness: 0.5, metalness: 0.5 })
      );
      allyBody.position.y = 0.9;
      allyGroup.add(allyBody);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x00f0ff })
      );
      visor.position.set(0, 1.5, 0.28);
      allyGroup.add(visor);

      scene.add(allyGroup);
      friendlyMeshesRef.current.set(pos.id, allyGroup);
    });
  };

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSpectating) {
        if (e.code === 'Space') cycleSpectatorTarget();
        return;
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveStateRef.current.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveStateRef.current.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveStateRef.current.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveStateRef.current.right = true;

      if (e.code === 'KeyB') {
        if (match?.roundPhase === 'BUY') {
          soundEngine.playClick();
          setShowBuyMenu((prev) => !prev);
        }
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        setShowScoreboard(true);
      }

      if (e.code === 'KeyR') {
        handleReload();
      }

      // Weapon switching [1], [2], [3]
      if (e.code === 'Digit1') {
        soundEngine.playClick();
        setActiveSlot(1);
      }
      if (e.code === 'Digit2') {
        soundEngine.playClick();
        setActiveSlot(2);
      }
      if (e.code === 'Digit3') {
        soundEngine.playKnifeSlash();
        setActiveSlot(3);
      }

      // Throw Grenade [G]
      if (e.code === 'KeyG') {
        handleThrowGrenade();
      }

      // Plant Spike [4] or [E] on site
      if ((e.code === 'Digit4' || e.code === 'KeyE') && (inSiteA || inSiteB) && !match?.spike.isPlanted) {
        handleStartPlanting();
      }

      // Defuse Spike [E] near planted spike
      if (e.code === 'KeyE' && match?.spike.isPlanted && !match.spike.isDefused) {
        handleStartDefusing();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') moveStateRef.current.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') moveStateRef.current.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') moveStateRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') moveStateRef.current.right = false;

      if (e.code === 'Tab') {
        setShowScoreboard(false);
      }

      if (e.code === 'Digit4' || e.code === 'KeyE') {
        setIsPlanting(false);
        setPlantProgress(0);
        setIsDefusing(false);
        setDefuseProgress(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [match, inSiteA, inSiteB, isSpectating, spectatedTargetId]);

  // Pointer Lock and Mouse Look
  const handleCanvasClick = () => {
    if (!containerRef.current) return;
    if (!isPointerLockedRef.current) {
      containerRef.current.requestPointerLock();
    }
    if (isSpectating) {
      cycleSpectatorTarget();
    }
  };

  const cycleSpectatorTarget = () => {
    if (!match) return;
    const allies = match.players.filter((p) => p.team === 'ALPHA' && p.isAlive && p.id !== playerId);
    if (allies.length === 0) return;
    const currentIndex = allies.findIndex((p) => p.id === spectatedTargetId);
    const nextIndex = (currentIndex + 1) % allies.length;
    setSpectatedTargetId(allies[nextIndex].id);
    soundEngine.playClick();
  };

  useEffect(() => {
    const handlePointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === containerRef.current;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLockedRef.current || isSpectating) return;
      const sensitivity = isADS ? 0.0012 : 0.0022; // Precision sensitivity when in ADS!
      playerYawRef.current -= e.movementX * sensitivity;
      playerPitchRef.current -= e.movementY * sensitivity;
      playerPitchRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, playerPitchRef.current));
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSpectating, isADS]);

  // Spike Planting Handler
  const handleStartPlanting = () => {
    if (match?.roundPhase !== 'LIVE' || match?.spike.isPlanted || isPlanting) return;
    setIsPlanting(true);
    soundEngine.playSpikePlant();

    let p = 0;
    const interval = setInterval(async () => {
      p += 25;
      setPlantProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsPlanting(false);
        try {
          const site = inSiteA ? 'A' : 'B';
          const res = await fetch(`/api/matches/${matchId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              action: 'PLANT_SPIKE',
              site,
              pos: { x: site === 'A' ? -15 : 15, y: 0.1, z: -15 },
            }),
          });
          const data = await res.json();
          if (data.success && data.match) {
            setMatch(data.match);
            soundEngine.playSpikePlant();
          }
        } catch (e) {
          console.error(e);
        }
      }
    }, 1000);
  };

  // Spike Defusing Handler
  const handleStartDefusing = () => {
    if (match?.roundPhase !== 'LIVE' || !match?.spike.isPlanted || isDefusing) return;
    setIsDefusing(true);
    soundEngine.playClick();

    const step = hasDefuseKit ? 50 : 25;
    const interval = setInterval(async () => {
      setDefuseProgress((prev) => {
        const next = Math.min(100, prev + step);
        if (next >= 100) {
          clearInterval(interval);
          setIsDefusing(false);
          soundEngine.playSpikeDefused();
        }
        return next;
      });

      try {
        const res = await fetch(`/api/matches/${matchId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, action: 'DEFUSE_SPIKE' }),
        });
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1750);
  };

  // Throw Grenade
  const handleThrowGrenade = async () => {
    if (match?.roundPhase !== 'LIVE' || grenadeCount <= 0 || isSpectating) return;
    setGrenadeCount((g) => g - 1);
    soundEngine.playGrenadePin();

    const forwardVec = new THREE.Vector3(
      -Math.sin(playerYawRef.current),
      0,
      -Math.cos(playerYawRef.current)
    ).normalize();
    const throwPos = {
      x: playerPosRef.current.x + forwardVec.x * 8,
      y: 0.1,
      z: playerPosRef.current.z + forwardVec.z * 8,
    };

    setTimeout(async () => {
      const gType = Math.random() > 0.5 ? 'SMOKE' : 'FRAG';
      if (gType === 'SMOKE') soundEngine.playSmokeHiss();
      else soundEngine.playExplosion();

      try {
        const res = await fetch(`/api/matches/${matchId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            action: 'THROW_GRENADE',
            grenadeType: gType,
            pos: throwPos,
          }),
        });
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1200);
  };

  // Weapon Reload
  const handleReload = () => {
    if (isReloading || ammo === (activeSlot === 2 ? 15 : 30) || reserveAmmo <= 0 || isSpectating || activeSlot === 3) return;
    setIsReloading(true);
    soundEngine.playReload();

    setTimeout(() => {
      const maxInMag = activeSlot === 2 ? 15 : 30;
      const needed = maxInMag - ammo;
      const take = Math.min(needed, reserveAmmo);
      setAmmo((a) => a + take);
      setReserveAmmo((r) => r - take);
      setIsReloading(false);
    }, 1200);
  };

  // Weapon Shoot or Knife Slash (Left Click)
  const handleShoot = async () => {
    if (isSpectating) return;
    if (match?.roundPhase === 'BUY') return;

    // MELEE KNIFE ATTACK
    if (activeSlot === 3) {
      soundEngine.playKnifeSlash();
      // Animate knife swing
      if (weaponMeshRef.current) {
        weaponMeshRef.current.rotation.z += 0.35;
        setTimeout(() => {
          if (weaponMeshRef.current) weaponMeshRef.current.rotation.z = 0;
        }, 120);
      }

      // Check raycast melee range (< 3.0 units)
      if (!cameraRef.current || !sceneRef.current) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);
      raycaster.far = 3.2;

      const enemyMeshesList = Array.from(enemyMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(enemyMeshesList, true);

      if (intersects.length > 0) {
        soundEngine.playHitmarker();
        setHitmarkerActive(true);
        setTimeout(() => setHitmarkerActive(false), 120);

        let hitEnemyId = 'bot_omega_1';
        for (const [id, mesh] of enemyMeshesRef.current.entries()) {
          if (mesh.getObjectById(intersects[0].object.id)) {
            hitEnemyId = id;
            break;
          }
        }

        try {
          const res = await fetch(`/api/matches/${matchId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId,
              action: 'KNIFE_SLASH',
              targetId: hitEnemyId,
              isBackstab: true,
            }),
          });
          const data = await res.json();
          if (data.success && data.match) {
            setMatch(data.match);
            const victim = data.match.players.find((p: MatchPlayer) => p.id === hitEnemyId);
            if (victim && !victim.isAlive) {
              setKillFeed((prev) => [
                {
                  id: `kf_${Date.now()}`,
                  killer: 'GhostOperator',
                  victim: victim.username,
                  weapon: 'Tactical Knife',
                  isHeadshot: false,
                },
                ...prev.slice(0, 4),
              ]);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    // FIREARM SHOOT (RIFLE OR PISTOL)
    if (ammo <= 0) {
      soundEngine.playClick();
      handleReload();
      return;
    }

    if (isReloading) return;

    setAmmo((a) => a - 1);
    soundEngine.playRifleShot();

    // Weapon Recoil Animation
    if (weaponMeshRef.current) {
      const recoilMult = isADS ? 0.04 : 0.08;
      weaponMeshRef.current.position.z += recoilMult;
      weaponMeshRef.current.rotation.x += recoilMult * 0.7;
      setTimeout(() => {
        if (weaponMeshRef.current) {
          weaponMeshRef.current.position.z = isADS ? -0.38 : -0.5;
          weaponMeshRef.current.rotation.x = 0;
        }
      }, 70);
    }

    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.intensity = 6;
      setTimeout(() => {
        if (muzzleFlashRef.current) muzzleFlashRef.current.intensity = 0;
      }, 40);
    }

    // Raycast hit detection against enemy bots
    if (!cameraRef.current || !sceneRef.current) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);

    const enemyMeshesList = Array.from(enemyMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(enemyMeshesList, true);

    if (intersects.length > 0) {
      const hitObj = intersects[0];
      const isHead = hitObj.point.y > 1.4;
      setIsHeadshotHit(isHead);
      setHitmarkerActive(true);

      if (isHead) soundEngine.playHeadshot();
      else soundEngine.playHitmarker();

      setTimeout(() => setHitmarkerActive(false), 120);

      let hitEnemyId = 'bot_omega_1';
      for (const [id, mesh] of enemyMeshesRef.current.entries()) {
        if (mesh.getObjectById(hitObj.object.id)) {
          hitEnemyId = id;
          break;
        }
      }

      const baseDmg = activeSlot === 2 ? (isHead ? 70 : 28) : (isHead ? 85 : 34);

      try {
        const res = await fetch(`/api/matches/${matchId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            action: 'SHOOT',
            targetId: hitEnemyId,
            damage: baseDmg,
            isHeadshot: isHead,
            pos: { x: playerPosRef.current.x, y: 1.7, z: playerPosRef.current.z },
          }),
        });
        const data = await res.json();
        if (data.success && data.match) {
          setMatch(data.match);
          const victim = data.match.players.find((p: MatchPlayer) => p.id === hitEnemyId);
          if (victim && !victim.isAlive) {
            setKillFeed((prev) => [
              {
                id: `kf_${Date.now()}`,
                killer: 'GhostOperator',
                victim: victim.username,
                weapon: activeSlot === 2 ? 'Ghost Pistol' : 'Vandal Rifle',
                isHeadshot: isHead,
              },
              ...prev.slice(0, 4),
            ]);
            const mesh = enemyMeshesRef.current.get(hitEnemyId);
            if (mesh && sceneRef.current) {
              sceneRef.current.remove(mesh);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleBuyWeapon = async (weaponKey: string, cost: number) => {
    soundEngine.playClick();
    if (credits < cost) return;
    setCredits((c) => c - cost);
    setCurrentWeapon(weaponKey.toUpperCase());
    try {
      await fetch(`/api/matches/${matchId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          action: 'BUY_ITEM',
          itemType: weaponKey,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const currentPhase: RoundPhase = match?.roundPhase || 'BUY';

  // Radar coordinates & tactical callouts
  const mapKey = match?.mapId || match?.mapName || 'SECTOR_07';
  const siteCoords = MapBuilder.getSiteCoordinates(mapKey);
  const currentZoneCallout = MapBuilder.getZoneCallout(playerPosRef.current, mapKey);

  // Radar coordinate converter: relative to player, range = 45 meters
  const radarScale = 50 / 45;

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      onContextMenu={(e) => {
        e.preventDefault(); // Prevent browser context menu!
      }}
      onMouseDown={(e) => {
        if (!isPointerLockedRef.current) return;
        if (e.button === 0 && !isSpectating) {
          handleShoot();
        } else if (e.button === 2 && !isSpectating) {
          // Toggle ADS on Right Click
          setIsADS((prev) => !prev);
          soundEngine.playClick();
        }
      }}
      className="relative w-full h-full select-none overflow-hidden bg-black cursor-crosshair"
    >
      {/* Damage Vignette Screen Flash */}
      {damageVignette && (
        <div className="absolute inset-0 z-30 pointer-events-none border-[16px] border-rose-600/70 shadow-[inset_0_0_80px_rgba(239,68,68,0.7)] animate-in fade-in duration-75" />
      )}

      {/* TACTICAL MINI-MAP RADAR & ZONE CALLOUT (TOP LEFT) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col items-center">
        <div className="relative h-28 w-28 rounded-full bg-slate-950/90 border-2 border-cyan-500/50 backdrop-blur-md shadow-2xl overflow-hidden flex items-center justify-center">
          {/* Concentric distance rings */}
          <div className="absolute h-20 w-20 rounded-full border border-cyan-500/20" />
          <div className="absolute h-10 w-10 rounded-full border border-cyan-500/30" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-full w-px bg-cyan-500/20" />
            <div className="w-full h-px bg-cyan-500/20 absolute" />
          </div>

          {/* Compass labels */}
          <span className="absolute top-1 text-[8px] font-mono text-cyan-400 font-bold">N</span>
          <span className="absolute bottom-1 text-[8px] font-mono text-cyan-500">S</span>

          {/* Bomb Site A */}
          <div
            className="absolute h-3.5 w-3.5 rounded-full bg-cyan-500/30 border border-cyan-400 text-[8px] font-black text-white flex items-center justify-center shadow-sm"
            style={{
              left: `${56 + (siteCoords.siteA.x - playerPosRef.current.x) * radarScale - 7}px`,
              top: `${56 + (siteCoords.siteA.z - playerPosRef.current.z) * radarScale - 7}px`,
            }}
          >
            A
          </div>

          {/* Bomb Site B */}
          <div
            className="absolute h-3.5 w-3.5 rounded-full bg-amber-500/30 border border-amber-400 text-[8px] font-black text-white flex items-center justify-center shadow-sm"
            style={{
              left: `${56 + (siteCoords.siteB.x - playerPosRef.current.x) * radarScale - 7}px`,
              top: `${56 + (siteCoords.siteB.z - playerPosRef.current.z) * radarScale - 7}px`,
            }}
          >
            B
          </div>

          {/* Spike Radar Blip */}
          {match?.spike.isPlanted && (
            <div
              className="absolute h-3.5 w-3.5 rounded-full bg-rose-600 border border-white text-[9px] font-bold text-white flex items-center justify-center animate-ping"
              style={{
                left: `${56 + (match.spike.pos.x - playerPosRef.current.x) * radarScale - 7}px`,
                top: `${56 + (match.spike.pos.z - playerPosRef.current.z) * radarScale - 7}px`,
              }}
            />
          )}

          {/* Player Arrow at Center */}
          <div
            className="h-3.5 w-3.5 border-l-2 border-t-2 border-cyan-400"
            style={{ transform: `rotate(${playerYawRef.current + Math.PI / 4}rad)` }}
          />
        </div>

        {/* Live Callout & Map Name */}
        <div className="flex flex-col items-center mt-1.5 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 backdrop-blur-sm shadow-md">
          <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wider">
            {currentZoneCallout}
          </span>
          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
            {match?.mapName || 'SECTOR-07'}
          </span>
        </div>
      </div>

      {/* Dynamic Tactical Crosshair */}
      {!isSpectating && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {isADS ? (
            /* ADS Holographic Precision Reticle */
            <div className="relative h-16 w-16 flex items-center justify-center animate-in zoom-in-75 duration-100">
              <div className="absolute inset-0 rounded-full border border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
              <div className="absolute h-1 w-1 rounded-full bg-cyan-300" />
              <div className="absolute top-1 h-2 w-0.5 bg-cyan-400" />
              <div className="absolute bottom-1 h-2 w-0.5 bg-cyan-400" />
              <div className="absolute left-1 w-2 h-0.5 bg-cyan-400" />
              <div className="absolute right-1 w-2 h-0.5 bg-cyan-400" />
            </div>
          ) : (
            /* Standard Hipfire Reticle */
            <div className="relative h-6 w-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-cyan-400" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-cyan-400" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-cyan-400" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-cyan-400" />
              <div className="absolute inset-0 m-auto h-1 w-1 rounded-full bg-cyan-300" />
            </div>
          )}

          {/* Hitmarker Flash */}
          {hitmarkerActive && (
            <div className="absolute -inset-2 flex items-center justify-center animate-in zoom-in-50 duration-75">
              <span className={`text-2xl font-black ${isHeadshotHit ? 'text-rose-500 scale-125' : 'text-amber-400'}`}>
                ✕
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pointer Lock Hint */}
      {!isPointerLockedRef.current && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-cyan-950/80 border border-cyan-400/60 rounded-xl px-4 py-2 font-mono text-xs text-cyan-300 backdrop-blur-md animate-pulse">
          CLICK SCREEN FOR POINTER LOCK • RIGHT CLICK ADS ZOOM • [1/2/3] WEAPONS • [G] GRENADE
        </div>
      )}

      {/* SPECTATOR MODE OVERLAY */}
      {isSpectating && (
        <div className="absolute inset-0 pointer-events-none z-30 border-[12px] border-rose-950/40 flex flex-col justify-between p-8">
          <div className="self-center bg-rose-950/90 border border-rose-500/60 rounded-2xl px-6 py-2.5 font-mono text-center backdrop-blur-md shadow-2xl">
            <span className="text-xs font-bold text-rose-400 block tracking-widest uppercase">
              AGENT DOWN // SPECTATOR MODE
            </span>
            <span className="text-sm font-black text-white uppercase">
              SPECTATING: {match?.players.find((p) => p.id === spectatedTargetId)?.username || 'ALPHA SQUAD'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              PRESS [SPACE] OR CLICK TO CYCLE SURVIVING ALLIES
            </span>
          </div>
        </div>
      )}

      {/* TOP ROUND & MATCH STATUS BAR */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/90 border border-slate-800 rounded-2xl px-6 py-2.5 backdrop-blur-md shadow-2xl">
        {/* Team Alpha Score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            ))}
          </div>
          <span className="font-mono text-xs font-bold text-cyan-400">ALPHA</span>
          <span className="text-2xl font-black text-white">{match?.scoreAlpha ?? 0}</span>
        </div>

        {/* Phase & Round Timer */}
        <div className="flex flex-col items-center border-x border-slate-800 px-4 min-w-[130px]">
          <span
            className={`text-[10px] font-mono font-bold tracking-widest uppercase ${
              match?.spike.isPlanted
                ? 'text-rose-400 animate-ping'
                : currentPhase === 'BUY'
                ? 'text-amber-400 animate-pulse'
                : currentPhase === 'LIVE'
                ? 'text-emerald-400'
                : 'text-cyan-400'
            }`}
          >
            {match?.spike.isPlanted
              ? 'SPIKE ACTIVE'
              : currentPhase === 'BUY'
              ? 'BUY PHASE'
              : currentPhase === 'LIVE'
              ? 'COMBAT LIVE'
              : 'ROUND OVER'}
          </span>
          <span
            className={`text-xl font-mono font-black ${
              match?.spike.isPlanted ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
          >
            00:{match?.phaseTimerSeconds ? match.phaseTimerSeconds.toString().padStart(2, '0') : '15'}
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            ROUND {match?.currentRound ?? 1} / {match?.maxRounds ?? 17}
          </span>
        </div>

        {/* Team Omega Score */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-white">{match?.scoreOmega ?? 0}</span>
          <span className="font-mono text-xs font-bold text-amber-400">OMEGA</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
            ))}
          </div>
        </div>
      </div>

      {/* Kill Feed (Top Right) */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 pointer-events-none">
        {killFeed.map((kf) => (
          <div
            key={kf.id}
            className="flex items-center gap-2 rounded-lg bg-black/80 border border-slate-800 px-3 py-1 font-mono text-xs text-white backdrop-blur-md"
          >
            <span className="text-cyan-400 font-bold">{kf.killer}</span>
            <span className="text-slate-500 text-[10px]">[{kf.weapon}]</span>
            {kf.isHeadshot && <span className="text-rose-500 font-bold">🎯</span>}
            <span className="text-amber-400 font-bold">{kf.victim}</span>
          </div>
        ))}
      </div>

      {/* SPIKE PLANTING / DEFUSING HUD PROMPTS */}
      {!isSpectating && currentPhase === 'LIVE' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          {(inSiteA || inSiteB) && !match?.spike.isPlanted && (
            <div className="bg-cyan-950/90 border border-cyan-400/80 rounded-xl px-4 py-2 font-mono text-xs text-white backdrop-blur-md animate-pulse text-center">
              <span className="text-cyan-300 font-bold">BOMB SITE {inSiteA ? 'A' : 'B'} SECURED</span>
              <span className="block text-[11px] text-slate-300">HOLD [4] OR [E] TO PLANT SPIKE</span>
            </div>
          )}

          {isPlanting && (
            <div className="w-64 bg-slate-950 border border-cyan-400 rounded-xl p-3 flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-xs text-cyan-300 font-bold">
                <span>PLANTING SPIKE...</span>
                <span>{plantProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${plantProgress}%` }}
                />
              </div>
            </div>
          )}

          {isDefusing && (
            <div className="w-64 bg-slate-950 border border-emerald-400 rounded-xl p-3 flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between text-xs text-emerald-300 font-bold">
                <span>DEFUSING SPIKE...</span>
                <span>{defuseProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-200"
                  style={{ width: `${defuseProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Round Notification Banner */}
      {roundNotification && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center animate-in zoom-in-95 duration-200">
          <div
            className={`rounded-2xl px-12 py-4 border-2 font-black text-2xl font-mono uppercase tracking-widest shadow-2xl backdrop-blur-lg ${
              roundNotification.includes('WON')
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-emerald-500/40'
                : 'bg-rose-950/80 border-rose-400 text-rose-400 shadow-rose-500/40'
            }`}
          >
            {roundNotification}
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: HEALTH, ARMOR & GRENADES */}
      <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        {/* Health */}
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">HEALTH</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{health}</span>
            <div className="h-8 w-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ height: `${health}%` }} />
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        {/* Armor */}
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase">KEVLAR</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">{armor}</span>
            <div className="h-8 w-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ height: `${armor}%` }} />
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        {/* Grenades */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase">GRENADES</span>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-base">💣</span>
            <span className="text-sm font-bold font-mono text-amber-300">x{grenadeCount} [G]</span>
          </div>
        </div>
      </div>

      {/* BOTTOM CENTER: WEAPON SLOTS SELECTOR */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2 backdrop-blur-md">
        <button
          onClick={() => setActiveSlot(1)}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 ${
            activeSlot === 1 ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>[1]</span>
          <span>RIFLE</span>
        </button>
        <button
          onClick={() => setActiveSlot(2)}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 ${
            activeSlot === 2 ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>[2]</span>
          <span>PISTOL</span>
        </button>
        <button
          onClick={() => setActiveSlot(3)}
          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-1.5 ${
            activeSlot === 3 ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>[3]</span>
          <span>KNIFE</span>
        </button>
      </div>

      {/* BOTTOM RIGHT: WEAPON, CREDITS & AMMO */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white uppercase">{currentWeapon}</span>
            {isADS && (
              <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1 rounded border border-cyan-500/40">
                ADS ZOOM
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-emerald-400">CREDITS: ${credits}</span>
        </div>

        <div className="h-8 w-px bg-slate-800" />

        <div className="flex items-baseline gap-1 font-mono">
          <span className={`text-3xl font-black ${ammo <= 5 && activeSlot !== 3 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
            {isReloading ? '--' : activeSlot === 3 ? '∞' : ammo}
          </span>
          {activeSlot !== 3 && <span className="text-xs font-bold text-slate-500">/ {reserveAmmo}</span>}
        </div>

        {activeSlot !== 3 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReload();
            }}
            disabled={isReloading}
            className="px-2.5 py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {isReloading ? 'RELOADING...' : '[R] RELOAD'}
          </button>
        )}
      </div>

      {/* BUY MENU (B Key overlay in BUY phase) */}
      {showBuyMenu && currentPhase === 'BUY' && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-cyan-500/50 p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase">ARMORY // BUY PHASE</span>
                <h3 className="text-lg font-black text-white">SELECT WEAPON & EQUIPMENT</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-emerald-400">BALANCE: ${credits}</span>
                <button
                  onClick={() => setShowBuyMenu(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-mono text-slate-400 hover:text-white"
                >
                  CLOSE [B]
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Vanguard Vandal */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">VANGUARD VANDAL</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">High Damage • Precision Rifle</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$2,900</span>
                  <button
                    onClick={() => handleBuyWeapon('Vanguard Rifle', 2900)}
                    disabled={credits < 2900}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-30 transition"
                  >
                    EQUIP
                  </button>
                </div>
              </div>

              {/* Phantom SMG */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">PHANTOM SMG</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">High Fire-Rate • Silenced</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$1,600</span>
                  <button
                    onClick={() => handleBuyWeapon('Phantom SMG', 1600)}
                    disabled={credits < 1600}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-30 transition"
                  >
                    EQUIP
                  </button>
                </div>
              </div>

              {/* Enforcer Shotgun */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">ENFORCER SHOTGUN</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">Devastating Close-Quarters</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$1,200</span>
                  <button
                    onClick={() => handleBuyWeapon('Enforcer Shotgun', 1200)}
                    disabled={credits < 1200}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-30 transition"
                  >
                    EQUIP
                  </button>
                </div>
              </div>

              {/* Heavy Armor */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">HEAVY KEVLAR VEST</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">+100 Armor Absorption</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$1,000</span>
                  <button
                    onClick={() => {
                      if (credits >= 1000) {
                        setCredits((c) => c - 1000);
                        setArmor(100);
                      }
                    }}
                    disabled={credits < 1000 || armor >= 100}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-30 transition"
                  >
                    PURCHASE
                  </button>
                </div>
              </div>

              {/* Tactical Grenade Bundle */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">TACTICAL GRENADE</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">Frag / Smoke Bundle</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$300</span>
                  <button
                    onClick={() => {
                      if (credits >= 300) {
                        setCredits((c) => c - 300);
                        setGrenadeCount((g) => g + 1);
                      }
                    }}
                    disabled={credits < 300 || grenadeCount >= 4}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-30 transition"
                  >
                    PURCHASE
                  </button>
                </div>
              </div>

              {/* Defusal Kit */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-cyan-500/60 transition">
                <div>
                  <span className="text-xs font-bold text-white">DEFUSAL KIT</span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">Halves Spike Defusal Time</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">$400</span>
                  <button
                    onClick={() => {
                      if (credits >= 400) {
                        setCredits((c) => c - 400);
                        setHasDefuseKit(true);
                      }
                    }}
                    disabled={credits < 400 || hasDefuseKit}
                    className="px-3 py-1 text-xs font-mono font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-30 transition"
                  >
                    PURCHASE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCOREBOARD OVERLAY (TAB key) */}
      {showScoreboard && match && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 animate-in fade-in duration-100"
        >
          <div className="w-full max-w-4xl rounded-2xl bg-slate-950 border border-slate-800 p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase">
                VANGUARD 5V5 COMPETITIVE SCOREBOARD
              </span>
              <span className="text-xs font-mono text-slate-400">HOLD TAB TO VIEW</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Alpha Team */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono font-bold text-cyan-400 border-b border-cyan-500/30 pb-1">
                  <span>TEAM ALPHA ({match.scoreAlpha})</span>
                  <span>K / D / A • PING</span>
                </div>
                {match.players
                  .filter((p) => p.team === 'ALPHA')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs font-mono"
                    >
                      <span className={p.id === playerId ? 'text-cyan-400 font-bold' : 'text-white'}>
                        {p.username}
                      </span>
                      <span className="text-slate-400">
                        {p.kills} / {p.deaths} / {p.assists} • {p.ping}ms
                      </span>
                    </div>
                  ))}
              </div>

              {/* Omega Team */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-mono font-bold text-amber-400 border-b border-amber-500/30 pb-1">
                  <span>TEAM OMEGA ({match.scoreOmega})</span>
                  <span>K / D / A • PING</span>
                </div>
                {match.players
                  .filter((p) => p.team === 'OMEGA')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs font-mono"
                    >
                      <span className="text-white">{p.username}</span>
                      <span className="text-slate-400">
                        {p.kills} / {p.deaths} / {p.assists} • {p.ping}ms
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
