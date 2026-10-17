/* ==========================================================================
   WAVEFRONT - Track Geometries & Adventure Levels
   Implements 2D crescent slider (Diagram 1) and 8 distinct adventure track shapes.
   ========================================================================== */

class TrackManager {
  constructor(game) {
    this.game = game;
  }

  getTrack(type, stage = 1) {
    const w = this.game.width;
    const h = this.game.height;

    switch (type) {
      case 'crescent':
        return this.createCrescentTrack(w, h);
      case 'orbit':
        return this.createOrbitTrack(w, h);
      case 'twin_dip':
        return this.createTwinDipTrack(w, h);
      case 'infinity':
        return this.createInfinityTrack(w, h);
      case 'spiral':
        return this.createSpiralTrack(w, h);
      case 'triple_crest':
        return this.createTripleCrestTrack(w, h);
      case 'diamond':
        return this.createDiamondTrack(w, h);
      case 'vortex':
        return this.createVortexTrack(w, h);
      default:
        return this.createCrescentTrack(w, h);
    }
  }

  /* --------------------------------------------------------------------------
     1. CRESCENT SLIDE TRACK (Matches Diagram 1)
     -------------------------------------------------------------------------- */
  createCrescentTrack(w, h) {
    const centerX = w / 2;
    const centerY = h * 0.32;
    const radiusX = Math.min(w * 0.46, 540);
    const radiusY = Math.min(h * 0.44, 430);

    const startAngle = Math.PI * 0.12;
    const endAngle = Math.PI * 0.88;
    const arcSpan = endAngle - startAngle;

    const getPointAt = (t) => {
      // t in [0, 1] from left wing (t=0) through dip (t=0.5) to right wing (t=1)
      const angle = startAngle + t * arcSpan;
      const x = centerX - radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      // Tangent direction angle along the curve
      const tangentAngle = angle + Math.PI / 2;
      return { x, y, angle, tangentAngle };
    };

    const length = radiusX * arcSpan;

    return {
      id: 'crescent',
      name: 'Crescent Basin',
      isLoop: false,
      length: length,
      trackWidth: 26,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        const steps = 80;

        // Outer rail glow
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 26;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner guide core line
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || 'rgba(0, 210, 255, 0.8)';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     2. ORBITAL RING (Stage 2)
     -------------------------------------------------------------------------- */
  createOrbitTrack(w, h) {
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.36;

    const getPointAt = (t) => {
      const angle = t * Math.PI * 2 - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, angle, tangentAngle: angle + Math.PI / 2 };
    };

    return {
      id: 'orbit',
      name: 'Orbital Ring',
      isLoop: false,
      length: 2 * Math.PI * radius,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = theme.trackColor || 'rgba(0, 210, 255, 0.45)';
        ctx.lineWidth = 24;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#00d2ff';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     3. TWIN DIP WAVE (Stage 3)
     -------------------------------------------------------------------------- */
  createTwinDipTrack(w, h) {
    const startX = w * 0.12;
    const endX = w * 0.88;
    const spanX = endX - startX;
    const midY = h * 0.58;
    const ampY = h * 0.22;

    const getPointAt = (t) => {
      const x = startX + t * spanX;
      const y = midY - ampY * Math.cos(t * Math.PI * 2.5);
      return { x, y };
    };

    return {
      id: 'twin_dip',
      name: 'Twin Dip Wave',
      isLoop: false,
      length: spanX * 1.3,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.25),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        const steps = 90;
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(255, 145, 0, 0.45)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#ff9100';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     4. INFINITY WEAVE (Stage 4)
     -------------------------------------------------------------------------- */
  createInfinityTrack(w, h) {
    const centerX = w / 2;
    const centerY = h / 2;
    const a = Math.min(w * 0.42, 420);

    const getPointAt = (t) => {
      const theta = t * Math.PI * 2 - Math.PI / 2;
      const denom = 1 + Math.sin(theta) * Math.sin(theta);
      const x = centerX + (a * Math.cos(theta)) / denom;
      const y = centerY + (a * Math.sin(theta) * Math.cos(theta)) / denom * 1.6;
      return { x, y };
    };

    return {
      id: 'infinity',
      name: 'Infinity Weave',
      isLoop: false,
      length: a * 4.8,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(255, 23, 68, 0.45)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#ff1744';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     5. SPIRAL NEBULA (Stage 5)
     -------------------------------------------------------------------------- */
  createSpiralTrack(w, h) {
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.min(w, h) * 0.42;
    const minRadius = 50;

    const getPointAt = (t) => {
      const r = minRadius + t * (maxRadius - minRadius);
      const angle = t * Math.PI * 4; // 2 complete spiral revolutions
      const x = centerX + r * Math.cos(angle);
      const y = centerY + r * Math.sin(angle);
      return { x, y };
    };

    return {
      id: 'spiral',
      name: 'Spiral Nebula',
      isLoop: false,
      length: maxRadius * 3.8,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        const steps = 140;
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(0, 255, 136, 0.45)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#00ff88';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     6. TRIPLE CREST MOUNTAIN (Stage 6)
     -------------------------------------------------------------------------- */
  createTripleCrestTrack(w, h) {
    const startX = w * 0.1;
    const endX = w * 0.9;
    const spanX = endX - startX;
    const midY = h * 0.55;
    const ampY = h * 0.22;

    const getPointAt = (t) => {
      const x = startX + t * spanX;
      const y = midY - ampY * Math.sin(t * Math.PI * 3);
      return { x, y };
    };

    return {
      id: 'triple_crest',
      name: 'Triple Crest Apex',
      isLoop: false,
      length: spanX * 1.45,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.33),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        const steps = 110;
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(255, 61, 0, 0.45)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#ff3d00';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     7. DIAMOND WARP (Stage 7)
     -------------------------------------------------------------------------- */
  createDiamondTrack(w, h) {
    const centerX = w / 2;
    const centerY = h / 2;
    const halfW = Math.min(w * 0.38, 380);
    const halfH = Math.min(h * 0.38, 320);

    const corners = [
      { x: centerX, y: centerY - halfH }, // Top
      { x: centerX + halfW, y: centerY }, // Right
      { x: centerX, y: centerY + halfH }, // Bottom
      { x: centerX - halfW, y: centerY }, // Left
      { x: centerX, y: centerY - halfH }  // Loop back
    ];

    const getPointAt = (t) => {
      // 4 segments
      const segmentProgress = t * 4;
      const segIndex = Math.min(3, Math.floor(segmentProgress));
      const segT = segmentProgress - segIndex;
      const p1 = corners[segIndex];
      const p2 = corners[segIndex + 1];
      const x = p1.x + (p2.x - p1.x) * segT;
      const y = p1.y + (p2.y - p1.y) * segT;
      return { x, y };
    };

    return {
      id: 'diamond',
      name: 'Diamond Perimeter',
      isLoop: false,
      length: (halfW + halfH) * 2.8,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < corners.length; i++) {
          if (i === 0) ctx.moveTo(corners[i].x, corners[i].y);
          else ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(0, 210, 255, 0.45)';
        ctx.lineWidth = 24;
        ctx.lineJoin = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#00d2ff';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }
    };
  }

  /* --------------------------------------------------------------------------
     8. COSMIC VORTEX (Stage 8)
     -------------------------------------------------------------------------- */
  createVortexTrack(w, h) {
    const centerX = w / 2;
    const centerY = h / 2;
    const rx = Math.min(w * 0.38, 400);
    const ry = Math.min(h * 0.35, 300);

    const getPointAt = (t) => {
      // Hypocycloid / Lissajous curve
      const angle = t * Math.PI * 2;
      const x = centerX + rx * Math.cos(angle) + (rx * 0.3) * Math.cos(angle * 3);
      const y = centerY + ry * Math.sin(angle) - (ry * 0.3) * Math.sin(angle * 3);
      return { x, y };
    };

    return {
      id: 'vortex',
      name: 'Cosmic Vortex (Master)',
      isLoop: false,
      length: rx * 5.2,
      trackWidth: 24,
      getPointAt: getPointAt,
      getDipPoint: () => getPointAt(0.5),
      drawTrack: (ctx, theme) => {
        ctx.save();
        ctx.beginPath();
        const steps = 140;
        for (let i = 0; i <= steps; i++) {
          const pt = getPointAt(i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = theme.trackColor || 'rgba(255, 23, 68, 0.55)';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = theme.glowColor || '#ff1744';
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      }
    };
  }
}

window.TrackManager = TrackManager;
