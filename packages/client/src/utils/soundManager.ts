// Procedural Web Audio API Sound Synthesizer for Arcana Werewolf
// Zero external mp3 dependencies: zero 404s, instant, responsive game audio.

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Read mute preference from localStorage
    try {
      const saved = localStorage.getItem('ww_sfx_muted');
      this.muted = saved === 'true';
    } catch {
      this.muted = false;
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('ww_sfx_muted', String(muted));
    } catch {
      // ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- SOUND EFFECTS ---

  /** Soft tactile click for buttons */
  public playClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }

  /** Card flip / swoosh effect */
  public playCardFlip() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {
      // ignore
    }
  }

  /** Eerie Wolf Howl / Dark Drone for Night Phase */
  public playNightHowl() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Bass drone
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(65, now);

      const bassFilter = this.ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(150, now);
      bassFilter.frequency.exponentialRampToValueAtTime(300, now + 1.2);
      bassFilter.frequency.exponentialRampToValueAtTime(100, now + 2.5);

      bassGain.gain.setValueAtTime(0.01, now);
      bassGain.gain.linearRampToValueAtTime(0.2, now + 0.4);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      bass.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.ctx.destination);

      bass.start(now);
      bass.stop(now + 2.5);

      // Howl pitch sweep
      const howl = this.ctx.createOscillator();
      const howlGain = this.ctx.createGain();
      howl.type = 'sine';
      howl.frequency.setValueAtTime(220, now + 0.2);
      howl.frequency.exponentialRampToValueAtTime(440, now + 0.9);
      howl.frequency.exponentialRampToValueAtTime(330, now + 1.6);
      howl.frequency.exponentialRampToValueAtTime(180, now + 2.3);

      howlGain.gain.setValueAtTime(0.001, now + 0.2);
      howlGain.gain.linearRampToValueAtTime(0.14, now + 0.8);
      howlGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      howl.connect(howlGain);
      howlGain.connect(this.ctx.destination);

      howl.start(now + 0.2);
      howl.stop(now + 2.4);
    } catch {
      // ignore
    }
  }

  /** Bright, harmonic morning bells/chimes for Day Phase */
  public playDayChime() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.09);

        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 1.2);
      });
    } catch {
      // ignore
    }
  }

  /** Heavy Gavel / Court Strike for Voting Phase */
  public playGavelStrike() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Heavy thump
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Wood block snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(580, now);
      snap.frequency.exponentialRampToValueAtTime(160, now + 0.08);

      snapGain.gain.setValueAtTime(0.25, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(now);
      snap.stop(now + 0.12);
    } catch {
      // ignore
    }
  }

  /** Urgent Clock Tick for final seconds */
  public playUrgentTick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // ignore
    }
  }

  /** Triumphant Fanfare for End / Victory */
  public playVictoryFanfare() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 392.0, t: 0.0, d: 0.18 }, // G4
        { f: 523.25, t: 0.2, d: 0.18 }, // C5
        { f: 659.25, t: 0.4, d: 0.25 }, // E5
        { f: 783.99, t: 0.65, d: 0.8 }, // G5
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(n.f * 2.5, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.15, now + n.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch {
      // ignore
    }
  }

  /** Achievement unlocked celebratory jingle */
  public playAchievement() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, t: 0.0, d: 0.15 }, // C5
        { f: 659.25, t: 0.1, d: 0.15 }, // E5
        { f: 783.99, t: 0.2, d: 0.2 }, // G5
        { f: 1046.5, t: 0.35, d: 0.6 }, // C6
      ];

      notes.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.18, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch {
      // ignore
    }
  }

  /** Level Up Royal Trumpet Fanfare */
  public playLevelUp() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chords = [
        { f: 440, t: 0.0, d: 0.18 }, // A4
        { f: 554.37, t: 0.12, d: 0.18 }, // C#5
        { f: 659.25, t: 0.24, d: 0.25 }, // E5
        { f: 880, t: 0.4, d: 0.7 }, // A5
      ];

      chords.forEach((n) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(n.f * 3, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.2, now + n.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch {
      // ignore
    }
  }

  /** Cute floating emote bubble pop */
  public playEmotePop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  /** Suspenseful heartbeat thump during crunch time */
  public playHeartbeat() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [0, 0.12].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now + offset);
        osc.frequency.exponentialRampToValueAtTime(40, now + offset + 0.08);

        gain.gain.setValueAtTime(0.25, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    } catch {
      // ignore
    }
  }

  /** Trigger sound automatically when game phase changes */
  public playPhaseTransition(phase: string) {
    if (phase === 'night') {
      this.playNightHowl();
    } else if (phase === 'day') {
      this.playDayChime();
    } else if (phase === 'voting') {
      this.playGavelStrike();
    } else if (phase === 'ended') {
      this.playVictoryFanfare();
    }
  }
}

export const soundManager = new SoundManager();
