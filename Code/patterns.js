/* ==========================================================================
   WAVEFRONT - Pattern Engine & Fairness Math
   Implements Cascade (sweeping surf waves), Scissor (dynamic pincer cross),
   Boulder & Homing Needle (actively tracks/follows the player),
   Rolling Crescent Boulders, Fairness Math, and Increased Difficulty Scaling.
   ========================================================================== */

class PatternEngine {
  constructor(game) {
    this.game = game;
    this.patternTypes = ['cascade', 'scissor', 'boulderNeedle'];
    this.currentPattern = 'cascade';
    this.patternTimer = 0;
    this.patternDuration = 10000; // ms per pattern phase
    this.spawnTimer = 0;
    this.subPatternStep = 0;

    // Rolling crescent hazard ball timer (Endless mode)
    this.rollingBoulderTimer = 0;
    this.rollingBoulderInterval = 9000; // Drops every 8-10s for intense action!

    // Fairness Math constants
    this.playerSafetyMargin = 40;
  }

  reset() {
    this.patternTimer = 0;
    this.spawnTimer = 0;
    this.subPatternStep = 0;
    this.rollingBoulderTimer = 2500; // First drops after 2.5s
    this.currentPattern = 'cascade';
    this.generateGridTracks();
  }

  generateGridTracks() {
    const w = this.game.width;
    const h = this.game.height;
    this.tracks = [];

    const spacing = 85;
    const numLines = Math.ceil((w + h) / spacing);

    for (let i = -numLines; i <= numLines; i++) {
      this.tracks.push({
        id: `diag_ltr_${i}`,
        type: 'diagonal_ltr',
        angle: Math.PI / 4,
        startX: i * spacing,
        startY: -60,
        dirX: Math.cos(Math.PI / 4),
        dirY: Math.sin(Math.PI / 4)
      });
    }

    for (let i = -numLines; i <= numLines; i++) {
      this.tracks.push({
        id: `diag_rtl_${i}`,
        type: 'diagonal_rtl',
        angle: 3 * Math.PI / 4,
        startX: w + i * spacing,
        startY: -60,
        dirX: Math.cos(3 * Math.PI / 4),
        dirY: Math.sin(3 * Math.PI / 4)
      });
    }
  }

