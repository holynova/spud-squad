export class Loop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = false;
    this.last = 0;
    this.timeScale = 1;
    this._tick = this._tick.bind(this);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._tick);
  }
  stop() { this.running = false; }
  _tick(now) {
    if (!this.running) return;
    requestAnimationFrame(this._tick);
    let dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    dt *= this.timeScale;
    this.updateFn(dt);
    this.renderFn(dt);
  }
}
