/**
 * Growable Float32 vector — accumulates millions of coordinates without the
 * memory blow-up of a boxed JS number[]. Doubles capacity as needed.
 */
export class F32 {
  constructor(initial = 1 << 16) {
    this.data = new Float32Array(initial);
    this.len = 0;
  }
  _ensure(n) {
    if (this.len + n <= this.data.length) return;
    let cap = this.data.length;
    while (cap < this.len + n) cap *= 2;
    const next = new Float32Array(cap);
    next.set(this.data.subarray(0, this.len));
    this.data = next;
  }
  push2(a, b) {
    this._ensure(2);
    this.data[this.len++] = a;
    this.data[this.len++] = b;
  }
  push1(a) {
    this._ensure(1);
    this.data[this.len++] = a;
  }
  /** The filled portion as a tight view (no copy). */
  view() {
    return this.data.subarray(0, this.len);
  }
}

/** Growable Uint32 vector — for triangle index buffers. */
export class U32 {
  constructor(initial = 1 << 16) {
    this.data = new Uint32Array(initial);
    this.len = 0;
  }
  push1(a) {
    if (this.len + 1 > this.data.length) {
      const next = new Uint32Array(this.data.length * 2);
      next.set(this.data.subarray(0, this.len));
      this.data = next;
    }
    this.data[this.len++] = a;
  }
  view() {
    return this.data.subarray(0, this.len);
  }
}
