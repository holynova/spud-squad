export class Pool {
  constructor(factory, reset, initial = 32) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }
  obtain() {
    const obj = this.free.pop() || this.factory();
    this.active.push(obj);
    return obj;
  }
  release(obj) {
    const i = this.active.indexOf(obj);
    if (i !== -1) {
      this.active.splice(i, 1);
      this.reset(obj);
      this.free.push(obj);
    }
  }
  releaseAll() {
    while (this.active.length) {
      const obj = this.active.pop();
      this.reset(obj);
      this.free.push(obj);
    }
  }
  get size() { return this.active.length; }
}
