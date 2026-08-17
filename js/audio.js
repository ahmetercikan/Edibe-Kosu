// Dış ses dosyası gerektirmeyen, Web Audio API ile üretilen kısa efektler.
// Böylece repo tamamen self-contained kalır (statik hosting için ideal).
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    const resume = () => this._ensure();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
  }

  _ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) this.ctx = new Ctx();
  }

  setEnabled(v) { this.enabled = v; }

  _tone(freq, duration, { type = 'sine', gain = 0.2, glideTo = null, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  _noise(duration, { gain = 0.25, filterFreq = 1200, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(80, t0 + duration);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t0);
  }

  pickup() {
    this._tone(660, 0.12, { type: 'triangle', gain: 0.18, glideTo: 990 });
    this._tone(990, 0.15, { type: 'sine', gain: 0.12, delay: 0.05, glideTo: 1320 });
  }

  throwSfx() {
    this._noise(0.18, { gain: 0.12, filterFreq: 2200 });
    this._tone(420, 0.1, { type: 'sine', gain: 0.08, glideTo: 220 });
  }

  explosion() {
    this._noise(0.4, { gain: 0.3, filterFreq: 2500 });
    this._tone(90, 0.3, { type: 'sine', gain: 0.25, glideTo: 40 });
  }

  hit() {
    this._tone(140, 0.25, { type: 'sawtooth', gain: 0.2, glideTo: 60 });
  }

  catchWin() {
    this._tone(523, 0.14, { type: 'triangle', gain: 0.18 });
    this._tone(659, 0.14, { type: 'triangle', gain: 0.18, delay: 0.1 });
    this._tone(784, 0.22, { type: 'triangle', gain: 0.2, delay: 0.2 });
  }

  powerUp() {
    this._tone(300, 0.35, { type: 'sawtooth', gain: 0.15, glideTo: 900 });
  }

  uiClick() {
    this._tone(500, 0.06, { type: 'square', gain: 0.08 });
  }

  gameOver() {
    this._tone(400, 0.25, { type: 'sine', gain: 0.2, glideTo: 120, delay: 0 });
    this._tone(280, 0.35, { type: 'sine', gain: 0.18, glideTo: 80, delay: 0.15 });
  }
}
