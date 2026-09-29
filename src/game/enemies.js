import * as THREE from 'three';
import { ENEMIES, BOSSES, enemyScale } from './enemyDefs.js';
import { dist, rand, clamp } from '../core/utils.js';

const GEO_CACHE = {};
function getGeo(shape) {
  if (GEO_CACHE[shape]) return GEO_CACHE[shape];
  let geo;
  switch (shape) {
    case 'tetra': geo = new THREE.TetrahedronGeometry(0.5); break;
    case 'octa': geo = new THREE.OctahedronGeometry(0.4); break;
    case 'box': geo = new THREE.BoxGeometry(0.8, 0.8, 0.8); break;
    case 'cone': geo = new THREE.ConeGeometry(0.4, 0.8, 6); break;
    case 'blade': geo = new THREE.ConeGeometry(0.25, 0.9, 4); break;
    case 'tiny': geo = new THREE.SphereGeometry(0.25, 6, 6); break;
    case 'ring': geo = new THREE.TorusGeometry(0.4, 0.12, 6, 12); break;
    case 'boss_core': geo = new THREE.IcosahedronGeometry(1.8, 1); break;
    case 'boss_frost': geo = new THREE.OctahedronGeometry(2.0, 1); break;
    case 'boss_void': geo = new THREE.TorusKnotGeometry(1.5, 0.4, 32, 8); break;
    default: geo = new THREE.SphereGeometry(0.5, 8, 8);
  }
  GEO_CACHE[shape] = geo;
  return geo;
}

export class Enemy {
  constructor(id, x, z, wave, game) {
    const def = ENEMIES[id] || BOSSES[id];
    this.def = def;
    this.id = id;
    this.game = game;
    this.x = x;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.knockX = 0;
    this.knockZ = 0;
    this.radius = def.radius;
    this.mass = def.mass || 1;
    this.armor = def.armor || 0;
    this.elite = def.elite || false;
    this.boss = def.boss || false;
    this.color = def.color;
    this.contactDamage = def.damage;

    const scale = enemyScale(wave);
    this.maxHp = def.hp * scale.hp;
    this.hp = this.maxHp;
    this.speed = def.speed * scale.speed;
    this.attackDamage = def.damage * scale.damage;
    this.xpValue = def.xp * scale.xp;
    this.goldValue = def.gold;
    this.alive = true;
    this.hitFlash = 0;
    this.slowT = 0;
    this.slowMul = 1;
    this.stunT = 0;
    this.freezeT = 0;
    this.shockT = 0;
    this.dashT = 0;
    this.dashCd = rand(def.dashCd?.[0] || 2, def.dashCd?.[1] || 3);
    this.shotCd = def.shotCd || 2;
    this.ringCd = def.ringCd || 2.5;
    this.summonCd = def.summonCd || 7;
    this.iceCd = def.iceCd || 5;
    this.chargeCd = def.chargeCd || 6;
    this.telegraphT = 0;
    this.spiralA = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;

    this._buildMesh();
  }

