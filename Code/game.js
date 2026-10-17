/* ==========================================================================
   WAVEFRONT - Core Game Engine
   Connects Canvas, Physics, Jumps, Rolling Boulders, Shaders, Input, and 8 Stages.
   ========================================================================== */

class GameEngine {
  constructor() {
    this.bgCanvas = document.getElementById('bg-canvas');
    this.bgCtx = this.bgCanvas.getContext('2d');
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Subsystems
    this.trackMgr = new TrackManager(this);
    this.patternEngine = new PatternEngine(this);

    // Game state
    this.currentScene = 'menu'; // 'menu', 'mode', 'game'
    this.gameMode = 'endless'; // 'endless', 'adventure'
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard', 'nightmare'
    this.currentStage = 1;
    this.totalStages = 8;
    this.difficultyMultiplier = 1.0;

    this.isRunning = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.survivalTime = 0;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('wavefront_highscore') || localStorage.getItem('orbital_weave_highscore') || '0', 10);
    this.hazardsDodged = 0;
    this.powerupsCollected = 0;
    this.cameraShake = 0;

    // Active power-up states
    this.powerupInvulnerableTime = 0;
    this.powerupChronoTime = 0;
    this.trapInversionTime = 0;

    // Entities
    this.player = null;
    this.balls = [];
    this.rollingBoulders = [];
    this.particles = [];
    this.lavaCracks = [];
    this.ambientParticles = [];

    // Inputs
    this.keys = { left: false, right: false, jump: false };
    this.pointerPos = null;

    this.initResize();
    this.initBackgroundEffects();
    this.bindEvents();
    this.updateHighScoreDisplay();

    // Start background render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  /* --------------------------------------------------------------------------
     INITIALIZATION & RESIZE
     -------------------------------------------------------------------------- */
  initResize() {
    const resize = () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.bgCanvas.width = this.width;
      this.bgCanvas.height = this.height;
      this.canvas.width = this.width;
      this.canvas.height = this.height;

      if (this.currentTrack) {
        this.currentTrack = this.trackMgr.getTrack(this.currentTrack.id, this.currentStage);
      }
      this.patternEngine.generateGridTracks();
      this.generateLavaCracks();
    };

