import * as THREE from 'three';

const VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (220.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float glow = 1.0 - smoothstep(0.0, 0.5, d);
  float core = 1.0 - smoothstep(0.0, 0.1, d);
  vec3 col = vColor * 1.5 + core * 1.0;
  gl_FragColor = vec4(col, vAlpha * glow);
}`;

export class ParticleSystem {
  constructor(scene, maxParticles = 12000) {
    this.max = maxParticles;
    this.count = 0;

    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.alphas = new Float32Array(maxParticles);
    this.lifes = new Float32Array(maxParticles);
    this.maxLifes = new Float32Array(maxParticles);
    this.gravities = new Float32Array(maxParticles);
    this.drags = new Float32Array(maxParticles);
    this.active = new Uint8Array(maxParticles);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 500);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 999;
    scene.add(this.points);

    this._c = new THREE.Color();
    this._ambientTimer = 0;
  }

  emit(opts) {
    const {
      x, y = 1, z, vx = 0, vy = 0, vz = 0,
      color = [1, 1, 1], size = 0.5, life = 0.5,
      gravity = 0, drag = 0, alpha = 1,
    } = opts;

    let idx = -1;
    for (let i = 0; i < this.max; i++) {
      if (!this.active[i]) { idx = i; break; }
    }
    if (idx === -1) idx = this.count % this.max;

    this.active[idx] = 1;
    this.positions[idx * 3] = x;
    this.positions[idx * 3 + 1] = y;
    this.positions[idx * 3 + 2] = z;
    this.velocities[idx * 3] = vx;
    this.velocities[idx * 3 + 1] = vy;
    this.velocities[idx * 3 + 2] = vz;
    this._c.setRGB(color[0], color[1], color[2]);
    this.colors[idx * 3] = this._c.r;
    this.colors[idx * 3 + 1] = this._c.g;
    this.colors[idx * 3 + 2] = this._c.b;
    this.sizes[idx] = size;
    this.alphas[idx] = alpha;
    this.lifes[idx] = life;
    this.maxLifes[idx] = life;
    this.gravities[idx] = gravity;
    this.drags[idx] = drag;
    this.count = Math.max(this.count, idx + 1);
  }

  burst(opts) {
    const { count = 10, speed = 5, spread = 1, ...rest } = opts;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7) * spread;
      this.emit({
        ...rest,
        vx: Math.cos(a) * sp,
        vy: (Math.random() - 0.3) * speed * 0.5,
        vz: Math.sin(a) * sp,
        life: (rest.life ?? 0.5) * (0.5 + Math.random() * 0.5),
        size: (rest.size ?? 0.5) * (0.6 + Math.random() * 0.8),
      });
    }
  }

  trail(x, y, z, color, size = 0.3, life = 0.2) {
    this.emit({
      x, y, z, color, size, life,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      vz: (Math.random() - 0.5) * 0.5,
      gravity: 0, drag: 2,
    });
  }

  explosion(x, y, z, radius = 3, color = [1, 0.5, 0.2]) {
    this.burst({ x, y, z, count: 30, speed: radius * 2.5, color, size: 0.4, life: 0.5, gravity: 6, drag: 1.5 });
    this.burst({ x, y, z, count: 15, speed: radius, color: [1, 1, 1], size: 0.25, life: 0.3, gravity: 0 });
    this.burst({ x, y, z, count: 8, speed: radius * 0.5, color: [1, 0.8, 0.3], size: 0.6, life: 0.7, gravity: -2 });
  }

  levelUpBurst(x, y, z) {
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 0.5 + Math.random() * 2;
      this.emit({
        x: x + Math.cos(a) * r, y: y + Math.random() * 0.5, z: z + Math.sin(a) * r,
        vx: Math.cos(a) * 2, vy: 3 + Math.random() * 3, vz: Math.sin(a) * 2,
        color: [0.5 + Math.random() * 0.5, 0.8, 1], size: 0.3 + Math.random() * 0.3,
        life: 0.6 + Math.random() * 0.4, gravity: -3, drag: 1,
      });
    }
  }

  update(dt, camX = 0, camZ = 0) {
    this._ambientTimer += dt;
    if (this._ambientTimer > 0.05) {
      this._ambientTimer = 0;
      for (let i = 0; i < 3; i++) {
        this.emit({
          x: camX + (Math.random() - 0.5) * 40, y: 0.2 + Math.random() * 4,
          z: camZ + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 0.5, vy: 0.15 + Math.random() * 0.3, vz: (Math.random() - 0.5) * 0.5,
          color: [0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.3, 0.6 + Math.random() * 0.4],
          size: 0.1 + Math.random() * 0.15, life: 2 + Math.random() * 2, gravity: 0, drag: 0,
        });
      }
    }

    for (let i = 0; i < this.max; i++) {
      if (!this.active[i]) continue;
      this.lifes[i] -= dt;
      if (this.lifes[i] <= 0) {
        this.active[i] = 0;
        this.alphas[i] = 0;
        continue;
      }
      const dragF = 1 - this.drags[i] * dt;
      this.velocities[i * 3] *= dragF;
      this.velocities[i * 3 + 1] = this.velocities[i * 3 + 1] * dragF - this.gravities[i] * dt;
      this.velocities[i * 3 + 2] *= dragF;
      this.positions[i * 3] += this.velocities[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      if (this.positions[i * 3 + 1] < 0.05) {
        this.positions[i * 3 + 1] = 0.05;
        this.velocities[i * 3 + 1] *= -0.3;
      }
      const t = this.lifes[i] / this.maxLifes[i];
      this.alphas[i] = t;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }

  clear() {
    this.active.fill(0);
    this.alphas.fill(0);
    this.count = 0;
  }
}