  _buildMesh() {
    this.group = new THREE.Group();
    const color = new THREE.Color(this.color);

    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.002, metalness: 1.0,
      emissive: color, emissiveIntensity: 2.5,
    });
    this.mesh = new THREE.Mesh(getGeo(this.def.shape), mat);
    this.mesh.position.y = this.radius + 0.3;
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    if (this.boss) {
      const glowGeo = new THREE.SphereGeometry(this.radius * 1.3, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this.glow = new THREE.Mesh(glowGeo, glowMat);
      this.glow.position.y = this.radius + 0.3;
      this.group.add(this.glow);
    }

    this.group.position.set(this.x, 0, this.z);
    this.game.scene.add(this.group);
  }

  damage(amount, source, opts = {}) {
    if (!this.alive) return;
    const finalDmg = amount * (1 - this.armor);
    this.hp -= finalDmg;
    this.hitFlash = 0.1;
    this.game.player.damageDealt += finalDmg;

    if (!opts.silent) {
      const hitColor = new THREE.Color(this.color).toArray();
      this.game.particles.burst({
        x: this.x, y: this.radius + 0.3, z: this.z,
        count: opts.crit ? 15 : 8, speed: opts.crit ? 7 : 4,
        color: opts.crit ? [1, 0.9, 0.3] : hitColor,
        size: opts.crit ? 0.4 : 0.25, life: 0.3, gravity: 4,
      });
      this.game.particles.burst({
        x: this.x, y: this.radius + 0.3, z: this.z,
        count: 3, speed: 2, color: [1, 1, 1],
        size: 0.15, life: 0.15, gravity: 0,
      });
    }

    if (this.hp <= 0) {
      this._die();
    }
  }

  _die() {
    this.alive = false;
    const game = this.game;
    const p = game.player;

    game.shockwaves.spawn({
      x: this.x, z: this.z, r0: this.radius * 0.5,
      r1: this.boss ? 12 : this.elite ? 6 : 3,
      dur: this.boss ? 0.6 : 0.3,
      color: new THREE.Color(this.color).toArray(),
    });

    if (this.boss) {
      game.shockwaves.spawn({
        x: this.x, z: this.z, r0: 1, r1: 20, dur: 0.8,
        color: [1, 1, 1],
      });
    }

    p.addXp(this.xpValue);
    p.kills++;

    if (Math.random() < 0.15 || this.boss) {
      const gold = Math.round(rand(this.goldValue[0], this.goldValue[1]));
      p.addGold(gold);
      game.floaters.spawn(this.x, this.radius + 1, this.z, `+${gold}g`, 'gold');
    }

    if (this.def.splitInto) {
      for (let i = 0; i < (this.def.splitCount || 2); i++) {
        const a = (i / this.def.splitCount) * Math.PI * 2;
        const child = game.enemies.spawn(
          this.def.splitInto,
          this.x + Math.cos(a) * 1.2,
          this.z + Math.sin(a) * 1.2,
          game.wave,
        );
        if (child) {
          child.knockX = Math.cos(a) * 8;
          child.knockZ = Math.sin(a) * 8;
        }
      }
    }

    game.onEnemyKilled(this);
    this.dispose();
  }

  update(dt, player) {
    if (!this.alive) return;
    const game = this.game;

    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.mesh.material.emissiveIntensity = 0.2 + this.hitFlash * 5;

    if (this.freezeT > 0) {
      this.freezeT -= dt;
      this.mesh.material.emissive.setHex(0x4488ff);
      this.mesh.material.emissiveIntensity = 0.5;
      return;
    }

    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }

    const slowMul = this.slowT > 0 ? this.slowMul : 1;
    if (this.slowT > 0) this.slowT -= dt;
    if (this.shockT > 0) this.shockT -= dt;

    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d, nz = dz / d;

    let moveX = nx, moveZ = nz;
    let spd = this.speed * slowMul;

    switch (this.def.behavior) {
      case 'charger':
        this.dashCd -= dt;
        if (this.dashCd <= 0 && d < 12) {
          this.dashT = this.def.dashDur;
          this.dashCd = rand(this.def.dashCd[0], this.def.dashCd[1]);
        }
        if (this.dashT > 0) {
          this.dashT -= dt;
          spd = this.def.dashSpeed;
          this.game.particles.emit({
            x: this.x, y: 0.3, z: this.z, color: [1, 0.6, 0.2],
            size: 0.3, life: 0.2, vx: 0, vy: 0.5, vz: 0, gravity: 0,
          });
        }
        break;

      case 'ranged':
        if (d < this.def.keepDist * 0.7) { moveX = -nx; moveZ = -nz; }
        else if (d < this.def.keepDist * 1.3) { moveX = 0; moveZ = 0; }
        this.shotCd -= dt;
        if (this.shotCd <= 0 && d < 20) {
          this.shotCd = this.def.shotCd;
          game.enemyShoot(this, nx, nz, this.def.bulletSpeed, this.def.bulletDamage);
        }
        break;

      case 'dasher':
        this.dashCd -= dt;
        if (this.telegraphT > 0) {
          this.telegraphT -= dt;
          moveX = 0; moveZ = 0;
          this.mesh.material.emissiveIntensity = 0.8;
          if (this.telegraphT <= 0) {
            this.dashT = this.def.dashDur;
          }
        } else if (this.dashT > 0) {
          this.dashT -= dt;
          spd = this.def.dashSpeed;
        } else if (this.dashCd <= 0 && d < 10) {
          this.telegraphT = this.def.telegraph;
          this.dashCd = rand(this.def.dashCd[0], this.def.dashCd[1]);
        }
        break;

      case 'boss_ring':
        this.ringCd -= dt;
        this.chargeCd -= dt;
        if (this.ringCd <= 0) {
          this.ringCd = this.def.ringCd;
          game.bossRing(this, this.def.ringBullets, this.def.ringSpeed);
        }
        if (this.chargeCd <= 0 && d < 15) {
          this.chargeCd = this.def.chargeCd;
          this.dashT = 0.8;
          spd = this.speed * 4;
          game.shockwaves.spawn({ x: this.x, z: this.z, r0: 1, r1: 4, dur: 0.3, color: [1, 0.3, 0.2] });
        }
        break;

      case 'boss_frost':
        this.ringCd -= dt;
        this.summonCd -= dt;
        this.iceCd -= dt;
        if (this.ringCd <= 0) {
          this.ringCd = this.def.ringCd;
          game.bossRing(this, this.def.ringBullets, this.def.ringSpeed);
        }
        if (this.summonCd <= 0) {
          this.summonCd = this.def.summonCd;
          game.bossSummon(this, 'swarmling', 4);
        }
        if (this.iceCd <= 0) {
          this.iceCd = this.def.iceCd;
          game.bossIce(this);
        }
        break;

      case 'boss_void':
        this.ringCd -= dt;
        this.summonCd -= dt;
        if (this.ringCd <= 0) {
          this.ringCd = this.def.ringCd;
          game.bossSpiral(this, this.def.ringBullets, this.def.ringSpeed);
        }
        if (this.summonCd <= 0) {
          this.summonCd = this.def.summonCd;
          game.bossSummon(this, 'runner', 3);
        }
        if (d < (this.def.pullRadius || 20)) {
          const pull = (1 - d / (this.def.pullRadius || 20)) * 15;
          player.vx -= nx * pull * dt * 10;
          player.vz -= nz * pull * dt * 10;
        }
        break;
    }

    this.vx = this.vx * 0.85 + moveX * spd * 0.15 + this.knockX;
    this.vz = this.vz * 0.85 + moveZ * spd * 0.15 + this.knockZ;
    this.knockX *= 0.85;
    this.knockZ *= 0.85;

    this.x = clamp(this.x + this.vx * dt, -24, 24);
    this.z = clamp(this.z + this.vz * dt, -24, 24);

    this.group.position.set(this.x, 0, this.z);
    this.mesh.rotation.y += dt * (this.boss ? 0.5 : 2);
    this.mesh.rotation.x += dt * 0.5;

    if (d < this.radius + player.radius) {
      player.takeDamage(this.contactDamage);
      const push = 5;
      this.knockX = -nx * push;
      this.knockZ = -nz * push;
    }
  }

  dispose() {
    this.game.scene.remove(this.group);
    this.mesh.material.dispose();
  }
}

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.list = [];
  }

  spawn(id, x, z, wave) {
    const e = new Enemy(id, x, z, wave, this.game);
    this.list.push(e);
    return e;
  }

  update(dt, player) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.update(dt, player);
      if (!e.alive) {
        this.list.splice(i, 1);
      }
    }
  }

  countAlive() {
    return this.list.filter((e) => e.alive).length;
  }

  clear() {
    for (const e of this.list) e.dispose();
    this.list = [];
  }
}
