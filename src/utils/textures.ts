import * as THREE from 'three';

// Procedural High-Definition PBR Canvas Texture Generator for Project Vanguard
export class TextureGenerator {
  private static getContext(w: number, h: number): { canvas: any; ctx: any } | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return ctx ? { canvas, ctx } : null;
  }

  private static finalizeTexture(canvas: any): THREE.CanvasTexture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  // 1. Reinforced Industrial Architectural Concrete Tiles (High Contrast & Visible)
  public static createConcreteTiles(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    // Base concrete tone: Medium-light architectural concrete (high readability)
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro-noise & aggregate specks
    for (let i = 0; i < 60000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.floor(Math.random() * 60) - 30;
      ctx.fillStyle = `rgba(${100 + shade}, ${115 + shade}, ${135 + shade}, 0.35)`;
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    // 4x4 Concrete Paver Slabs (256x256 each)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 10;
    for (let i = 0; i <= 1024; i += 256) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    // Beveled paver slab edge highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    for (let x = 6; x < 1024; x += 256) {
      for (let y = 6; y < 1024; y += 256) {
        ctx.strokeRect(x, y, 244, 244);
      }
    }

    // Painted yellow tactical demarcation borders along paver edges
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 12;
    ctx.strokeRect(16, 16, 992, 992);

    // Diagonal safety chevrons in corners
    ctx.fillStyle = '#eab308';
    ctx.fillRect(24, 24, 64, 16);
    ctx.fillRect(24, 24, 16, 64);
    ctx.fillRect(936, 24, 64, 16);
    ctx.fillRect(984, 24, 16, 64);
    ctx.fillRect(24, 984, 64, 16);
    ctx.fillRect(24, 936, 16, 64);
    ctx.fillRect(936, 984, 64, 16);
    ctx.fillRect(984, 936, 16, 64);

    return this.finalizeTexture(canvas);
  }

  // 2. High-Tech Titanium Wall Panels (Modular Steel Cladding)
  public static createMetalWallPanel(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    // Solid Slate Steel Base
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 1024, 1024);

    // Deep panel recesses (2x2 major architectural blocks)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, 1024, 1024);

    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(1024, 512);
    ctx.stroke();

    // High-spec silver beveled chamfers
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 488, 488);
    ctx.strokeRect(524, 12, 488, 488);
    ctx.strokeRect(12, 524, 488, 488);
    ctx.strokeRect(524, 524, 488, 488);

    // Ventilation intake grills with luminescent cyan LED backlight
    const drawVent = (vx: number, vy: number) => {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(vx, vy, 400, 70);

      // Neon glow
      ctx.fillStyle = '#00f0ff';
      for (let x = vx + 16; x < vx + 384; x += 18) {
        ctx.fillRect(x, vy + 12, 6, 46);
      }
    };

    drawVent(56, 120);
    drawVent(568, 120);
    drawVent(56, 632);
    drawVent(568, 632);

    // Stainless steel perimeter bolt rivets
    ctx.fillStyle = '#f1f5f9';
    const boltPoints = [24, 128, 256, 384, 500, 536, 640, 768, 896, 1000];
    boltPoints.forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 500, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 524, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, 1000, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Technical stencils
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('SECTOR-07 // RESTRICTED ACCESS', 56, 260);
    ctx.fillText('CORE ARMOR PLATING MK-IV', 568, 260);
    ctx.fillText('MAX PRESSURE: 4200 PSI', 56, 780);
    ctx.fillText('HEAVY CONTAINMENT UNIT', 568, 780);

    return this.finalizeTexture(canvas);
  }

  // 3. Heavy Corrugated Shipping Freight Container (Blue, Red, or Orange)
  public static createShippingContainer(theme: 'BLUE' | 'RED' | 'ORANGE' = 'BLUE'): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    const baseColor = theme === 'BLUE' ? '#1d4ed8' : theme === 'RED' ? '#b91c1c' : '#d97706';
    const darkRidge = theme === 'BLUE' ? '#0f2b82' : theme === 'RED' ? '#6b1111' : '#78350f';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 1024, 1024);

    // Deep corrugated vertical fluting (3D optical ridges)
    const fluteWidth = 64;
    for (let x = 0; x < 1024; x += fluteWidth * 2) {
      // Highlight facet
      const grad = ctx.createLinearGradient(x, 0, x + fluteWidth, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, fluteWidth, 1024);

      // Shadow recess
      ctx.fillStyle = darkRidge;
      ctx.fillRect(x + fluteWidth, 0, fluteWidth, 1024);
    }

    // Heavy corner casting frames
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1024, 48);
    ctx.fillRect(0, 976, 1024, 48);
    ctx.fillRect(0, 0, 48, 1024);
    ctx.fillRect(976, 0, 48, 1024);

    // Stencil Military / Logistics identification
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VANGUARD LOGISTICS // 40FT', 512, 380);

    ctx.font = 'bold 36px monospace';
    ctx.fillText(`SERIAL: VNG-${theme}-8842-A`, 512, 450);

    // Hazard Diamond on container door
    ctx.save();
    ctx.translate(512, 640);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-70, -70, 140, 140);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(-65, -65, 130, 130);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HAZARD', 512, 648);

    return this.finalizeTexture(canvas);
  }

  // 4. Heavy Industrial Diamond Tread Metal Plate (Catwalks, Ramps, Gantries)
  public static createDiamondPlate(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    // Polished medium steel plate base
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, 512, 512);

    // Tread diamond cross-hatch pattern in bright silver
    ctx.fillStyle = '#9ca3af';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.5;

    for (let y = 16; y < 512; y += 32) {
      const offset = (y / 32) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y - 9);
        ctx.lineTo(x + 11, y);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 11, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Highlight upper edge for 3D metallic shine
        ctx.strokeStyle = '#f9fafb';
        ctx.beginPath();
        ctx.moveTo(x - 11, y);
        ctx.lineTo(x, y - 9);
        ctx.lineTo(x + 11, y);
        ctx.stroke();
      }
    }

    // Yellow safety borders along edge
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 512, 16);
    ctx.fillRect(0, 496, 512, 16);

    return this.finalizeTexture(canvas);
  }

  // 5. Arid Weathered Sandstone Ashlar Blocks (Mirage Dust)
  public static createSandstoneBlocks(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    // Golden sunbaked desert sandstone
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, 0, 1024, 1024);

    // Weathered grain noise & sand speckles
    for (let i = 0; i < 70000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const tone = Math.random() * 60 - 30;
      ctx.fillStyle = `rgba(${217 + tone}, ${130 + tone}, ${30 + tone}, 0.35)`;
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    // Ashlar stone block courses (running bond)
    const rowHeight = 128;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 10;

    for (let y = 0; y <= 1024; y += rowHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();

      const isShifted = (y / rowHeight) % 2 === 0;
      const blockWidth = 256;
      const startX = isShifted ? 0 : 128;
      for (let x = startX; x <= 1024; x += blockWidth) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowHeight);
        ctx.stroke();
      }
    }

    // Sunlit mortar bevel highlights
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 3;
    for (let y = 6; y <= 1024; y += rowHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    return this.finalizeTexture(canvas);
  }

  // 6. Dusty Wooden Munitions Crate (Desert & Compound)
  public static createWoodenCrate(label = 'MUNITIONS // DUST-X'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    // Warm cedar/pine plank wood
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal plank seams
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 8;
    for (let y = 0; y <= 512; y += 102) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Wood grain waves
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.3)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + (Math.random() * 24 - 12), 340, y + (Math.random() * 24 - 12), 512, y);
      ctx.stroke();
    }

    // Black iron corner angle brackets
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 48, 512);
    ctx.fillRect(464, 0, 48, 512);
    ctx.fillRect(0, 0, 512, 48);
    ctx.fillRect(0, 464, 512, 48);

    // Diagonal iron cross strap
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(472, 472);
    ctx.stroke();

    // Rivets
    ctx.fillStyle = '#e2e8f0';
    [24, 128, 256, 384, 488].forEach((r) => {
      ctx.beginPath();
      ctx.arc(24, r, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(488, r, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Stencil Military Markings
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VANGUARD ARSENAL', 256, 230);
    ctx.font = 'bold 18px monospace';
    ctx.fillText(label, 256, 265);

    return this.finalizeTexture(canvas);
  }

  // 7. Tactical Warning Hazard Chevron Stripes
  public static createHazardStripes(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    // Safety Yellow base
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 512, 512);

    // Black 45-degree diagonal chevrons
    ctx.fillStyle = '#0f172a';
    const stripeWidth = 64;
    for (let x = -512; x < 1024; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 512, 512);
      ctx.lineTo(x + 512 + stripeWidth, 512);
      ctx.lineTo(x + stripeWidth, 0);
      ctx.closePath();
      ctx.fill();
    }

    return this.finalizeTexture(canvas);
  }

  // 8. Military Ordnance Crate (High-Tech Armory Box)
  public static createMilitaryCrate(label = 'ORDNANCE // VANGUARD-07'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    // Olive Drab Tactical Armor
    ctx.fillStyle = '#3f4e42';
    ctx.fillRect(0, 0, 512, 512);

    // Heavy steel frame borders
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 44);
    ctx.fillRect(0, 468, 512, 44);
    ctx.fillRect(0, 0, 44, 512);
    ctx.fillRect(468, 0, 44, 512);

    // Heavy reinforced corner plates
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillRect(412, 0, 100, 100);
    ctx.fillRect(0, 412, 100, 100);
    ctx.fillRect(412, 412, 100, 100);

    // Diagonal titanium cross struts
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(44, 44);
    ctx.lineTo(468, 468);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(468, 44);
    ctx.lineTo(44, 468);
    ctx.stroke();

    // Fluorescent Stencil Text
    ctx.fillStyle = '#00f0ff';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PROJECT VANGUARD', 256, 225);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(label, 256, 260);

    // Barcode stamp
    ctx.fillStyle = '#ffffff';
    for (let x = 160; x <= 352; x += Math.random() * 8 + 4) {
      ctx.fillRect(x, 290, Math.random() * 4 + 2, 38);
    }

    return this.finalizeTexture(canvas);
  }

  // 9. Cyber Wall Panel with Luminescent Datapaths (Cyber Hangar Zero)
  public static createCyberWallPanel(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grid panels
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 1004, 1004);
    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    // Glowing Neon Circuit Traces (Magenta & Cyan)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(80, 200);
    ctx.lineTo(260, 200);
    ctx.lineTo(340, 280);
    ctx.lineTo(340, 700);
    ctx.lineTo(440, 800);
    ctx.stroke();

    ctx.strokeStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(944, 824);
    ctx.lineTo(764, 824);
    ctx.lineTo(684, 744);
    ctx.lineTo(684, 324);
    ctx.lineTo(584, 224);
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('CYBER-ZERO // UNIT-88', 120, 160);

    return this.finalizeTexture(canvas);
  }

  // 10. Heavy Corrugated Hangar Siding
  public static createCorrugatedHangarSheet(tint = '#334155'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      const tex = new THREE.Texture() as THREE.CanvasTexture;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 512);

    const ridgeWidth = 32;
    for (let x = 0; x < 512; x += ridgeWidth * 2) {
      const grad = ctx.createLinearGradient(x, 0, x + ridgeWidth, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, ridgeWidth, 512);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x + ridgeWidth, 0, ridgeWidth, 512);
    }

    return this.finalizeTexture(canvas);
  }

  // 11. High-Vis Stencil Bomb Site Plant Zone Decal ('A' or 'B')
  public static createSiteDecal(letter: 'A' | 'B', accentColor = '#00f0ff'): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    ctx.clearRect(0, 0, 1024, 1024);

    // Outer Target Rings
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(512, 512, 480, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.setLineDash([40, 20]);
    ctx.beginPath();
    ctx.arc(512, 512, 420, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Background tint
    ctx.fillStyle = `${accentColor}28`;
    ctx.beginPath();
    ctx.arc(512, 512, 400, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair Brackets
    const crossWidth = 70;
    ctx.fillStyle = accentColor;
    ctx.fillRect(512 - crossWidth / 2, 30, crossWidth, 110);
    ctx.fillRect(512 - crossWidth / 2, 884, crossWidth, 110);
    ctx.fillRect(30, 512 - crossWidth / 2, 110, crossWidth);
    ctx.fillRect(884, 512 - crossWidth / 2, 110, crossWidth);

    // Stencil Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 460px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 512, 480);

    // Stencil Cutouts
    ctx.fillStyle = '#06090e';
    ctx.fillRect(450, 240, 124, 32);
    ctx.fillRect(450, 540, 124, 32);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 54px monospace';
    ctx.fillText(`SPIKE PLANT ZONE ${letter}`, 512, 750);

    return this.finalizeTexture(canvas);
  }

  // 12. Server Rack & Mainframe Electronics
  public static createServerRackTexture(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 1024);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 1024);

    ctx.fillStyle = '#334155';
    ctx.fillRect(16, 0, 32, 1024);
    ctx.fillRect(464, 0, 32, 1024);

    const unitH = 120;
    for (let u = 20; u < 1000; u += unitH + 6) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(52, u, 408, unitH);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(52, u, 408, unitH);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(60, u + 20, 12, 80);
      ctx.fillRect(440, u + 20, 12, 80);

      // Bright LEDs
      for (let ledX = 90; ledX < 260; ledX += 24) {
        const color = Math.random() < 0.6 ? '#10b981' : Math.random() < 0.8 ? '#00f0ff' : '#f59e0b';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ledX, u + 30, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#020617';
      ctx.fillRect(90, u + 50, 330, 50);
      for (let gx = 95; gx < 415; gx += 10) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(gx, u + 52, 4, 46);
      }
    }

    return this.finalizeTexture(canvas);
  }

  // 13. Safety Red Explosive Fuel Barrel
  public static createExplosiveBarrelTexture(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 60, 512, 28);
    ctx.fillRect(0, 244, 512, 28);
    ctx.fillRect(0, 428, 512, 28);

    ctx.save();
    ctx.translate(256, 170);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-60, -60, 120, 120);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(-55, -55, 110, 110);
    ctx.restore();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLAMMABLE', 256, 178);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px monospace';
    ctx.fillText('DANGER // EXPLOSIVE', 256, 330);

    return this.finalizeTexture(canvas);
  }

  // 14. Directional Tactical Wall Signage (Arrows to Sites & Mid)
  public static createDirectionalSign(target: 'SITE A' | 'SITE B' | 'MID'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 256);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    const accent = target === 'SITE A' ? '#00f0ff' : target === 'SITE B' ? '#f59e0b' : '#10b981';

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = accent;
    ctx.fillRect(16, 16, 480, 40);

    ctx.fillStyle = '#000000';
    ctx.font = '900 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TACTICAL NAVIGATION', 28, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`➔ ${target}`, 256, 150);

    ctx.fillStyle = accent;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ARMED ESCORT REQUIRED', 256, 210);

    return this.finalizeTexture(canvas);
  }

  // 15. Concrete Jersey Barrier (Highway Divider with Chevrons)
  public static createJerseyBarrier(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 256);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    // Heavy grey concrete
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 512, 256);

    // Grime & erosion
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 256, 3, 3);
    }

    // Top safety yellow chevron band
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 512, 70);

    // Black chevrons on top
    ctx.fillStyle = '#0f172a';
    for (let x = -70; x < 600; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 50, 70);
      ctx.lineTo(x + 90, 70);
      ctx.lineTo(x + 40, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Concrete base drainage slot
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(180, 220, 152, 36);

    return this.finalizeTexture(canvas);
  }

  // 16. Tactical Signage (Custom Title/Subtitle)
  public static createSignage(title: string, subtitle: string, accentColor = '#00f0ff'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 256);
    if (!contextObj) {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 240);

    ctx.fillStyle = accentColor;
    ctx.fillRect(14, 14, 484, 32);

    ctx.fillStyle = '#000000';
    ctx.font = 'black 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TACTICAL SECTOR TELEMETRY', 24, 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 125);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 18px monospace';
    ctx.fillText(subtitle, 256, 175);

    return this.finalizeTexture(canvas);
  }

  // 17. Arid Wind-Blown Desert Sand Dunes (Wind ripples, coarse grain, pebbles)
  public static createDesertSandDunes(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    // Base warm desert gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.7, '#fbbf24');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Dune wind ripple ridges
    ctx.lineWidth = 12;
    for (let y = 0; y < 1024; y += 32) {
      ctx.strokeStyle = y % 64 === 0 ? 'rgba(254, 243, 199, 0.4)' : 'rgba(180, 83, 9, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) {
        const offset = Math.sin((x + y) * 0.02) * 14;
        ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Coarse sand granules & scattered pebbles
    for (let i = 0; i < 4000; i++) {
      const px = Math.random() * 1024;
      const py = Math.random() * 1024;
      const r = Math.random() * 2.2 + 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 53, 15, 0.4)' : 'rgba(254, 240, 138, 0.5)';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return this.finalizeTexture(canvas);
  }

  // 18. Weathered Stucco / Adobe Plaster with Exposed Sandstone Bricks
  public static createAdobeWall(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    // Plaster base
    ctx.fillStyle = '#e2d5c3';
    ctx.fillRect(0, 0, 1024, 1024);

    // Weathering stains & grunge
    for (let i = 0; i < 60; i++) {
      const gx = Math.random() * 1024;
      const gy = Math.random() * 1024;
      const gr = Math.random() * 120 + 30;
      const radGrad = ctx.createRadialGradient(gx, gy, 10, gx, gy, gr);
      radGrad.addColorStop(0, 'rgba(180, 140, 110, 0.35)');
      radGrad.addColorStop(1, 'rgba(226, 213, 195, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Exposed terracotta brick patches where plaster peeled off
    const drawPeelPatch = (cx: number, cy: number, w: number, h: number) => {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(cx, cy, w, h);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      // Brick grid
      for (let by = cy; by < cy + h; by += 28) {
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(cx + w, by);
        ctx.stroke();
        const stagger = (by / 28) % 2 === 0 ? 0 : 35;
        for (let bx = cx + stagger; bx < cx + w; bx += 70) {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx, by + 28);
          ctx.stroke();
        }
      }
      // Rough cracked plaster border
      ctx.strokeStyle = '#c4b5a0';
      ctx.lineWidth = 6;
      ctx.strokeRect(cx - 2, cy - 2, w + 4, h + 4);
    };

    drawPeelPatch(80, 600, 320, 240);
    drawPeelPatch(620, 140, 280, 180);

    return this.finalizeTexture(canvas);
  }

  // 19. Intricate Mediterranean / Moroccan Mosaic Arch Tile
  public static createMosaicArchTile(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 64;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const isCenter = (x / tileSize + y / tileSize) % 2 === 0;
        ctx.fillStyle = isCenter ? '#0284c7' : '#0369a1';
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Intricate geometric star
        ctx.fillStyle = isCenter ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 8, y + 8, tileSize - 16, tileSize - 16);
      }
    }

    return this.finalizeTexture(canvas);
  }

  // 20. Realistic Date Palm Tree Bark
  public static createPalmTrunkTexture(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 1024);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 512, 1024);

    // Overlapping leaf base scars (diamond scale pattern)
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 5;
    ctx.fillStyle = '#92400e';

    for (let y = 0; y < 1024; y += 40) {
      const xOffset = (y / 40) % 2 === 0 ? 0 : 32;
      for (let x = -32; x < 544; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x + xOffset, y);
        ctx.lineTo(x + xOffset + 32, y + 20);
        ctx.lineTo(x + xOffset + 64, y);
        ctx.lineTo(x + xOffset + 32, y - 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    return this.finalizeTexture(canvas);
  }

  // 21. Realistic Date Palm Frond / Leaves
  public static createPalmLeafTexture(): THREE.CanvasTexture {
    const contextObj = this.getContext(256, 1024);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    ctx.clearRect(0, 0, 256, 1024);

    // Central leaf spine / stem
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 1024);
    ctx.stroke();

    // Leaf leaflets branching outward
    ctx.lineWidth = 4;
    for (let y = 40; y < 1000; y += 12) {
      const length = Math.sin((y / 1000) * Math.PI) * 110;
      ctx.strokeStyle = y % 24 === 0 ? '#4d7c0f' : '#84cc16';
      // Left leaflet
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(128 - length, y + 25);
      ctx.stroke();
      // Right leaflet
      ctx.beginPath();
      ctx.moveTo(128, y);
      ctx.lineTo(128 + length, y + 25);
      ctx.stroke();
    }

    return this.finalizeTexture(canvas);
  }

  // 22. Military Sandbags Wall Barricade
  public static createSandbagsTexture(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    // Burlap color
    ctx.fillStyle = '#a89474';
    ctx.fillRect(0, 0, 512, 512);

    // Coarse burlap weave noise
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(92, 77, 56, 0.4)' : 'rgba(215, 200, 175, 0.4)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    // Stacked sandbag rows with curved seams
    ctx.strokeStyle = '#4e412e';
    ctx.lineWidth = 6;
    const rowH = 64;
    for (let y = 0; y < 512; y += rowH) {
      const stagger = (y / rowH) % 2 === 0 ? 0 : 80;
      for (let x = -80; x < 600; x += 160) {
        const bagX = x + stagger;
        ctx.fillStyle = '#b5a181';
        ctx.beginPath();
        // Pillow/bag shape
        ctx.roundRect(bagX + 4, y + 4, 152, rowH - 8, 16);
        ctx.fill();
        ctx.stroke();

        // Tied end gathering
        ctx.fillStyle = '#3f3424';
        ctx.beginPath();
        ctx.arc(bagX + 146, y + rowH / 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return this.finalizeTexture(canvas);
  }

  // 23. High-Tech Obsidian Carbon-Fiber Hexagonal Armor Plating
  public static createCarbonHexTile(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, 512, 512);

    const r = 32;
    const h = r * Math.sqrt(3);
    const drawHex = (cx: number, cy: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = cx + r * Math.cos(angle);
        const hy = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    };

    for (let cy = 0; cy < 512 + h; cy += h) {
      const isShift = Math.floor(cy / h) % 2 === 1;
      for (let cx = isShift ? -r * 1.5 : 0; cx < 512 + r * 3; cx += r * 3) {
        ctx.fillStyle = '#111827';
        drawHex(cx, cy);
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner micro-circuit
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return this.finalizeTexture(canvas);
  }

  // 24. Heavy Blast Door with Hydraulic Locks & Caution Chevrons
  public static createHeavyBlastDoor(): THREE.CanvasTexture {
    const contextObj = this.getContext(1024, 1024);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    // Dark titanium finish
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1024, 1024);

    // Massive perimeter reinforced frame
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, 984, 984);

    // Vertical center split seam
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    // Caution Hazard Bars top and bottom
    const drawChevrons = (topY: number) => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(60, topY, 904, 80);
      ctx.fillStyle = '#000000';
      for (let x = 60; x < 960; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x + 50, topY + 80);
        ctx.lineTo(x + 90, topY + 80);
        ctx.lineTo(x + 40, topY);
        ctx.closePath();
        ctx.fill();
      }
    };

    drawChevrons(80);
    drawChevrons(864);

    // Heavy hydraulic locking bolt cylinders
    const drawLockBolt = (lx: number, ly: number) => {
      ctx.fillStyle = '#475569';
      ctx.fillRect(lx, ly, 160, 48);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.strokeRect(lx, ly, 160, 48);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lx + 80, ly + 24, 12, 0, Math.PI * 2);
      ctx.fill();
    };

    drawLockBolt(180, 360);
    drawLockBolt(684, 360);
    drawLockBolt(180, 600);
    drawLockBolt(684, 600);

    // Stencil labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY CONTAINMENT BLAST GATE', 512, 240);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('AUTOMATIC HIGH-PRESSURE HYDRAULIC SEAL', 512, 280);

    return this.finalizeTexture(canvas);
  }

  // 25. High-Tech Tactical Radar Console Screen
  public static createRadarConsoleScreen(): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, 512, 512);

    // Phosphor green radar grid
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.arc(256, 256, 140, 0, Math.PI * 2);
    ctx.arc(256, 256, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(256, 36);
    ctx.lineTo(256, 476);
    ctx.moveTo(36, 256);
    ctx.lineTo(476, 256);
    ctx.stroke();

    // Sweeping radar angle
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.arc(256, 256, 200, -Math.PI / 4, Math.PI / 8);
    ctx.closePath();
    ctx.fill();

    // Blips
    const blips = [
      { x: 320, y: 190, color: '#ef4444' },
      { x: 210, y: 340, color: '#00f0ff' },
      { x: 380, y: 300, color: '#f59e0b' },
    ];
    blips.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Telemetry text
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('TACTICAL SURVEILLANCE // 60HZ', 40, 490);
    ctx.fillText('THREAT LEVEL: CRITICAL', 40, 30);

    return this.finalizeTexture(canvas);
  }

  // 26. Market Stall Fabric Canopy (Striped)
  public static createFabricCanopy(colorA = '#dc2626', colorB = '#f8fafc'): THREE.CanvasTexture {
    const contextObj = this.getContext(512, 512);
    if (!contextObj) return new THREE.Texture() as THREE.CanvasTexture;
    const { canvas, ctx } = contextObj;

    const stripeW = 64;
    for (let x = 0; x < 512; x += stripeW) {
      ctx.fillStyle = (x / stripeW) % 2 === 0 ? colorA : colorB;
      ctx.fillRect(x, 0, stripeW, 512);
    }

    // Weathering wrinkles
    for (let y = 0; y < 512; y += 32) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, y, 512, 4);
    }

    return this.finalizeTexture(canvas);
  }
}

