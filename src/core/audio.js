class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.3;
      this.master.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  _tone(freq, dur, type = 'square', vol = 0.15, slide = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  shot() { this._tone(800, 0.08, 'square', 0.08, -400); }
  tesla() { this._tone(1200, 0.12, 'sawtooth', 0.06, -600); }
  explosion() { this._tone(150, 0.3, 'sawtooth', 0.15, -100); }
  hit() { this._tone(300, 0.05, 'square', 0.06, -100); }
  kill() { this._tone(500, 0.1, 'square', 0.08, -300); }
  levelUp() { this._tone(600, 0.15, 'sine', 0.12, 400); }
  ui() { this._tone(700, 0.06, 'sine', 0.08, 100); }
  gameOver() { this._tone(200, 0.5, 'sawtooth', 0.12, -150); }
  victory() { this._tone(500, 0.4, 'sine', 0.15, 500); }
  dash() { this._tone(400, 0.1, 'sine', 0.08, 200); }
}

export const audio = new AudioSystem();
