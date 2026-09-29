import * as THREE from 'three';
import { PLAYER } from './config.js';
import { CHARACTER_MAP } from './characters.js';
import { weaponStats } from './weaponDefs.js';
import { audio } from '../core/audio.js';
import { clamp, damp } from '../core/utils.js';

export class Player {
  constructor(charId, game) {
    this.game = game;
    this.char = CHARACTER_MAP[charId];
    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.facing = 0;
    this.radius = PLAYER.radius;

    this.maxHp = PLAYER.maxHp + (this.char.stats.maxHp || 0);
    this.hp = this.maxHp;
    this.speed = PLAYER.speed * (1 + (this.char.stats.speed || 0));
    this.damageMul = 1 + (this.char.stats.damage || 0);
    this.attackSpeedMul = 1 + (this.char.stats.attackSpeed || 0);
    this.areaMul = 1 + (this.char.stats.area || 0);
    this.critChance = 0.05 + (this.char.stats.critChance || 0);
    this.critDamage = 1.5 + (this.char.stats.critDamage || 0);
    this.armor = this.char.stats.armor || 0;

    this.level = 1;
    this.xp = 0;
    this.xpNeed = this._xpNeed(1);
    this.gold = 0;
    this.kills = 0;
    this.damageDealt = 0;
    this.alive = true;
    this.iframes = 0;
    this.dashCd = 0;
    this.dashT = 0;
    this.abilityCd = 0;
    this.abilityT = 0;
    this.abilityMaxCd = 15;

    this.weapons = [];
    this._buildMesh();
    this.addWeapon(this.char.weapon);
  }

  _xpNeed(lvl) { return Math.round(5 + lvl * 3 + Math.pow(lvl, 1.5) * 1.2); }

  _buildMesh() {
    this.group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.6, 4, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.char.color, roughness: 0.005, metalness: 1.0,
      emissive: this.char.color, emissiveIntensity: 1.5,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.7;
    this.body.castShadow = true;
    this.group.add(this.body);

    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#fff' });
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeL.position.set(-0.15, 0.95, 0.3);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR.position.set(0.15, 0.95, 0.3);
    this.group.add(this.eyeL, this.eyeR);

    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.char.color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    this.group.add(this.ring);

    this.game.scene.add(this.group);
  }

  addWeapon(weaponId) {
    const def = this.game.weaponDefs[weaponId];
    if (!def) return;
    const w = {
      def,
      level: 1,
      cd: 0,
      angle: 0,
      mesh: this._buildWeaponMesh(def),
    };
    this.weapons.push(w);
    this.group.add(w.mesh);
    return w;
  }

