/* ==========================================================================
   WAVEFRONT - Audio Manager
   Handles background music transitions, SFX triggers, and Web Audio fallbacks.
   ========================================================================== */

class AudioManager {
  constructor() {
    this.musicVolume = 0.7;
    this.sfxVolume = 0.8;
    this.autoSwitch = true;
    this.currentTrackKey = null;
    this.fadeInterval = null;

    // Music track configurations
    this.musicTracks = {
      menu: {
        title: 'Under The Sun (Keys of Moon)',
        src: 'Sounds & Music/Music/Menu Music.mp3',
        audio: null
      },
      game: {
        title: 'Extreme Sport Trap (Alex-Productions)',
        src: 'Sounds & Music/Music/Game Music.mp3',
        audio: null
      },
      epic: {
        title: 'Heroism (MaxKoMusic)',
        src: 'Sounds & Music/Music/Menu Music Second One.mp3',
        audio: null
      }
    };

    // Sound effect configurations
    this.sfxTracks = {
      gameOver: {
        src: 'Sounds & Music/Sound Effects/Game Over.mp3',
        audio: null
      },
      powerUp: {
        src: 'Sounds & Music/Sound Effects/Power Up.mp3',
        audio: null
      }
    };

    this.initAudioElements();
    this.initWebAudioSynth();
  }

  initAudioElements() {
    // Initialize Music Audio instances
    for (const [key, track] of Object.entries(this.musicTracks)) {
      const audio = new Audio();
      audio.src = encodeURI(track.src);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'metadata';
      track.audio = audio;
    }

    // Initialize SFX instances
    for (const [key, sfx] of Object.entries(this.sfxTracks)) {
      const audio = new Audio();
      audio.src = encodeURI(sfx.src);
      audio.preload = 'auto';
      sfx.audio = audio;
    }
  }

  initWebAudioSynth() {
    // Synthesizer for instant micro-SFX (dodge swish, shield impact, chrono slow pulse)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio Context not initialized yet (waiting for interaction):', e);
    }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMusic(trackKey, crossfadeDuration = 1000) {
    if (!this.musicTracks[trackKey]) return;
    if (this.currentTrackKey === trackKey && this.musicTracks[trackKey].audio && !this.musicTracks[trackKey].audio.paused) {
      return; // Already playing
    }

    this.resumeContext();

    const oldTrackKey = this.currentTrackKey;
    this.currentTrackKey = trackKey;
    const newTrack = this.musicTracks[trackKey];

    if (!newTrack.audio) return;

    // Start playing new track at volume 0
    newTrack.audio.currentTime = newTrack.audio.currentTime || 0;
    const playPromise = newTrack.audio.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.crossfade(oldTrackKey, trackKey, crossfadeDuration);
      }).catch(err => {
        // Autoplay policy prevented immediate playback; will resume on first user interaction
        console.log('Autoplay deferred until user input:', err);
      });
    }
  }

  crossfade(oldKey, newKey, durationMs) {
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    const oldAudio = oldKey && this.musicTracks[oldKey] ? this.musicTracks[oldKey].audio : null;
    const newAudio = newKey && this.musicTracks[newKey] ? this.musicTracks[newKey].audio : null;

    const steps = 20;
    const stepTime = durationMs / steps;
    let step = 0;

    const startOldVol = oldAudio ? oldAudio.volume : 0;
    const targetNewVol = this.musicVolume;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;

      if (oldAudio) {
        oldAudio.volume = Math.max(0, startOldVol * (1 - progress));
      }
      if (newAudio) {
        newAudio.volume = Math.min(1, targetNewVol * progress);
      }

      if (step >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (oldAudio && oldKey !== newKey) {
          oldAudio.pause();
        }
        if (newAudio) {
          newAudio.volume = targetNewVol;
        }
      }
    }, stepTime);
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.currentTrackKey && this.musicTracks[this.currentTrackKey].audio) {
      this.musicTracks[this.currentTrackKey].audio.volume = this.musicVolume;
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  playSfx(sfxKey) {
    this.resumeContext();
    const sfx = this.sfxTracks[sfxKey];
    if (sfx && sfx.audio) {
      // Clone audio to allow rapid overlapping triggers
      const clone = sfx.audio.cloneNode();
      clone.volume = this.sfxVolume;
      clone.play().catch(() => {
        // Fallback to synth if file fails
        if (sfxKey === 'powerUp') this.synthPowerUp();
        if (sfxKey === 'gameOver') this.synthGameOver();
      });
    } else {
      if (sfxKey === 'powerUp') this.synthPowerUp();
      if (sfxKey === 'gameOver') this.synthGameOver();
    }
  }

  // Synthesized audio alerts
  synthPowerUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  synthTrap() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);

    gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  synthGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);

    gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  synthJump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.18);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  synthThud() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  synthDodgeTick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);

    gain.gain.setValueAtTime(this.sfxVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

// Global instance
window.audioMgr = new AudioManager();
