export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this._axis = { x: 0, y: 0 };
    this.touchMove = { x: 0, y: 0 };
    this.touchDash = false;
    this.touchAbility = false;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; });
    canvas.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  get axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    // Touch joystick overrides the keyboard when pushed past the dead zone.
    const tLen = Math.hypot(this.touchMove.x, this.touchMove.y);
    if (tLen > 0.12) {
      x = this.touchMove.x;
      y = this.touchMove.y;
    }
    this._axis.x = x;
    this._axis.y = y;
    return this._axis;
  }

  get dashing() { return this.keys.has('Space') || this.touchDash; }
  get ability() { return this.keys.has('KeyQ') || this.touchAbility; }
  get paused() { return this.keys.has('Escape'); }
}