  update(dt) {
    this.patternTimer += dt;
    this.spawnTimer += dt;

    // Rolling crescent ball timer in Endless mode
    if (this.game.gameMode === 'endless' && this.game.currentTrack && this.game.currentTrack.id === 'crescent') {
      this.rollingBoulderTimer += dt;
      const interval = Math.max(5000, this.rollingBoulderInterval / (this.game.difficultyMultiplier || 1.0));
      if (this.rollingBoulderTimer >= interval) {
        this.rollingBoulderTimer = 0;
        this.spawnRollingCrescentBoulder();
      }
    }

    // Switch patterns periodically
    if (this.patternTimer >= this.patternDuration) {
      this.patternTimer = 0;
      this.subPatternStep = 0;
      const nextIdx = (this.patternTypes.indexOf(this.currentPattern) + 1) % this.patternTypes.length;
      this.currentPattern = this.patternTypes[nextIdx];
      this.game.onPatternChanged(this.currentPattern);
    }

    const scaling = this.getScalingParams();
    // Faster, punchier spawn pacing
    const spawnInterval = Math.max(260, 850 / (scaling.speedMultiplier * (this.game.difficultyMultiplier || 1)));

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.executePatternSpawn(scaling);
    }
  }

  /* --------------------------------------------------------------------------
     ROLLING CRESCENT HAZARD BOULDER
     -------------------------------------------------------------------------- */
  spawnRollingCrescentBoulder() {
    const fromLeft = Math.random() < 0.5;
    const startT = fromLeft ? 0.08 : 0.92;
    const rollDir = fromLeft ? 1 : -1;

    const pt = this.game.currentTrack.getPointAt(startT);

    this.game.spawnRollingBoulder({
      startX: pt.x,
      startY: -60,
      targetLandingY: pt.y,
      trackPos: startT,
      rollDir: rollDir,
      state: 'falling',
      radius: 36,
      rollSpeed: (fromLeft ? 0.35 : -0.35) * (this.game.difficultyMultiplier || 1.0),
      rotation: 0
    });
  }

  /* --------------------------------------------------------------------------
     SCALING PARAMS (Tuned for dynamic, intense arcade feel)
     -------------------------------------------------------------------------- */
  getScalingParams() {
    const elapsedSec = this.game.survivalTime;
    const diffMult = this.game.difficultyMultiplier || 1.0;

    let tier = 1;
    let ballCountMin = 3, ballCountMax = 5;
    let baseSpeedMult = 1.25;
    let sizeDist = 'all_small';
    let trackMode = 'single';

    if (elapsedSec > 60) {
      tier = 3;
      ballCountMin = 10; ballCountMax = 16;
      baseSpeedMult = 2.0; // Higher cap for adrenaline
      sizeDist = 'alternating_extremes';
      trackMode = 'grid3plus';
    } else if (elapsedSec > 25) {
      tier = 2;
      ballCountMin = 6; ballCountMax = 9;
      baseSpeedMult = 1.6;
      sizeDist = 'thirty_percent_large';
      trackMode = 'dual_crisscross';
    }

    const effectiveSpeedMult = Math.min(2.5, baseSpeedMult * diffMult);
    const countMin = Math.round(ballCountMin * (diffMult >= 1.3 ? 1.2 : 1.0));
    const countMax = Math.round(ballCountMax * (diffMult >= 1.3 ? 1.2 : 1.0));

    return {
      tier,
      speedMultiplier: effectiveSpeedMult,
      countMin,
      countMax,
      sizeDist,
      trackMode
    };
  }

  executePatternSpawn(scaling) {
    switch (this.currentPattern) {
      case 'cascade':
        this.spawnCascadePattern(scaling);
        break;
      case 'scissor':
        this.spawnScissorPattern(scaling);
        break;
      case 'boulderNeedle':
        this.spawnBoulderNeedlePattern(scaling);
        break;
    }
  }

  /* --------------------------------------------------------------------------
     1. CASCADE PATTERN: Sequential sweeping wave targeting player's lane
     Forces player to actively surf behind the leading ball!
     -------------------------------------------------------------------------- */
  spawnCascadePattern(scaling) {
    const player = this.game.player;
    const playerX = player ? player.x : this.game.width / 2;

    const direction = (Math.floor(this.subPatternStep / 4) % 2 === 0) ? 1 : -1;
    const waveStep = this.subPatternStep % 4;
    this.subPatternStep++;

    // Center cascade wave around player's active quadrant
    const baseOffset = (waveStep - 1.5) * (70 * direction);
    const startX = playerX + baseOffset;

    const angle = direction === 1 ? (Math.PI / 3) : (2 * Math.PI / 3);
    const speed = (220 + waveStep * 20) * scaling.speedMultiplier;
    const radius = this.determineBallRadius(scaling, false);

    const ballConfig = {
      x: Math.max(40, Math.min(this.game.width - 40, startX)),
      y: -35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: radius,
      type: this.rollBallType(),
      originPattern: 'cascade'
    };

    if (this.isSpawnFair(ballConfig)) {
      this.game.spawnBall(ballConfig);
    } else {
      ballConfig.x += (direction * 70);
      if (this.isSpawnFair(ballConfig)) {
        this.game.spawnBall(ballConfig);
      }
    }
  }

  /* --------------------------------------------------------------------------
     2. SCISSOR PATTERN: Dynamic Pincers crossing at dip and player's position
     -------------------------------------------------------------------------- */
  spawnScissorPattern(scaling) {
    this.subPatternStep++;
    const speed = 250 * scaling.speedMultiplier;
    const player = this.game.player;

    // Alternates between the crescent dip and player's current position for the pinch point
    const targetPoint = (this.subPatternStep % 2 === 0 && player)
      ? { x: player.x, y: player.y }
      : this.game.getCrescentDipPoint();

    const leftStartX = Math.max(30, targetPoint.x - 320);
    const leftStartY = -35;
    const dxL = targetPoint.x - leftStartX;
    const dyL = targetPoint.y - leftStartY;
    const distL = Math.hypot(dxL, dyL);

    const rightStartX = Math.min(this.game.width - 30, targetPoint.x + 320);
    const rightStartY = -35;
    const dxR = targetPoint.x - rightStartX;
    const dyR = targetPoint.y - rightStartY;
    const distR = Math.hypot(dxR, dyR);

    const radius = this.determineBallRadius(scaling, false);

    const ballLeft = {
      x: leftStartX,
      y: leftStartY,
      vx: (dxL / distL) * speed,
      vy: (dyL / distL) * speed,
      radius: radius,
      type: this.rollBallType(),
      originPattern: 'scissor'
    };

    const ballRight = {
      x: rightStartX,
      y: rightStartY,
      vx: (dxR / distR) * speed,
      vy: (dyR / distR) * speed,
      radius: radius,
      type: this.rollBallType(),
      originPattern: 'scissor'
    };

    if (this.isSpawnFair(ballLeft)) {
      this.game.spawnBall(ballLeft);
    }
    setTimeout(() => {
      if (this.game.isRunning && this.isSpawnFair(ballRight)) {
        this.game.spawnBall(ballRight);
      }
    }, 110);
  }

  /* --------------------------------------------------------------------------
     3. BOULDER & HOMING NEEDLE (FOLLOWS THE PLAYER!):
     - The giant divider boulder traps the player in one sector
     - The Needle/Spot actively HOMES IN and FOLLOWS the player's movement!
     -------------------------------------------------------------------------- */
  spawnBoulderNeedlePattern(scaling) {
    const isBoulderWave = (this.subPatternStep % 4 === 0);
    this.subPatternStep++;
    const player = this.game.player;

    if (isBoulderWave) {
      // Spawn giant divider boulder in the sector opposite to player or blocking exit
      const playerSector = (player && player.x > this.game.width / 2) ? 1 : -1;
      // Boulder drops in opposite sector to wall off safe escape
      const boulderSector = -playerSector;
      const boulderX = this.game.width / 2 + (boulderSector * 170);
      const speed = 145 * scaling.speedMultiplier;

      const boulderConfig = {
        x: boulderX,
        y: -65,
        vx: 0,
        vy: speed,
        radius: 54, // Giant divider boulder
        type: 'hazard_striped_red',
        isBoulder: true,
        originPattern: 'boulderNeedle'
      };

      if (this.isSpawnFair(boulderConfig)) {
        this.game.spawnBall(boulderConfig);
      }
    } else {
      // HOMING NEEDLE: Actively follows the player!
      const startX = player ? player.x + (Math.random() - 0.5) * 140 : this.game.width / 2;
      const startY = -35;
      const speed = 310 * scaling.speedMultiplier;

      // Vector pointing directly at current player coordinates
      const targetX = player ? player.x : this.game.width / 2;
      const targetY = player ? (player.y - (player.jumpHeight || 0)) : this.game.height * 0.7;
      const dx = targetX - startX;
      const dy = targetY - startY;
      const dist = Math.hypot(dx, dy) || 1;

      // Homing seeker configuration
      const homingDartConfig = {
        x: startX,
        y: startY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        radius: 18,
        type: this.rollBallType(),
        originPattern: 'boulderNeedle',
        isHoming: true, // Follows the player!
        homingStrength: 3.2 * (this.game.difficultyMultiplier || 1.0), // Active steering agility
        targetPlayer: true
      };

      if (this.isSpawnFair(homingDartConfig)) {
        this.game.spawnBall(homingDartConfig);
      }
    }
  }

  /* --------------------------------------------------------------------------
     FAIRNESS MATH: Discard/delay if TimeToImpact < DistanceToSafety / v_player
     -------------------------------------------------------------------------- */
  isSpawnFair(ball) {
    const player = this.game.player;
    if (!player) return true;

    const intersection = this.game.calculateTrackIntersection(ball);
    if (!intersection) return true;

    const distToIntersect = Math.hypot(intersection.x - ball.x, intersection.y - ball.y);
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (ballSpeed <= 0) return true;
    const timeToImpact = distToIntersect / ballSpeed;

    const clearanceNeeded = player.radius + ball.radius + this.playerSafetyMargin;
    const distPlayerToImpact = Math.abs(player.trackPos - intersection.trackPos) * this.game.currentTrack.length;

    if (distPlayerToImpact > clearanceNeeded) {
      return true;
    }

    const distanceToSafety = Math.max(0, clearanceNeeded - distPlayerToImpact);
    const timeToSafety = distanceToSafety / player.maxSpeed;

    if (timeToImpact < timeToSafety) {
      return false; // Mathematical unfairness detected: discard/delay spawn
    }

    return true;
  }

  determineBallRadius(scaling, forceBoulder = false) {
    if (forceBoulder) return 54;

    if (scaling.sizeDist === 'alternating_extremes') {
      return Math.random() < 0.65 ? 18 : 52;
    } else if (scaling.sizeDist === 'thirty_percent_large') {
      return Math.random() < 0.3 ? 38 : 22;
    }
    return 22;
  }

  rollBallType() {
    const rand = Math.random();
    if (rand < 0.76) {
      return 'hazard_striped_red';
    } else if (rand < 0.85) {
      return 'powerup_solid_red';
    } else if (rand < 0.93) {
      return 'powerup_solid_green';
    } else {
      return 'trap_striped_green';
    }
  }
}

window.PatternEngine = PatternEngine;