    window.addEventListener('resize', resize);
    resize();
  }

  initBackgroundEffects() {
    this.ambientParticles = [];
    for (let i = 0; i < 60; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 25 - 10,
        radius: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  generateLavaCracks() {
    this.lavaCracks = [];
    const count = 18;
    for (let i = 0; i < count; i++) {
      let curX = Math.random() * this.width;
      let curY = Math.random() * this.height;
      const points = [{ x: curX, y: curY }];
      const segments = Math.floor(Math.random() * 6) + 4;
      let angle = Math.random() * Math.PI * 2;

      for (let s = 0; s < segments; s++) {
        const len = Math.random() * 70 + 40;
        angle += (Math.random() - 0.5) * 1.2;
        curX += Math.cos(angle) * len;
        curY += Math.sin(angle) * len;
        points.push({ x: curX, y: curY });
      }

      this.lavaCracks.push({
        points,
        width: Math.random() * 3.5 + 1.8,
        pulseSpeed: Math.random() * 1.5 + 0.8,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }

  /* --------------------------------------------------------------------------
     INPUT BINDINGS & UI LISTENERS
     -------------------------------------------------------------------------- */
  bindEvents() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
      }
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.keys.jump = true;
        this.triggerJump();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (this.isRunning) this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.keys.jump = false;
      }
    });

    // Pointer / Touch controls
    const onPointerMove = (e) => {
      if (!this.isRunning || this.isPaused || !this.player || !this.currentTrack) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pointerX = clientX - rect.left;

      const minX = this.width * 0.12;
      const maxX = this.width * 0.88;
      let targetT = (pointerX - minX) / (maxX - minX);
      targetT = Math.max(0.01, Math.min(0.99, targetT));

      if (this.trapInversionTime > 0) {
        targetT = 1.0 - targetT;
      }

      this.player.targetTrackPos = targetT;
    };

    this.canvas.addEventListener('mousemove', onPointerMove);
    this.canvas.addEventListener('touchmove', onPointerMove, { passive: true });
    this.canvas.addEventListener('touchstart', onPointerMove, { passive: true });

    // Double tap or click on canvas to jump
    this.canvas.addEventListener('dblclick', () => {
      this.triggerJump();
    });

    // UI Buttons
    document.getElementById('btn-play').addEventListener('click', () => {
      this.switchScene('mode');
      window.audioMgr.playMusic('menu');
    });

    document.getElementById('btn-cheat-sheet').addEventListener('click', () => {
      this.openModal('modal-cheat-sheet');
    });

    document.getElementById('btn-close-cheat').addEventListener('click', () => {
      this.closeModal('modal-cheat-sheet');
      if (this.isPaused) this.resumeGame();
    });

    document.getElementById('btn-toggle-cheat').addEventListener('click', () => {
      this.pauseGame();
      this.openModal('modal-cheat-sheet');
    });

    document.getElementById('btn-jump-action').addEventListener('click', () => {
      this.triggerJump();
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
      this.openModal('modal-settings');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      this.closeModal('modal-settings');
    });

    // Mode Selection Buttons
    const cardEndless = document.getElementById('card-endless');
    const cardAdventure = document.getElementById('card-adventure');
    const diffPanel = document.getElementById('difficulty-panel');
    const advPanel = document.getElementById('adventure-panel');

    document.getElementById('btn-select-endless').addEventListener('click', () => {
      this.gameMode = 'endless';
      diffPanel.classList.remove('hidden');
      advPanel.classList.add('hidden');
      cardEndless.classList.add('active');
      cardAdventure.classList.remove('active');
    });

    document.getElementById('btn-select-adventure').addEventListener('click', () => {
      this.gameMode = 'adventure';
      advPanel.classList.remove('hidden');
      diffPanel.classList.add('hidden');
      cardAdventure.classList.add('active');
      cardEndless.classList.remove('active');
    });

    // Difficulty Buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        this.difficulty = targetBtn.dataset.diff;
      });
    });

    // Stage Selection Buttons (8 Stages)
    document.querySelectorAll('.stage-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        this.currentStage = parseInt(targetBtn.dataset.stage, 10);
      });
    });

    // Launch Game Buttons
    document.getElementById('btn-launch-endless').addEventListener('click', () => {
      this.startEndlessGame(this.difficulty);
    });

    document.getElementById('btn-launch-adventure').addEventListener('click', () => {
      this.startAdventureGame(this.currentStage);
    });

    document.getElementById('btn-back-to-menu').addEventListener('click', () => {
      this.switchScene('menu');
      window.audioMgr.playMusic('menu');
    });

    // Pause & Modal Controls
    document.getElementById('btn-pause-game').addEventListener('click', () => this.pauseGame());
    document.getElementById('btn-resume-game').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-pause-cheat').addEventListener('click', () => {
      this.closeModal('modal-pause');
      this.openModal('modal-cheat-sheet');
    });
    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.closeModal('modal-pause');
      if (this.gameMode === 'endless') this.startEndlessGame(this.difficulty);
      else this.startAdventureGame(this.currentStage);
    });
    document.getElementById('btn-quit-to-menu').addEventListener('click', () => {
      this.closeModal('modal-pause');
      this.stopGame();
      this.switchScene('menu');
      window.audioMgr.playMusic('menu');
    });

    // Game Over Buttons
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.closeModal('modal-gameover');
      if (this.gameMode === 'endless') this.startEndlessGame(this.difficulty);
      else this.startAdventureGame(this.currentStage);
    });
    document.getElementById('btn-go-mode-select').addEventListener('click', () => {
      this.closeModal('modal-gameover');
      this.stopGame();
      this.switchScene('mode');
      window.audioMgr.playMusic('menu');
    });
    document.getElementById('btn-go-menu').addEventListener('click', () => {
      this.closeModal('modal-gameover');
      this.stopGame();
      this.switchScene('menu');
      window.audioMgr.playMusic('menu');
    });

    // Victory Buttons (Up to Stage 8)
    document.getElementById('btn-next-stage').addEventListener('click', () => {
      this.closeModal('modal-victory');
      this.currentStage = Math.min(this.totalStages, this.currentStage + 1);
      this.startAdventureGame(this.currentStage);
    });
    document.getElementById('btn-vic-replay').addEventListener('click', () => {
      this.closeModal('modal-victory');
      this.startAdventureGame(this.currentStage);
    });
    document.getElementById('btn-vic-menu').addEventListener('click', () => {
      this.closeModal('modal-victory');
      this.stopGame();
      this.switchScene('menu');
      window.audioMgr.playMusic('menu');
    });

    // Audio Settings Controls
    const musicSlider = document.getElementById('music-vol');
    const sfxSlider = document.getElementById('sfx-vol');
    const musicVolNum = document.getElementById('music-vol-num');
    const sfxVolNum = document.getElementById('sfx-vol-num');

    musicSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      musicVolNum.textContent = `${val}%`;
      window.audioMgr.setMusicVolume(val / 100);
    });

    sfxSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      sfxVolNum.textContent = `${val}%`;
      window.audioMgr.setSfxVolume(val / 100);
    });

    document.body.addEventListener('click', () => {
      window.audioMgr.resumeContext();
      if (!window.audioMgr.currentTrackKey) {
        window.audioMgr.playMusic('menu');
      }
    }, { once: true });
  }

  /* --------------------------------------------------------------------------
     JUMPING MECHANIC (To jump over rolling crescent boulders)
     -------------------------------------------------------------------------- */
  triggerJump() {
    if (!this.isRunning || this.isPaused || !this.player) return;
    if (this.player.isJumping) return; // Prevent double jumping

    this.player.isJumping = true;
    this.player.jumpVelocity = 500; // Initial vertical upward burst
    this.player.jumpHeight = 1;
    window.audioMgr.synthJump();

    // Spawn jump dust particles at player's foot
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 20,
        y: this.player.y,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 40,
        radius: Math.random() * 3 + 1,
        color: '#00d2ff',
        alpha: 0.8,
        decay: 2.0
      });
    }
  }

  /* --------------------------------------------------------------------------
     SCENE & MODAL MANAGEMENT
     -------------------------------------------------------------------------- */
  switchScene(sceneName) {
    this.currentScene = sceneName;
    document.querySelectorAll('.scene').forEach(s => s.classList.add('hidden'));
    document.getElementById(`scene-${sceneName}`).classList.remove('hidden');
    document.getElementById(`scene-${sceneName}`).classList.add('active');
  }

  openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  updateHighScoreDisplay() {
    const el = document.getElementById('menu-high-score');
    if (el) el.textContent = this.highScore.toLocaleString();
  }

  /* --------------------------------------------------------------------------
     GAME START: ENDLESS & ADVENTURE
     -------------------------------------------------------------------------- */
  startEndlessGame(diff) {
    this.gameMode = 'endless';
    this.difficulty = diff;
    
    const mults = { easy: 1.0, normal: 1.3, hard: 1.65, nightmare: 2.1 };
    this.difficultyMultiplier = mults[diff] || 1.0;

    this.applyTheme(diff);
    this.currentTrack = this.trackMgr.getTrack('crescent');

    this.initGameplayState();
    this.switchScene('game');

    if (diff === 'nightmare' || diff === 'hard') {
      window.audioMgr.playMusic('epic');
    } else {
      window.audioMgr.playMusic('game');
    }

    document.getElementById('hud-mode-text').textContent = `ENDLESS (${diff.toUpperCase()})`;
    document.getElementById('hud-score-label').textContent = 'SCORE';
    document.getElementById('hud-progress-container').classList.add('hidden');
  }

  startAdventureGame(stage) {
    this.gameMode = 'adventure';
    this.currentStage = stage;
    this.difficultyMultiplier = 1.0 + (stage - 1) * 0.15;

    const trackTypes = ['crescent', 'orbit', 'twin_dip', 'infinity', 'spiral', 'triple_crest', 'diamond', 'vortex'];
    const trackType = trackTypes[stage - 1] || 'crescent';
    this.currentTrack = this.trackMgr.getTrack(trackType, stage);

    const stageThemes = ['easy', 'normal', 'hard', 'nightmare', 'easy', 'normal', 'hard', 'nightmare'];
    this.applyTheme(stageThemes[stage - 1] || 'normal');

    this.initGameplayState();
    this.switchScene('game');

    window.audioMgr.playMusic('epic');

    document.getElementById('hud-mode-text').textContent = `STAGE ${stage}: ${this.currentTrack.name.toUpperCase()}`;
    document.getElementById('hud-score-label').textContent = 'STAGE SCORE';
    document.getElementById('hud-progress-container').classList.remove('hidden');
  }

  initGameplayState() {
    this.isRunning = true;
    this.isPaused = false;
    this.survivalTime = 0;
    this.score = 0;
    this.hazardsDodged = 0;
    this.powerupsCollected = 0;
    this.cameraShake = 0;

    this.powerupInvulnerableTime = 0;
    this.powerupChronoTime = 0;
    this.trapInversionTime = 0;

    this.balls = [];
    this.rollingBoulders = [];
    this.particles = [];

    const startT = (this.gameMode === 'adventure') ? 0.04 : 0.5;
    const initialPos = this.currentTrack.getPointAt(startT);

    // Player with increased size & jumping capability
    this.player = {
      x: initialPos.x,
      y: initialPos.y,
      radius: 24, // Bigger player orb as requested!
      trackPos: startT,
      targetTrackPos: startT,
      maxSpeed: 440,
      isJumping: false,
      jumpHeight: 0,
      jumpVelocity: 0,
      trail: []
    };

    this.patternEngine.reset();
    this.updateHUD();
  }

  applyTheme(themeKey) {
    this.activeThemeKey = themeKey;
    document.body.className = `theme-${themeKey}`;

    const themes = {
      easy: {
        bgColor: '#041c10',
        trackColor: 'rgba(0, 230, 118, 0.45)',
        glowColor: '#00e676',
        gridColor: 'rgba(0, 230, 118, 0.12)',
        particleColor: '#00ff88'
      },
      normal: {
        bgColor: '#1a0e03',
        trackColor: 'rgba(255, 145, 0, 0.45)',
        glowColor: '#ff9100',
        gridColor: 'rgba(255, 145, 0, 0.12)',
        particleColor: '#ffab40'
      },
      hard: {
        bgColor: '#200307',
        trackColor: 'rgba(255, 23, 68, 0.5)',
        glowColor: '#ff1744',
        gridColor: 'rgba(255, 23, 68, 0.14)',
        particleColor: '#ff5252'
      },
      nightmare: {
        bgColor: '#000000',
        trackColor: 'rgba(255, 61, 0, 0.6)',
        glowColor: '#ff3d00',
        gridColor: 'rgba(255, 61, 0, 0.18)',
        particleColor: '#ff6e40'
      }
    };

    this.currentTheme = themes[themeKey] || themes.normal;
  }

  stopGame() {
    this.isRunning = false;
    this.isPaused = false;
  }

  togglePause() {
    if (this.isPaused) this.resumeGame();
    else this.pauseGame();
  }

  pauseGame() {
    if (!this.isRunning) return;
    this.isPaused = true;
    this.openModal('modal-pause');
  }

  resumeGame() {
    this.isPaused = false;
    this.closeModal('modal-pause');
  }

  onPatternChanged(newPattern) {
    const el = document.getElementById('hud-pattern-text');
    if (el) {
      el.textContent = newPattern.toUpperCase().replace('BOULDERNEEDLE', 'BOULDER & NEEDLE');
    }
  }

  getCrescentDipPoint() {
    if (this.currentTrack && this.currentTrack.getDipPoint) {
      return this.currentTrack.getDipPoint();
    }
    return { x: this.width / 2, y: this.height * 0.75 };
  }

  calculateTrackIntersection(ball) {
    if (!this.currentTrack) return null;
    const steps = 60;
    let closestDist = Infinity;
    let bestIntersection = null;

    const bSpeed = Math.hypot(ball.vx, ball.vy);
    if (bSpeed === 0) return null;

    const bDirX = ball.vx / bSpeed;
    const bDirY = ball.vy / bSpeed;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = this.currentTrack.getPointAt(t);

      const dx = pt.x - ball.x;
      const dy = pt.y - ball.y;

      const projection = dx * bDirX + dy * bDirY;
      if (projection > 0) {
        const perpDist = Math.abs(dx * (-bDirY) + dy * bDirX);
        if (perpDist < (ball.radius + 20) && perpDist < closestDist) {
          closestDist = perpDist;
          bestIntersection = {
            x: pt.x,
            y: pt.y,
            trackPos: t
          };
        }
      }
    }

    return bestIntersection;
  }

  spawnBall(config) {
    this.balls.push({
      x: config.x,
      y: config.y,
      vx: config.vx,
      vy: config.vy,
      radius: config.radius,
      type: config.type,
      isBoulder: config.isBoulder || false,
      rotation: Math.random() * Math.PI * 2,
      originPattern: config.originPattern
    });
  }

  spawnRollingBoulder(config) {
    this.rollingBoulders.push({
      x: config.startX,
      y: config.startY,
      targetLandingY: config.targetLandingY,
      trackPos: config.trackPos,
      rollDir: config.rollDir,
      rollSpeed: config.rollSpeed,
      state: 'falling',
      radius: config.radius,
      rotation: 0,
      vx: 0,
      vy: 420 // Initial falling speed
    });

    // Display rolling warning
    const warn = document.getElementById('rolling-boulder-warning');
    if (warn) {
      warn.classList.remove('hidden');
      setTimeout(() => {
        if (warn) warn.classList.add('hidden');
      }, 3500);
    }
  }

  /* --------------------------------------------------------------------------
     MAIN GAME LOOP & UPDATE
     -------------------------------------------------------------------------- */
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.renderBackground(timestamp);

    if (this.isRunning && !this.isPaused) {
      this.update(dt);
      this.renderGame();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.survivalTime += dt;
    this.score += Math.round(dt * 100 * this.difficultyMultiplier);

    // Decay camera shake
    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt);
    }

    // Update Powerup & Trap Timers
    if (this.powerupInvulnerableTime > 0) {
      this.powerupInvulnerableTime = Math.max(0, this.powerupInvulnerableTime - dt);
    }
    if (this.powerupChronoTime > 0) {
      this.powerupChronoTime = Math.max(0, this.powerupChronoTime - dt);
    }
    if (this.trapInversionTime > 0) {
      this.trapInversionTime = Math.max(0, this.trapInversionTime - dt);
    }

    // Update Player & Jumping Physics
    this.updatePlayer(dt);

    // Update Pattern Engine
    this.patternEngine.update(dt * 1000);

    // Update Standard Grid Balls
    this.updateBalls(dt);

    // Update Rolling Crescent Boulders
    this.updateRollingBoulders(dt);

    // Update Particles
    this.updateParticles(dt);

    // Check Adventure Mode Finish
    if (this.gameMode === 'adventure') {
      const progressPct = Math.min(100, Math.round(this.player.trackPos * 100));
      document.getElementById('hud-progress-fill').style.width = `${progressPct}%`;
      document.getElementById('hud-progress-text').textContent = `DISTANCE TO FINISH: ${progressPct}%`;

      if (this.player.trackPos >= 0.98) {
        this.triggerAdventureVictory();
        return;
      }
    }

    this.updateHUD();
  }

  updatePlayer(dt) {
    if (!this.player || !this.currentTrack) return;

    // Jumping physics update
    if (this.player.isJumping) {
      this.player.jumpVelocity -= 1050 * dt; // Gravity
      this.player.jumpHeight += this.player.jumpVelocity * dt;

      if (this.player.jumpHeight <= 0) {
        this.player.jumpHeight = 0;
        this.player.isJumping = false;
        this.player.jumpVelocity = 0;
      }
    }

    // Horizontal sliding
    let dir = 0;
    if (this.keys.left) dir -= 1;
    if (this.keys.right) dir += 1;

    if (this.trapInversionTime > 0) {
      dir = -dir;
    }

    const trackLength = this.currentTrack.length;
    const deltaT = (this.player.maxSpeed / trackLength) * dt;

    if (dir !== 0) {
      this.player.trackPos += dir * deltaT;
      this.player.targetTrackPos = this.player.trackPos;
    } else if (this.player.targetTrackPos !== undefined) {
      this.player.trackPos += (this.player.targetTrackPos - this.player.trackPos) * Math.min(1, 14 * dt);
    }

    this.player.trackPos = Math.max(0.01, Math.min(0.99, this.player.trackPos));

    const pt = this.currentTrack.getPointAt(this.player.trackPos);
    this.player.x = pt.x;
    this.player.y = pt.y;

    this.player.trail.unshift({
      x: pt.x,
      y: pt.y - this.player.jumpHeight,
      alpha: 0.8
    });
    if (this.player.trail.length > 10) this.player.trail.pop();
  }

  updateBalls(dt) {
    const timeScale = (this.powerupChronoTime > 0) ? 0.35 : 1.0;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];

      // Active Homing Steering towards player
      if (ball.isHoming && this.player) {
        const targetX = this.player.x;
        const targetY = this.player.y - this.player.jumpHeight;
        const dx = targetX - ball.x;
        const dy = targetY - ball.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          const currentSpeed = Math.hypot(ball.vx, ball.vy);
          const targetVx = (dx / dist) * currentSpeed;
          const targetVy = (dy / dist) * currentSpeed;
          const steer = Math.min(1.0, (ball.homingStrength || 3.2) * dt);

          ball.vx += (targetVx - ball.vx) * steer;
          ball.vy += (targetVy - ball.vy) * steer;

          const newSpeed = Math.hypot(ball.vx, ball.vy);
          if (newSpeed > 0) {
            ball.vx = (ball.vx / newSpeed) * currentSpeed;
            ball.vy = (ball.vy / newSpeed) * currentSpeed;
          }
        }
      }

      ball.x += ball.vx * timeScale * dt;
      ball.y += ball.vy * timeScale * dt;
      ball.rotation += 2.0 * dt;

      // Check collision with player (accounting for jump height elevation)
      const playerEffectiveY = this.player.y - this.player.jumpHeight;
      const dist = Math.hypot(ball.x - this.player.x, ball.y - playerEffectiveY);
      const minDist = ball.radius + this.player.radius;

      if (dist < minDist) {
        this.handlePlayerCollision(ball, i);
        continue;
      }

      if (ball.y > this.height + 80 || ball.x < -100 || ball.x > this.width + 100) {
        this.balls.splice(i, 1);
        this.hazardsDodged++;
        this.score += 25;
      }
    }
  }

  /* --------------------------------------------------------------------------
     ROLLING CRESCENT BOULDER UPDATE:
     Falls from above, lands with a thud, rolls down crescent curve,
     and shoots off into the void. Must be jumped over!
     -------------------------------------------------------------------------- */
  updateRollingBoulders(dt) {
    if (!this.currentTrack) return;

    for (let i = this.rollingBoulders.length - 1; i >= 0; i--) {
      const b = this.rollingBoulders[i];

      if (b.state === 'falling') {
        b.y += b.vy * dt;
        b.vy += 900 * dt; // Gravity
        b.rotation += 4 * dt;

        if (b.y >= b.targetLandingY) {
          b.y = b.targetLandingY;
          b.state = 'rolling';
          this.cameraShake = 0.22; // Impact shake
          window.audioMgr.synthThud();

          // Landing dust explosion
          this.spawnShatterParticles(b.x, b.y, '#ff3d00', 16);
        }
      } else if (b.state === 'rolling') {
        // Accelerate through dip: rollSpeed increases as it nears dip (t=0.5)
        const distFromDip = b.trackPos - 0.5;
        // Gravity pulls toward dip
        b.rollSpeed -= distFromDip * 0.45 * dt;

        b.trackPos += b.rollSpeed * dt;
        b.rotation += b.rollSpeed * 18 * dt;

        // Position on track
        const pt = this.currentTrack.getPointAt(Math.max(0, Math.min(1, b.trackPos)));
        b.x = pt.x;
        b.y = pt.y;

        // Track friction sparks
        if (Math.random() < 0.4) {
          this.particles.push({
            x: b.x,
            y: b.y + b.radius * 0.7,
            vx: -b.rollSpeed * 100 + (Math.random() - 0.5) * 40,
            vy: -Math.random() * 50,
            radius: Math.random() * 2.5 + 1,
            color: '#ff9100',
            alpha: 0.9,
            decay: 2.5
          });
        }

        // Collision check with player
        const distToPlayer = Math.hypot(b.x - this.player.x, b.y - this.player.y);
        const contactDist = b.radius + this.player.radius;

        if (distToPlayer < contactDist) {
          // If player has jumped high enough over the boulder:
          if (this.player.jumpHeight > 22) {
            // Successfully jumped over!
            this.score += 400;
            this.hazardsDodged++;
            window.audioMgr.synthDodgeTick();
          } else if (this.powerupInvulnerableTime > 0) {
            // Invulnerable! Shatter rolling boulder!
            this.score += 750;
            this.hazardsDodged++;
            this.spawnShatterParticles(b.x, b.y, '#ff1744', 35);
            this.rollingBoulders.splice(i, 1);
            continue;
          } else {
            // Deadly crush!
            this.triggerGameOver('Crushed by the rolling crescent boulder! Remember to press SPACE or UP to jump over it!');
            return;
          }
        }

        // Check if reached wings and launches off into space
        if (b.trackPos <= 0.02 || b.trackPos >= 0.98) {
          b.state = 'flying_off';
          b.vx = (b.rollDir > 0 ? 1 : -1) * 350;
          b.vy = -260; // Launch arc
        }
      } else if (b.state === 'flying_off') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 850 * dt;
        b.rotation += 6 * dt;

        if (b.y > this.height + 120 || b.x < -150 || b.x > this.width + 150) {
          this.rollingBoulders.splice(i, 1);
        }
      }
    }
  }

  handlePlayerCollision(ball, ballIndex) {
    this.balls.splice(ballIndex, 1);

    switch (ball.type) {
      case 'hazard_striped_red':
        if (this.powerupInvulnerableTime > 0) {
          this.score += 500;
          this.hazardsDodged++;
          this.spawnShatterParticles(ball.x, ball.y, '#ff1744', 30);
          window.audioMgr.synthDodgeTick();
        } else {
          this.triggerGameOver('Collided with a Striped Red hazard ball!');
        }
        break;

      case 'powerup_solid_red':
        this.powerupInvulnerableTime = 5.0;
        this.powerupsCollected++;
        this.score += 250;
        this.spawnShatterParticles(ball.x, ball.y, '#ff1e42', 25);
        window.audioMgr.playSfx('powerUp');
        break;

      case 'powerup_solid_green':
        this.powerupChronoTime = 6.0;
        this.powerupsCollected++;
        this.score += 250;
        this.spawnShatterParticles(ball.x, ball.y, '#00ff88', 25);
        window.audioMgr.playSfx('powerUp');
        break;

      case 'trap_striped_green':
        this.trapInversionTime = 5.0;
        this.spawnShatterParticles(ball.x, ball.y, '#39ff14', 25);
        window.audioMgr.synthTrap();
        break;
    }
  }

  spawnShatterParticles(x, y, color, count = 22) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 70;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4.5 + 2,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 1.5 + 1.2
      });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  triggerGameOver(cause) {
    this.isRunning = false;
    window.audioMgr.playSfx('gameOver');

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('wavefront_highscore', this.highScore.toString());
      this.updateHighScoreDisplay();
    }

    document.getElementById('gameover-cause').textContent = cause;
    document.getElementById('go-score').textContent = this.score.toLocaleString();
    document.getElementById('go-time').textContent = this.formatTime(this.survivalTime);
    document.getElementById('go-dodged').textContent = this.hazardsDodged.toString();
    document.getElementById('go-powerups').textContent = this.powerupsCollected.toString();

    this.openModal('modal-gameover');
  }

  triggerAdventureVictory() {
    this.isRunning = false;
    window.audioMgr.playSfx('powerUp');

    for (let i = 0; i < 90; i++) {
      this.spawnShatterParticles(this.player.x, this.player.y, '#00ff88', 2);
      this.spawnShatterParticles(this.player.x, this.player.y, '#00d2ff', 2);
    }

    document.getElementById('victory-stage-desc').textContent = 
      `Congratulations! You mastered the ${this.currentTrack.name} and reached the portal safely!`;
    document.getElementById('vic-score').textContent = this.score.toLocaleString();
    document.getElementById('vic-time').textContent = this.formatTime(this.survivalTime);

    this.openModal('modal-victory');
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateHUD() {
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

    const badge = document.getElementById('hud-powerup-badge');
    const badgeText = document.getElementById('hud-powerup-text');
    const badgeTimer = document.getElementById('hud-powerup-timer');
    const inversionBanner = document.getElementById('inversion-warning');

    if (this.powerupInvulnerableTime > 0) {
      badge.className = 'hud-badge';
      badgeText.textContent = 'INVULNERABLE';
      badgeTimer.textContent = `${this.powerupInvulnerableTime.toFixed(1)}s`;
      badge.classList.remove('hidden');
    } else if (this.powerupChronoTime > 0) {
      badge.className = 'hud-badge chrono';
      badgeText.textContent = 'CHRONO MATRIX (SLOW)';
      badgeTimer.textContent = `${this.powerupChronoTime.toFixed(1)}s`;
      badge.classList.remove('hidden');
    } else if (this.trapInversionTime > 0) {
      badge.className = 'hud-badge trap';
      badgeText.textContent = 'CONTROLS INVERTED!';
      badgeTimer.textContent = `${this.trapInversionTime.toFixed(1)}s`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    if (this.trapInversionTime > 0) {
      inversionBanner.classList.remove('hidden');
    } else {
      inversionBanner.classList.add('hidden');
    }
  }

  /* --------------------------------------------------------------------------
     CANVAS RENDERING: BACKGROUND & LATTICE GRIDS
     -------------------------------------------------------------------------- */
  renderBackground(timestamp) {
    const ctx = this.bgCtx;
    const w = this.width;
    const h = this.height;
    const theme = this.currentTheme || { bgColor: '#060911', gridColor: 'rgba(255, 255, 255, 0.08)' };

    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, w, h);

    if (this.activeThemeKey === 'nightmare') {
      this.renderNightmareLavaCracks(ctx, timestamp);
    }

    this.renderCrisscrossGrid(ctx, theme);
    this.renderAmbientParticles(ctx, theme);
  }

  renderNightmareLavaCracks(ctx, timestamp) {
    ctx.save();
    const timeSec = timestamp / 1000;

    for (const crack of this.lavaCracks) {
      const pulse = (Math.sin(timeSec * crack.pulseSpeed + crack.pulseOffset) + 1) / 2;
      ctx.beginPath();
      for (let i = 0; i < crack.points.length; i++) {
        const pt = crack.points[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }

      ctx.strokeStyle = `rgba(255, 61, 0, ${0.35 + pulse * 0.45})`;
      ctx.lineWidth = crack.width * (2.4 + pulse);
      ctx.shadowColor = '#ff3d00';
      ctx.shadowBlur = 20 * pulse + 10;
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 + pulse * 0.3})`;
      ctx.lineWidth = crack.width * 0.6;
      ctx.shadowBlur = 8;
      ctx.stroke();
    }
    ctx.restore();
  }

  renderCrisscrossGrid(ctx, theme) {
    ctx.save();
    ctx.strokeStyle = theme.gridColor || 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    const spacing = 95;
    const numLines = Math.ceil((this.width + this.height) / spacing);

    for (let i = -numLines; i <= numLines; i++) {
      ctx.beginPath();
      ctx.moveTo(i * spacing, 0);
      ctx.lineTo(i * spacing + this.height, this.height);
      ctx.stroke();
    }

    for (let i = -numLines; i <= numLines; i++) {
      ctx.beginPath();
      ctx.moveTo(this.width + i * spacing, 0);
      ctx.lineTo(this.width + i * spacing - this.height, this.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderAmbientParticles(ctx, theme) {
    ctx.save();
    ctx.fillStyle = theme.particleColor || '#ffffff';
    for (const p of this.ambientParticles) {
      p.y += p.vy * 0.016;
      p.x += p.vx * 0.016;
      if (p.y < -10) p.y = this.height + 10;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* --------------------------------------------------------------------------
     CANVAS RENDERING: TRACK, PLAYER, BALLS, ROLLING BOULDERS
     -------------------------------------------------------------------------- */
  renderGame() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Apply camera shake if active
    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * 14 * (this.cameraShake / 0.22);
      const shakeY = (Math.random() - 0.5) * 14 * (this.cameraShake / 0.22);
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Track
    if (this.currentTrack) {
      this.currentTrack.drawTrack(ctx, this.currentTheme);
    }

    // 2. Adventure Portals
    if (this.gameMode === 'adventure') {
      this.renderAdventurePortals(ctx);
    }

    // 3. Rolling Crescent Boulders
    for (const b of this.rollingBoulders) {
      this.renderRollingBoulder(ctx, b);
    }

    // 4. Player Circle (with jump height elevation & shadow)
    if (this.player) {
      this.renderPlayer(ctx);
    }

    // 5. Grid Balls
    for (const ball of this.balls) {
      this.renderBall(ctx, ball);
    }

    // 6. Particle Explosions
    this.renderParticles(ctx);

    ctx.restore();
  }

  renderAdventurePortals(ctx) {
    if (!this.currentTrack) return;
    const startPt = this.currentTrack.getPointAt(0.02);
    const finishPt = this.currentTrack.getPointAt(0.98);

    ctx.save();
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(finishPt.x, finishPt.y, 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 4.5;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 13px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', finishPt.x, finishPt.y + 44);
    ctx.restore();
  }

  renderPlayer(ctx) {
    const p = this.player;
    const elevatedY = p.y - p.jumpHeight;

    ctx.save();
    // 1. Shadow on track when jumping
    if (p.jumpHeight > 0) {
      const shadowScale = Math.max(0.4, 1 - p.jumpHeight / 150);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 4, p.radius * shadowScale, p.radius * 0.35 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();
    }

    // 2. Motion Trail
    for (let i = 0; i < p.trail.length; i++) {
      const tr = p.trail[i];
      const radius = p.radius * (1 - i / p.trail.length);
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 210, 255, ${tr.alpha * 0.35})`;
      ctx.fill();
    }

    // 3. Invulnerability Shield Ring
    if (this.powerupInvulnerableTime > 0) {
      ctx.beginPath();
      ctx.arc(p.x, elevatedY, p.radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff1e42';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff1e42';
      ctx.shadowBlur = 22;
      ctx.stroke();
    }

    // 4. Chrono Time Warp Ring
    if (this.powerupChronoTime > 0) {
      ctx.beginPath();
      ctx.arc(p.x, elevatedY, p.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 16;
      ctx.stroke();
    }

    // 5. Blue Circle Player Body (Larger, luminous)
    const grad = ctx.createRadialGradient(p.x - 5, elevatedY - 5, 3, p.x, elevatedY, p.radius);
    grad.addColorStop(0, '#c7f3ff');
    grad.addColorStop(0.6, '#00b0ff');
    grad.addColorStop(1, '#0066ee');

    ctx.beginPath();
    ctx.arc(p.x, elevatedY, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    ctx.restore();
  }

  renderRollingBoulder(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    const r = b.radius;

    // Heavy rolling striped hazard boulder
    this.drawStripedBall(ctx, r, '#ff2a4b', '#1a0105', '#ff3d00');

    // Inner heavy weight core
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  renderBall(ctx, ball) {
    // If homing ball, draw targeting laser tracer pointing toward player
    if (ball.isHoming && this.player) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(this.player.x, this.player.y - this.player.jumpHeight);
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    const r = ball.radius;

    switch (ball.type) {
      case 'hazard_striped_red':
        this.drawStripedBall(ctx, r, '#ff1744', '#2a0207', '#ff1744');
        break;

      case 'powerup_solid_red':
        this.drawSolidBall(ctx, r, '#ff8093', '#e60026', '#ff1e42');
        break;

      case 'powerup_solid_green':
        this.drawSolidBall(ctx, r, '#a7ffd5', '#00b359', '#00ff88');
        break;

      case 'trap_striped_green':
        this.drawStripedBall(ctx, r, '#39ff14', '#052b02', '#39ff14');
        break;
    }

    // Additional seeker crosshair on homing ball
    if (ball.isHoming) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawStripedBall(ctx, r, stripeColor, bgDarkColor, glowColor) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = bgDarkColor;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = Math.max(4, r * 0.32);

    const step = ctx.lineWidth * 2;
    for (let x = -r * 2.5; x <= r * 2.5; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, -r * 1.5);
      ctx.lineTo(x + r * 2.5, r * 1.5);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();
  }

  drawSolidBall(ctx, r, lightColor, coreColor, glowColor) {
    ctx.save();
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, lightColor);
    grad.addColorStop(1, coreColor);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  renderParticles(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameEngine();
});
