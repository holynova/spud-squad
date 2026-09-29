import * as THREE from 'three';
import { dist } from '../core/utils.js';

const GEO_CACHE = {};
function getProjGeo(kind) {
  if (GEO_CACHE[kind]) return GEO_CACHE[kind];
  let geo;
  switch (kind) {
    case 'bullet': geo = new THREE.SphereGeometry(0.12, 6, 6); break;
    case 'tesla': geo = new THREE.OctahedronGeometry(0.2, 0); break;
    case 'rocket': geo = new THREE.ConeGeometry(0.15, 0.4, 6); break;
    case 'knife': geo = new THREE.BoxGeometry(0.3, 0.05, 0.08); break;
    case 'enemy': geo = new THREE.SphereGeometry(0.15, 6, 6); break;
    default: geo = new THREE.SphereGeometry(0.12, 6, 6);
  }
  GEO_CACHE[kind] = geo;
  return geo;
}

export class Projectile {
  constructor(opts, game) {
    this.game = game;
    this.kind = opts.kind;
    this.x = opts.x;
    this.y = opts.y || 0.8;
    this.z = opts.z;
    this.vx = opts.vx;
    this.vz = opts.vz;
    this.damage = opts.damage;
    this.life = opts.life || 1;
    this.radius = opts.radius || 0.15;
    this.knock = opts.knock || 2;
    this.color = opts.color || '#fff';
    this.pierce = opts.pierce || 0;
    this.explode = opts.explode || false;
    this.blastRadius = opts.blastRadius || 3;
    this.bounces = opts.bounces || 0;
    this.decay = opts.decay || 1;
    this.boomerang = opts.boomerang || false;
    this.critChance = opts.critChance || 0;
    this.critDamage = opts.critDamage || 1.5;
    this.hitSet = new Set();
    this.dead = false;
    this.t = 0;
    this.returning = false;

    const color = new THREE.Color(this.color);
    const mat = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(getProjGeo(this.kind), mat);
    this.mesh.position.set(this.x, this.y, this.z);
    game.scene.add(this.mesh);

    if (this.kind === 'tesla') {
      const glowGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this.glow = new THREE.Mesh(glowGeo, glowMat);
      this.mesh.add(this.glow);
    }
  }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) {
      if (this.explode) this._explode();
      this._destroy();
      return;
    }

    if (this.boomerang && !this.returning && this.t > 0.4) {
      this.returning = true;
    }
    if (this.returning) {
      const p = this.game.player;
      const dx = p.x - this.x, dz = p.z - this.z;
      const d = Math.hypot(dx, dz) || 1;
      this.vx = (dx / d) * 25;
      this.vz = (dz / d) * 25;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    if (Math.abs(this.x) > 26 || Math.abs(this.z) > 26) {
      this._destroy();
      return;
    }

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y += dt * 8;
    this.mesh.rotation.x += dt * 5;

    if (this.kind === 'rocket') {
      this.game.particles.emit({
        x: this.x, y: this.y, z: this.z,
        vx: -this.vx * 0.1, vy: 0.5, vz: -this.vz * 0.1,
        color: [1, 0.5, 0.2], size: 0.25, life: 0.2, gravity: 0, drag: 1,
      });
    }

    for (const e of this.game.enemies.list) {
      if (!e.alive || this.hitSet.has(e)) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < this.radius + e.radius) {
        this._hit(e);
        if (this.pierce > 0) {
          this.pierce--;
          this.hitSet.add(e);
        } else if (this.bounces > 0) {
          this.bounces--;
          this.hitSet.add(e);
          this._bounce(e);
        } else {
          if (this.explode) this._explode();
          this._destroy();
          return;
        }
      }
    }
  }

  _hit(enemy) {
    const isCrit = Math.random() < this.critChance;
    const dmg = this.damage * (isCrit ? this.critDamage : 1);
    enemy.damage(dmg, this.kind, { crit: isCrit });

    const dx = enemy.x - this.x, dz = enemy.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    enemy.knockX += (dx / d) * this.knock;
    enemy.knockZ += (dz / d) * this.knock;

    this.game.particles.burst({
      x: this.x, y: this.y, z: this.z,
      count: isCrit ? 8 : 4, speed: 3,
      color: isCrit ? [1, 0.9, 0.3] : [1, 1, 1],
      size: 0.2, life: 0.15, gravity: 2,
    });

    if (this.kind === 'tesla') {
      this.game.beams.fire(
        this.x, this.y, this.z,
        enemy.x, enemy.radius + 0.3, enemy.z,
        { color: [0.65, 0.55, 1], width: 0.08, dur: 0.1 },
      );
    }
  }

  _bounce(fromEnemy) {
    let best = null, bestD = 15;
    for (const e of this.game.enemies.list) {
      if (!e.alive || this.hitSet.has(e)) continue;
      const d = dist(fromEnemy.x, fromEnemy.z, e.x, e.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      const dx = best.x - this.x, dz = best.z - this.z;
      const d = Math.hypot(dx, dz) || 1;
      const spd = Math.hypot(this.vx, this.vz);
      this.vx = (dx / d) * spd;
      this.vz = (dz / d) * spd;
      this.damage *= this.decay;
      this.game.beams.fire(
        this.x, this.y, this.z,
        best.x, best.radius + 0.3, best.z,
        { color: [0.65, 0.55, 1], width: 0.12, dur: 0.15 },
      );
    }
  }

  _explode() {
    const game = this.game;
    game.particles.burst({
      x: this.x, y: this.y, z: this.z,
      count: 25, speed: 8, color: [1, 0.5, 0.2],
      size: 0.4, life: 0.5, gravity: 5, drag: 1,
    });
    game.shockwaves.spawn({
      x: this.x, z: this.z, r0: 0.5, r1: this.blastRadius,
      dur: 0.35, color: [1, 0.5, 0.2],
    });
    for (const e of game.enemies.list) {
      if (!e.alive) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < this.blastRadius + e.radius) {
        const falloff = 1 - (d / (this.blastRadius + e.radius)) * 0.5;
        e.damage(this.damage * falloff, 'explosion');
        const dx = e.x - this.x, dz = e.z - this.z;
        const dd = Math.hypot(dx, dz) || 1;
        e.knockX += (dx / dd) * this.knock * 2;
        e.knockZ += (dz / dd) * this.knock * 2;
      }
    }
  }

  _destroy() {
    this.dead = true;
    this.game.scene.remove(this.mesh);
    this.mesh.material.dispose();
  }
}

export class ProjectileSystem {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  spawn(opts) {
    const p = new Projectile(opts, this.game);
    this.list.push(p);
    return p;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.update(dt);
      if (p.dead) this.list.splice(i, 1);
    }
  }

  clear() {
    for (const p of this.list) {
      this.game.scene.remove(p.mesh);
      p.mesh.material.dispose();
    }
    this.list = [];
  }
}
