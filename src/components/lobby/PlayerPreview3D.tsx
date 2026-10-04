import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PlayerLoadout } from '../../shared/types.js';

interface Props {
  loadout: PlayerLoadout;
}

export const PlayerPreview3D: React.FC<Props> = ({ loadout }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(3.2);
  const [lightPreset, setLightPreset] = useState<'cyan' | 'amber' | 'noir'>('cyan');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterGroupRef = useRef<THREE.Group | null>(null);
  const keyLightRef = useRef<THREE.PointLight | null>(null);
  const rimLightRef = useRef<THREE.PointLight | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const prevMouseXRef = useRef<number>(0);
  const rotationYRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 650;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.25, zoomLevel);
    camera.lookAt(0, 1.05, 0);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2230, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0x00f0ff, 4.0, 10);
    keyLight.position.set(2, 2.5, 2.5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.PointLight(0x4080ff, 3.0, 10);
    rimLight.position.set(-2.5, 2.0, -2);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(0, 4, 3);
    scene.add(fillLight);

    // 4. Tactical Hex Pedestal
    const hexGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 6);
    const hexMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      roughness: 0.4,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(hexGeo, hexMat);
    pedestal.position.set(0, -0.075, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Glowing Ring on Pedestal
    const ringGeo = new THREE.RingGeometry(0.95, 1.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.005, 0);
    scene.add(ring);

    // 5. Operator Character Group
    const charGroup = new THREE.Group();
    scene.add(charGroup);
    characterGroupRef.current = charGroup;

    // Materials based on loadout
    let suitColorHex = 0x181c24; // black_ops
    if (loadout.suitColor === 'arctic_camo') suitColorHex = 0xd0d8e0;
    if (loadout.suitColor === 'desert_strike') suitColorHex = 0x8a7250;
    if (loadout.suitColor === 'cyber_crimson') suitColorHex = 0x331015;

    let weaponColorHex = 0x22262d;
    let weaponAccentHex = 0x00f0ff;
    if (loadout.rifleSkin === 'neon_matrix') {
      weaponColorHex = 0x0f2027;
      weaponAccentHex = 0x00ff88;
    } else if (loadout.rifleSkin === 'void_shadow') {
      weaponColorHex = 0x120c1f;
      weaponAccentHex = 0xa855f7;
    } else if (loadout.rifleSkin === 'gold_vanguard') {
      weaponColorHex = 0x262012;
      weaponAccentHex = 0xffc72c;
    }

    const suitMat = new THREE.MeshStandardMaterial({
      color: suitColorHex,
      roughness: 0.7,
      metalness: 0.3,
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x101318,
      roughness: 0.3,
      metalness: 0.8,
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: weaponAccentHex,
      emissive: weaponAccentHex,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9,
    });

    // --- LEGS ---
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8), suitMat);
    leftLeg.position.set(-0.16, 0.45, 0);
    charGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.65, 8), suitMat);
    rightLeg.position.set(0.16, 0.45, 0);
    charGroup.add(rightLeg);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.14, 0.16, 0.24);
    const leftBoot = new THREE.Mesh(bootGeo, armorMat);
    leftBoot.position.set(-0.16, 0.1, 0.04);
    charGroup.add(leftBoot);

    const rightBoot = new THREE.Mesh(bootGeo, armorMat);
    rightBoot.position.set(0.16, 0.1, 0.04);
    charGroup.add(rightBoot);

    // Kneepads
    const kneeGeo = new THREE.BoxGeometry(0.13, 0.14, 0.06);
    const leftKnee = new THREE.Mesh(kneeGeo, armorMat);
    leftKnee.position.set(-0.16, 0.45, 0.08);
    charGroup.add(leftKnee);

    const rightKnee = new THREE.Mesh(kneeGeo, armorMat);
    rightKnee.position.set(0.16, 0.45, 0.08);
    charGroup.add(rightKnee);

    // --- TORSO ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.75, 0);
    charGroup.add(torsoGroup);

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.22), armorMat);
    pelvis.position.set(0, 0.08, 0);
    torsoGroup.add(pelvis);

    // Chest & Vest
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.45, 0.26), suitMat);
    chest.position.set(0, 0.38, 0);
    torsoGroup.add(chest);

    const vestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.3), armorMat);
    vestPlate.position.set(0, 0.4, 0.02);
    torsoGroup.add(vestPlate);

    // Tactical Pouches
    for (let i = -1; i <= 1; i++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.06), armorMat);
      pouch.position.set(i * 0.11, 0.25, 0.16);
      torsoGroup.add(pouch);
    }

    // --- HEAD & HELMET ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.68, 0);
    torsoGroup.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), suitMat);
    neck.position.set(0, -0.02, 0);
    headGroup.add(neck);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), armorMat);
    helmet.scale.set(0.95, 1.1, 1.05);
    helmet.position.set(0, 0.12, 0);
    headGroup.add(helmet);

    // Visor Plate
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.06), visorMat);
    visor.position.set(0, 0.12, 0.17);
    headGroup.add(visor);

    // --- ARMS & WEAPON ---
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8), suitMat);
    leftArm.position.set(-0.28, 0.36, 0.05);
    leftArm.rotation.set(0.4, 0, 0.2);
    torsoGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 8), suitMat);
    rightArm.position.set(0.28, 0.36, 0.05);
    rightArm.rotation.set(0.6, 0, -0.3);
    torsoGroup.add(rightArm);

    // Tactical Weapon Model
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0.08, 0.35, 0.28);
    weaponGroup.rotation.set(-0.1, -0.2, 0);
    torsoGroup.add(weaponGroup);

    const weaponMat = new THREE.MeshStandardMaterial({
      color: weaponColorHex,
      metalness: 0.85,
      roughness: 0.25,
    });

    const weaponAccentMat = new THREE.MeshBasicMaterial({
      color: weaponAccentHex,
    });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.48), weaponMat);
    weaponGroup.add(receiver);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), weaponMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.38);
    weaponGroup.add(barrel);

    // Muzzle brake
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), weaponMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, 0.58);
    weaponGroup.add(muzzle);

    // Holographic Optic
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.14), weaponMat);
    optic.position.set(0, 0.09, 0.02);
    weaponGroup.add(optic);

    const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), weaponAccentMat);
    opticLens.position.set(0, 0.09, 0.09);
    weaponGroup.add(opticLens);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.1), weaponMat);
    mag.position.set(0, -0.12, 0.08);
    mag.rotation.x = -0.25;
    weaponGroup.add(mag);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.24), weaponMat);
    stock.position.set(0, 0.01, -0.32);
    weaponGroup.add(stock);

    // Glowing skin stripes
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.3), weaponAccentMat);
    stripe.position.set(0, 0.04, 0.05);
    weaponGroup.add(stripe);

    // 6. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Idle breathing simulation
      const breath = Math.sin(elapsedTime * 2.2) * 0.012;
      torsoGroup.position.y = 0.75 + breath;
      headGroup.position.y = 0.68 + breath * 0.5;
      weaponGroup.position.y = 0.35 + breath * 0.8;
      weaponGroup.rotation.x = -0.1 + Math.sin(elapsedTime * 2.2) * 0.01;

      // Hex ring pulse
      ringMat.opacity = 0.4 + Math.sin(elapsedTime * 3) * 0.3;

      // Apply rotation
      charGroup.rotation.y = rotationYRef.current;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
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
  }, [loadout]);

  // Lighting presets update
  useEffect(() => {
    if (!keyLightRef.current || !rimLightRef.current) return;
    if (lightPreset === 'cyan') {
      keyLightRef.current.color.setHex(0x00f0ff);
      rimLightRef.current.color.setHex(0x4080ff);
    } else if (lightPreset === 'amber') {
      keyLightRef.current.color.setHex(0xffaa22);
      rimLightRef.current.color.setHex(0xff4400);
    } else if (lightPreset === 'noir') {
      keyLightRef.current.color.setHex(0xffffff);
      rimLightRef.current.color.setHex(0x555555);
    }
  }, [lightPreset]);

  // Camera zoom update
  useEffect(() => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = zoomLevel;
    cameraRef.current.position.y = 1.05 + (zoomLevel - 2.5) * 0.3;
  }, [zoomLevel]);

  // Mouse drag rotation controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMouseXRef.current;
    prevMouseXRef.current = e.clientX;
    rotationYRef.current += deltaX * 0.012;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    setZoomLevel((prev) => Math.max(1.8, Math.min(4.5, prev + e.deltaY * 0.002)));
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/60 via-slate-950/80 to-black border border-slate-800/80 shadow-2xl backdrop-blur-md">
      {/* Interactive 3D Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Tactical Holographic HUD Overlays */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-mono tracking-widest text-cyan-400 font-semibold uppercase">
            OPERATOR 3D PREVIEW // LIVE
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          PRIMARY: <span className="text-white font-bold">{loadout.primaryWeapon.replace('vanguard_', '').toUpperCase()}</span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          SKIN: <span className="text-cyan-300 font-bold">{loadout.rifleSkin.replace('_', ' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Control Tools in Bottom Left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg p-1.5 backdrop-blur-md">
        <button
          onClick={() => setZoomLevel((z) => Math.max(1.8, z - 0.4))}
          className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.min(4.5, z + 0.4))}
          className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Zoom out"
        >
          -
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={() => {
            rotationYRef.current = 0;
            setZoomLevel(3.2);
          }}
          className="px-2 py-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 rounded transition"
        >
          RESET
        </button>
      </div>

      {/* Lighting Preset Toggles */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-lg p-1.5 backdrop-blur-md">
        <button
          onClick={() => setLightPreset('cyan')}
          className={`px-2.5 py-1 text-[10px] font-mono rounded font-semibold transition ${
            lightPreset === 'cyan' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          CYAN
        </button>
        <button
          onClick={() => setLightPreset('amber')}
          className={`px-2.5 py-1 text-[10px] font-mono rounded font-semibold transition ${
            lightPreset === 'amber' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          AMBER
        </button>
        <button
          onClick={() => setLightPreset('noir')}
          className={`px-2.5 py-1 text-[10px] font-mono rounded font-semibold transition ${
            lightPreset === 'noir' ? 'bg-slate-200 text-black shadow-lg shadow-white/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          NOIR
        </button>
      </div>

      <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 pointer-events-none">
        DRAG TO ROTATE • SCROLL TO ZOOM
      </div>
    </div>
  );
};
