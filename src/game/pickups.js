import * as THREE from 'three';
import { dist } from '../core/utils.js';
import { PICKUP_CONFIG } from './pickupConfig.js';

export class Pickup {
  constructor(type, x, z, value, game) {
    this.type = type;
    this.x = x;
    this.z = z;
    this.value = value;
    this.game = game;
    this.t = Math.random() * Math.PI * 2;
    this.life = 30;
    this.dead = false;
    this.vx = (Math.random() - 0.5) * 3;
    this.vz = (Math.random() - 0.5) * 3;

    const conf = PICKUP_CONFIG[type];
    const color = new THREE.Color(conf.color);
    const geo = type === 'xp'
      ? new THREE.OctahedronGeometry(0.15, 0)
      : type === 'gold'
        ? new THREE.CylinderGeometry(0.15, 0.15, 0.06, 8)
        : new THREE.SphereGeometry(0.18, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, 0.4, z);
    game.scene.add(this.mesh);
  }

  update(dt) {
    this.t += dt * 3;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    this.vx *= 0.9;
    this.vz *= 0.9;

    const p = this.game.player;
    const d = dist(this.x, this.z, p.x, p.z);
    if (d < p.pickupRange) {
      const dx = p.x - this.x, dz = p.z - this.z;
      const dd = Math.hypot(dx, dz) || 1;
      const pull = (1 - d / p.pickupRange) * 20;
      this.vx += (dx / dd) * pull * dt * 10;
      this.vz += (dz / dd) * pull * dt * 10;
    }

    this.x += this.vx * dt;
    this.z += this.vz * dt;
    this.mesh.position.set(this.x, 0.4 + Math.sin(this.t) * 0.1, this.z);
    this.mesh.rotation.y += dt * 3;

    if (d < 0.8) {
      this._collect();
    }
  }

  _collect() {
    const p = this.game.player;
    if (this.type === 'xp') {
      p.addXp(this.value);
      this.game.particles.burst({
        x: this.x, y: 0.5, z: this.z, count: 5, speed: 2,
        color: [0.3, 0.8, 1], size: 0.2, life: 0.2, gravity: -2,
      });
    } else if (this.type === 'gold') {
      p.addGold(this.value);
      this.game.floaters.spawn(this.x, 1, this.z, `+${this.value}g`, 'gold');
    } else if (this.type === 'heal') {
      p.heal(this.value);
      this.game.floaters.spawn(this.x, 1, this.z, `+${this.value}hp`, 'heal');
      this.game.particles.burst({
        x: this.x, y: 0.5, z: this.z, count: 8, speed: 3,
        color: [0.3, 1, 0.5], size: 0.25, life: 0.3, gravity: -3,
      });
    }
    this.dead = true;
  }

  dispose() {
    this.game.scene.remove(this.mesh);
    this.mesh.material.dispose();
  }
}

export class PickupSystem {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  spawn(type, x, z, value = 1) {
    const p = new Pickup(type, x, z, value, this.game);
    this.list.push(p);
    return p;
  }

  burstXp(x, z, totalValue) {
    const count = Math.min(8, Math.max(1, Math.round(totalValue / 2)));
    const per = Math.max(1, Math.round(totalValue / count));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      this.spawn('xp', x + Math.cos(a) * r, z + Math.sin(a) * r, per);
    }
  }

  update(dt) {
    const p = this.game.player;
    p.pickupRange = 2.5 + p.level * 0.1;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const pk = this.list[i];
      pk.update(dt);
      if (pk.dead) {
        pk.dispose();
        this.list.splice(i, 1);
      }
    }
  }

  clear() {
    for (const pk of this.list) pk.dispose();
    this.list = [];
  }
}
