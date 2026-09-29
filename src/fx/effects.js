import * as THREE from 'three';

export class ShockwavePool {
  constructor(scene, max = 32) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < max; i++) {
      const geo = new THREE.RingGeometry(0.8, 1, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: '#fff', transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 998;
      scene.add(mesh);
      this.pool.push({ mesh, t: 0, dur: 0, r1: 5, active: false });
    }
  }

  spawn({ x, z, r0 = 0.5, r1 = 5, dur = 0.4, color = [1, 1, 1], width = 0.3 }) {
    const s = this.pool.find((p) => !p.active) || this.pool[0];
    s.active = true;
    s.t = 0;
    s.dur = dur;
    s.r1 = r1;
    s.mesh.visible = true;
    s.mesh.position.set(x, 0.1, z);
    s.mesh.material.color.setRGB(color[0], color[1], color[2]);
    s.mesh.material.opacity = 0.8;
    s.mesh.scale.setScalar(r0);
  }

  update(dt) {
    for (const s of this.pool) {
      if (!s.active) continue;
      s.t += dt;
      const p = s.t / s.dur;
      if (p >= 1) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      const ease = 1 - Math.pow(1 - p, 3);
      s.mesh.scale.setScalar(0.5 + ease * s.r1);
      s.mesh.material.opacity = 0.8 * (1 - p);
    }
  }

  clear() {
    for (const s of this.pool) {
      s.active = false;
      s.mesh.visible = false;
    }
  }
}

export class DecalPool {
  constructor(scene, max = 48) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < max; i++) {
      const geo = new THREE.CircleGeometry(1, 24);
      const mat = new THREE.MeshBasicMaterial({
        color: '#fff', transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 1;
      scene.add(mesh);
      this.pool.push({ mesh, t: 0, dur: 0, active: false });
    }
  }

  spawn({ x, z, r = 2, dur = 2, color = [0.5, 0.5, 1] }) {
    const d = this.pool.find((p) => !p.active) || this.pool[0];
    d.active = true;
    d.t = 0;
    d.dur = dur;
    d.mesh.visible = true;
    d.mesh.position.set(x, 0.06, z);
    d.mesh.scale.setScalar(r);
    d.mesh.material.color.setRGB(color[0], color[1], color[2]);
    d.mesh.material.opacity = 0.35;
  }

  update(dt) {
    for (const d of this.pool) {
      if (!d.active) continue;
      d.t += dt;
      const p = d.t / d.dur;
      if (p >= 1) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.mesh.material.opacity = 0.35 * (1 - p);
    }
  }

  clear() {
    for (const d of this.pool) {
      d.active = false;
      d.mesh.visible = false;
    }
  }
}

export class BeamPool {
  constructor(scene, max = 16) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < max; i++) {
      const geo = new THREE.CylinderGeometry(0.06, 0.06, 1, 6, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: '#fff', transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 997;
      scene.add(mesh);
      this.pool.push({ mesh, t: 0, dur: 0, active: false });
    }
  }

  fire(x1, y1, z1, x2, y2, z2, { color = [1, 1, 1], width = 0.15, dur = 0.15 } = {}) {
    const b = this.pool.find((p) => !p.active) || this.pool[0];
    b.active = true;
    b.t = 0;
    b.dur = dur;
    b.mesh.visible = true;
    b.mesh.material.color.setRGB(color[0], color[1], color[2]);
    b.mesh.material.opacity = 0.9;

    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    b.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    b.mesh.scale.set(width, len, width);
    b.mesh.lookAt(x2, y2, z2);
    b.mesh.rotateX(Math.PI / 2);
  }

  update(dt) {
    for (const b of this.pool) {
      if (!b.active) continue;
      b.t += dt;
      const p = b.t / b.dur;
      if (p >= 1) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      b.mesh.material.opacity = 0.9 * (1 - p);
    }
  }

  clear() {
    for (const b of this.pool) {
      b.active = false;
      b.mesh.visible = false;
    }
  }
}