  _buildWeaponMesh(def) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.3, metalness: 0.6,
      emissive: def.color, emissiveIntensity: 0.3,
    });
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0.4, 0.7, 0.2);
    g.add(mesh);
    return g;
  }

  update(dt, input) {
    if (!this.alive) return;

    this.iframes = Math.max(0, this.iframes - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    if (this.abilityT > 0) this.abilityT -= dt;

    let mx = input.x, mz = input.y;
    if (input.dash && this.dashCd <= 0) {
      this.dashT = PLAYER.dashDur;
      this.dashCd = PLAYER.dashCd;
      this.iframes = Math.max(this.iframes, PLAYER.dashDur);
      this.game.particles.burst({
        x: this.x, y: 0.5, z: this.z, count: 15, speed: 6,
        color: [this.char.color, 0.5], size: 0.4, life: 0.3, gravity: 0,
      });
    }

    const spd = this.speed * (this.dashT > 0 ? PLAYER.dashSpeedMul : 1);
    if (this.dashT > 0) this.dashT -= dt;

    this.vx = damp(this.vx, mx * spd, 12, dt);
    this.vz = damp(this.vz, mz * spd, 12, dt);
    this.x = clamp(this.x + this.vx * dt, -22, 22);
    this.z = clamp(this.z + this.vz * dt, -22, 22);

    const curSpd = Math.hypot(this.vx, this.vz);
    if (curSpd > 2 && Math.random() < 0.3) {
      const c = new THREE.Color(this.char.color).toArray();
      this.game.particles.emit({
        x: this.x - this.vx * 0.05 + (Math.random() - 0.5) * 0.3,
        y: 0.15,
        z: this.z - this.vz * 0.05 + (Math.random() - 0.5) * 0.3,
        vx: -this.vx * 0.1, vy: 0.3, vz: -this.vz * 0.1,
        color: c, size: 0.15, life: 0.25, gravity: 0, drag: 1,
      });
    }

    if (Math.abs(mx) > 0.1 || Math.abs(mz) > 0.1) {
      this.facing = Math.atan2(mz, mx);
    }

    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = -this.facing + Math.PI / 2;
    this.ring.rotation.z += dt * 2;

    for (const w of this.weapons) {
      w.cd -= dt;
      if (w.cd <= 0) {
        this._fireWeapon(w);
      }
    }
  }

  _fireWeapon(w) {
    const s = weaponStats(w.def, w.level);
    const game = this.game;
    const aim = game.aimVector();
    w.angle = Math.atan2(aim.z, aim.x);
    w.cd = s.cd / this.attackSpeedMul;

    const mx = this.x + Math.cos(this.facing) * 0.6;
    const mz = this.z + Math.sin(this.facing) * 0.6;

    const wColor = new THREE.Color(w.def.color).toArray();
    game.particles.burst({
      x: mx, y: 0.8, z: mz, count: 6, speed: 4,
      color: wColor, size: 0.3, life: 0.2, gravity: 0,
    });
    game.particles.trail(mx, 0.8, mz, wColor, 0.2, 0.15);

    if (w.def.id === 'shotgun') {
      audio.shot();
      for (let i = 0; i < (s.pellets || 1); i++) {
        const a = w.angle + (Math.random() - 0.5) * (s.spread || 0.3);
        game.projectiles.spawn({
          kind: 'bullet', x: mx, y: 0.8, z: mz,
          vx: Math.cos(a) * s.speed, vz: Math.sin(a) * s.speed,
          damage: s.damage * this.damageMul, life: s.life, radius: s.size,
          knock: s.knock, color: w.def.color, pierce: 0,
          critChance: this.critChance, critDamage: this.critDamage,
        });
        game.particles.trail(mx, 0.8, mz, wColor, 0.15, 0.1);
      }
    } else if (w.def.id === 'tesla') {
      audio.tesla();
      game.projectiles.spawn({
        kind: 'tesla', x: mx, y: 0.8, z: mz,
        vx: Math.cos(w.angle) * s.speed, vz: Math.sin(w.angle) * s.speed,
        damage: s.damage * this.damageMul, life: s.life, radius: s.size,
        bounces: s.bounces, decay: s.decay, color: w.def.color,
        critChance: this.critChance, critDamage: this.critDamage,
      });
    } else if (w.def.id === 'rocket') {
      audio.shot();
      game.projectiles.spawn({
        kind: 'rocket', x: mx, y: 0.8, z: mz,
        vx: Math.cos(w.angle) * s.speed, vz: Math.sin(w.angle) * s.speed,
        damage: s.damage * this.damageMul, life: s.life, radius: s.size,
        knock: s.knock, color: w.def.color, explode: true,
        blastRadius: s.radius * this.areaMul,
        critChance: this.critChance, critDamage: this.critDamage,
      });
      game.particles.burst({ x: mx, y: 0.8, z: mz, count: 8, speed: 3, color: [1, 0.5, 0.2], size: 0.3, life: 0.25, gravity: 0 });
    } else if (w.def.id === 'frost') {
      for (let i = 0; i < 3; i++) {
        const a = w.angle + (Math.random() - 0.5) * s.cone;
        const d = Math.random() * s.range;
        game.particles.emit({
          x: mx + Math.cos(a) * d, y: 0.5 + Math.random() * 0.5, z: mz + Math.sin(a) * d,
          vx: Math.cos(a) * 2, vy: 0.5, vz: Math.sin(a) * 2,
          color: [0.4, 0.85, 1], size: 0.3, life: 0.3, gravity: 0, drag: 2,
        });
      }
      game.frostCone(this, s, mx, mz, w.angle);
      w.cd = s.cd / this.attackSpeedMul;
    } else if (w.def.id === 'orbital') {
      game.orbitalStrike(this, s);
      w.cd = s.cd / this.attackSpeedMul;
    } else if (w.def.id === 'knife') {
      const count = s.count || 1;
      for (let i = 0; i < count; i++) {
        const a = w.angle + (i - (count - 1) / 2) * 0.3;
        game.projectiles.spawn({
          kind: 'knife', x: mx, y: 0.8, z: mz,
          vx: Math.cos(a) * s.speed, vz: Math.sin(a) * s.speed,
          damage: s.damage * this.damageMul, life: s.life, radius: s.size,
          knock: s.knock, color: w.def.color, boomerang: true,
          critChance: this.critChance, critDamage: this.critDamage,
        });
        game.particles.trail(mx, 0.8, mz, [1, 0.9, 0.4], 0.2, 0.15);
      }
    } else {
      game.projectiles.spawn({
        kind: 'bullet', x: mx, y: 0.8, z: mz,
        vx: Math.cos(w.angle) * s.speed, vz: Math.sin(w.angle) * s.speed,
        damage: s.damage * this.damageMul, life: s.life, radius: s.size,
        knock: s.knock, color: w.def.color, pierce: s.pierce || 0,
        critChance: this.critChance, critDamage: this.critDamage,
      });
      game.particles.trail(mx, 0.8, mz, wColor, 0.12, 0.08);
    }
  }

  useAbility() {
    if (this.abilityCd > 0 || !this.alive) return false;
    this.abilityT = this.char.ability.duration;
    this.abilityCd = this.abilityMaxCd;
    this.game.onAbilityUsed(this);
    return true;
  }

  takeDamage(amount) {
    if (!this.alive || this.iframes > 0) return;
    const reduced = amount * (1 - this.armor);
    this.hp -= reduced;
    this.iframes = PLAYER.iframes;
    this.game.particles.burst({
      x: this.x, y: 0.8, z: this.z, count: 8, speed: 4,
      color: [1, 0.2, 0.3], size: 0.3, life: 0.3, gravity: 5,
    });
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.game.onPlayerDeath();
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpNeed && this.level < 50) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = this._xpNeed(this.level);
      this.game.onLevelUp();
    }
  }

  addGold(amount) {
    this.gold += Math.round(amount);
  }

  dispose() {
    this.game.scene.remove(this.group);
  }
}
