import * as THREE from 'three';
import { Loop } from '../core/loop.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { ParticleSystem } from '../fx/particles.js';
import { ShockwavePool, DecalPool, BeamPool } from '../fx/effects.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { ProjectileSystem } from './projectiles.js';
import { PickupSystem } from './pickups.js';
import { wavePlan } from './waves.js';
import { rollCards } from './upgrades.js';
import { WEAPON_MAP } from './weaponDefs.js';
import { CHARACTER_MAP } from './characters.js';
import { ARENA, WAVES, CAMERA, ECONOMY } from './config.js';
import { clamp, damp, dist, rand } from '../core/utils.js';

export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  PAUSED: 'paused',
  DEAD: 'dead',
  VICTORY: 'victory',
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = STATE.MENU;
    this.time = 0;
    this.runTime = 0;
    this.wave = 0;
    this.phase = 'idle';
    this.phaseTimer = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.waveTimer = 0;
    this.kills = 0;
    this.pendingLevels = 0;
    this.levelUpCards = [];
    this.player = null;
    this.weaponDefs = WEAPON_MAP;
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    this._initRenderer();
    this._initScene();
    this._initSystems();

    this.input = new Input(canvas);
    this.loop = new Loop(
      (dt) => this.update(dt),
      (dt) => this.render(dt),
    );

    this.characters = CHARACTER_MAP;
    this._buildArena();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#6a6ac8');
    this.scene.fog = new THREE.FogExp2('#6a6ac8', 0.00005);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      window.innerWidth / window.innerHeight,
      0.5,
      200,
    );
    this.camera.position.set(0, CAMERA.height, CAMERA.distance);
    this.camera.lookAt(0, 0, 0);
    this.camTarget = new THREE.Vector3();

    const hemi = new THREE.HemisphereLight('#eeffff', '#9a8ac0', 5.0);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight('#ffffff', 5.0);
    this.sun.position.set(10, 20, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.scene.add(this.sun);

    const rim1 = new THREE.PointLight('#ff4488', 20, 40);
    rim1.position.set(-10, 6, -10);
    this.scene.add(rim1);
    const rim2 = new THREE.PointLight('#4488ff', 20, 40);
    rim2.position.set(10, 6, 10);
    this.scene.add(rim2);
  }

  _initSystems() {
    this.particles = new ParticleSystem(this.scene, 6000);
    this.shockwaves = new ShockwavePool(this.scene, 24);
    this.decals = new DecalPool(this.scene, 32);
    this.beams = new BeamPool(this.scene, 12);
    this.enemies = new EnemyManager(this);
    this.projectiles = new ProjectileSystem(this);
    this.pickups = new PickupSystem(this);
    this.floaters = { spawn: () => {} };
  }

  _buildArena() {
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#1a1a3a', roughness: 0.6, metalness: 0.4,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(60, 60, '#3a3a7a', '#2a2a5a');
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    const wallMat = new THREE.MeshStandardMaterial({
      color: '#1a1a3a', roughness: 0.5, metalness: 0.5,
      transparent: true, opacity: 0.6,
    });
    const wallGeo = new THREE.BoxGeometry(0.5, 2, ARENA.half * 2 + 1);
    const positions = [
      [0, -ARENA.half - 0.5], [0, ARENA.half + 0.5],
      [-ARENA.half - 0.5, 0], [ARENA.half + 0.5, 0],
    ];
    for (const [x, z] of positions) {
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, 1, z);
      if (x !== 0) wall.rotation.y = Math.PI / 2;
      this.scene.add(wall);
    }
  }

  startRun(charId) {
    if (this.player) this.player.dispose();
    this.enemies.clear();
    this.projectiles.clear();
    this.pickups.clear();
    this.particles.clear();
    this.shockwaves.clear();
    this.decals.clear();
    this.beams.clear();

    this.player = new Player(charId, this);
    this.wave = 0;
    this.time = 0;
    this.runTime = 0;
    this.kills = 0;
    this.pendingLevels = 0;
    this.levelUpCards = [];

    this._nextWave();
    this.state = STATE.PLAYING;
    if (!this.loop.running) this.loop.start();
  }

  _nextWave() {
    this.wave++;
    this.phase = 'prep';
    this.phaseTimer = this.wave === 1 ? 2 : WAVES.prepTime;
    this.spawnQueue = [];
    this.waveTimer = 0;
  }

  _startCombat() {
    const plan = wavePlan(this.wave, Math.random);
    this.spawnQueue = plan.roster;
    this.waveTimer = plan.duration;
    this.spawnInterval = Math.max(0.2, 1.2 - this.wave * 0.04);
    this.spawnTimer = 0.3;
    this.phase = 'combat';
    this.onWaveStart?.(this.wave, plan.isBoss);
  }

  _endWave() {
    if (this.wave >= WAVES.total) {
      this.state = STATE.VICTORY;
      audio.victory();
      this.onVictory?.(this._summary());
      return;
    }
    this.phase = 'rest';
    this.phaseTimer = WAVES.restTime;
    this.onWaveEnd?.(this.wave);
  }

  update(dt) {
    this.time += dt;

    if (this.state === STATE.PLAYING && this.player) {
      this.runTime += dt;
      this._updatePhase(dt);

      const input = this.input.axis;
      this.player.update(dt, { x: input.x, y: input.y, dash: this.input.dashing });

      if (this.input.paused) {
        this.state = STATE.PAUSED;
        return;
      }

      this.enemies.update(dt, this.player);
      this.projectiles.update(dt);
      this.pickups.update(dt);

      if (this.player.regen) {
        this.player.heal(this.player.regen * dt);
      }
    }

    this.particles.update(dt, this.camTarget.x, this.camTarget.z);
    this.shockwaves.update(dt);
    this.decals.update(dt);
    this.beams.update(dt);

    if (this.player) {
      this.camTarget.x = damp(this.camTarget.x, this.player.x, CAMERA.lambda, dt);
      this.camTarget.z = damp(this.camTarget.z, this.player.z, CAMERA.lambda, dt);
    }
  }

  _updatePhase(dt) {
    if (this.phase === 'prep') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this._startCombat();
    } else if (this.phase === 'combat') {
      this.waveTimer -= dt;
      if (this.spawnQueue.length > 0) {
        this.spawnTimer -= dt;
        while (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
          this.spawnTimer += this.spawnInterval;
          this._spawnEnemy(this.spawnQueue.shift());
        }
      }
      if (this.waveTimer <= 0 && this.spawnQueue.length === 0 && this.enemies.countAlive() === 0) {
        this._endWave();
      }
    } else if (this.phase === 'rest') {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) this._nextWave();
    }
  }

  _spawnEnemy(id) {
    const p = this.player;
    const a = Math.random() * Math.PI * 2;
    const r = rand(ARENA.spawnMin, ARENA.spawnMax);
    const x = clamp(p.x + Math.cos(a) * r, -ARENA.half, ARENA.half);
    const z = clamp(p.z + Math.sin(a) * r, -ARENA.half, ARENA.half);
    const e = this.enemies.spawn(id, x, z, this.wave);
    if (e) {
      this.particles.burst({
        x, y: 0.5, z, count: 6, speed: 3,
        color: [new THREE.Color(e.color).toArray()],
        size: 0.3, life: 0.3, gravity: 0,
      });
    }
    return e;
  }

  aimVector() {
    const p = this.player;
    if (!p) return { x: 1, z: 0 };
    let best = null, bestD = 30;
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      const d = dist(p.x, p.z, e.x, e.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      const dx = best.x - p.x, dz = best.z - p.z;
      const l = Math.hypot(dx, dz) || 1;
      return { x: dx / l, z: dz / l };
    }
    const sp = Math.hypot(p.vx, p.vz);
    if (sp > 0.5) return { x: p.vx / sp, z: p.vz / sp };
    return { x: Math.cos(p.facing), z: Math.sin(p.facing) };
  }

  frostCone(player, s, mx, mz, baseAngle) {
    for (const e of this.enemies.list) {
      if (!e.alive) continue;
      const dx = e.x - mx, dz = e.z - mz;
      const d = Math.hypot(dx, dz);
      if (d > s.range + e.radius) continue;
      const dot = d < 0.01 ? 1 : (dx / d) * Math.cos(baseAngle) + (dz / d) * Math.sin(baseAngle);
      if (dot < Math.cos(s.cone) - 0.1) continue;
      e.damage(s.damage * player.damageMul, 'frost');
      e.slowT = Math.max(e.slowT, s.slowDur);
      e.slowMul = Math.min(e.slowMul, 1 - s.slow);
      this.particles.emit({
        x: e.x, y: 0.5, z: e.z, color: [0.4, 0.85, 1],
        size: 0.25, life: 0.3, vx: 0, vy: 0.5, vz: 0, gravity: 0,
      });
    }
  }

  orbitalStrike(player, s) {
    for (let i = 0; i < s.count; i++) {
      const a = (i / s.count) * Math.PI * 2 + this.time * s.spin;
      const ox = player.x + Math.cos(a) * s.radius;
      const oz = player.z + Math.sin(a) * s.radius;
      this.particles.emit({
        x: ox, y: 0.8, z: oz, color: [0.5, 1, 0.7],
        size: 0.3, life: 0.2, vx: 0, vy: 0, vz: 0, gravity: 0,
      });
      for (const e of this.enemies.list) {
        if (!e.alive) continue;
        if (dist(e.x, e.z, ox, oz) < e.radius + 0.8) {
          e.damage(s.damage * player.damageMul, 'orbital');
          const dx = e.x - ox, dz = e.z - oz;
          const d = Math.hypot(dx, dz) || 1;
          e.knockX += (dx / d) * s.knock;
          e.knockZ += (dz / d) * s.knock;
        }
      }
    }
  }

  enemyShoot(e, nx, nz, speed, damage) {
    this.projectiles.spawn({
      kind: 'enemy', x: e.x, y: 0.6, z: e.z,
      vx: nx * speed, vz: nz * speed,
      damage, life: 3, radius: 0.15, knock: 2,
      color: e.color, pierce: 0,
    });
  }

  bossRing(e, count, speed) {
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = base + (i / count) * Math.PI * 2;
      this.projectiles.spawn({
        kind: 'enemy', x: e.x, y: 0.6, z: e.z,
        vx: Math.cos(a) * speed, vz: Math.sin(a) * speed,
        damage: e.contactDamage * 0.5, life: 4, radius: 0.2,
        knock: 3, color: e.color, pierce: 0,
      });
    }
    this.shockwaves.spawn({ x: e.x, z: e.z, r0: 1, r1: 4, dur: 0.3, color: [1, 0.5, 0.3] });
  }

  bossSpiral(e, count, speed) {
    e.spiralA = (e.spiralA || 0) + 0.5;
    for (let i = 0; i < count; i++) {
      const a = e.spiralA + (i / count) * Math.PI * 2;
      this.projectiles.spawn({
        kind: 'enemy', x: e.x, y: 0.6, z: e.z,
        vx: Math.cos(a) * speed, vz: Math.sin(a) * speed,
        damage: e.contactDamage * 0.5, life: 5, radius: 0.18,
        knock: 3, color: e.color, pierce: 0,
      });
    }
  }

  bossSummon(e, id, count) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.enemies.spawn(id, e.x + Math.cos(a) * 2, e.z + Math.sin(a) * 2, this.wave);
    }
    this.shockwaves.spawn({ x: e.x, z: e.z, r0: 1, r1: 5, dur: 0.4, color: [0.7, 0.3, 1] });
  }

  bossIce(e) {
    const r = 12;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const x = this.player.x + Math.cos(a) * r;
      const z = this.player.z + Math.sin(a) * r;
      this.decals.spawn({ x, z, r: 2, dur: 1, color: [0.2, 0.5, 0.9] });
    }
    setTimeout(() => {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = this.player.x + Math.cos(a) * r;
        const z = this.player.z + Math.sin(a) * r;
        this.particles.burst({ x, y: 0.5, z, count: 10, speed: 4, color: [0.5, 0.8, 1], size: 0.3, life: 0.4 });
        if (this.player && dist(this.player.x, this.player.z, x, z) < 2.5) {
          this.player.takeDamage(e.contactDamage * 0.4);
        }
      }
    }, 500);
  }

  onEnemyKilled(enemy) {
    this.kills++;
    audio.kill();
    this.particles.explosion(
      enemy.x, enemy.radius + 0.3, enemy.z,
      enemy.boss ? 6 : enemy.elite ? 4 : 2,
      new THREE.Color(enemy.color).toArray(),
    );
    if (enemy.boss) {
      this.addTrauma(0.6);
      this.shockwaves.spawn({ x: enemy.x, z: enemy.z, r0: 1, r1: 15, dur: 0.7, color: [1, 1, 1] });
    } else if (enemy.elite) {
      this.addTrauma(0.25);
    }
    this.pickups.burstXp(enemy.x, enemy.z, enemy.xpValue);
    if (Math.random() < ECONOMY.goldPerKillChance || enemy.boss) {
      const gold = Math.round(rand(enemy.goldValue[0], enemy.goldValue[1]));
      this.pickups.spawn('gold', enemy.x, enemy.z, gold);
    }
    if (Math.random() < ECONOMY.healDropChance) {
      this.pickups.spawn('heal', enemy.x, enemy.z, 15);
    }
  }

  onLevelUp() {
    this.pendingLevels++;
    audio.levelUp();
    if (this.state === STATE.PLAYING) {
      this.state = STATE.LEVELUP;
      this.levelUpCards = rollCards(this.player, 3, Math.random, this.wave);
      this.onLevelUpUI?.(this.levelUpCards);
    }
  }

  chooseUpgrade(index) {
    if (this.state !== STATE.LEVELUP) return;
    const card = this.levelUpCards[index];
    if (card) {
      audio.ui();
      card.apply(this.player);
      this.particles.levelUpBurst(this.player.x, 0.5, this.player.z);
      this.shockwaves.spawn({
        x: this.player.x, z: this.player.z, r0: 0.5, r1: 5,
        dur: 0.4, color: [0.5, 0.9, 1],
      });
    }
    this.pendingLevels--;
    if (this.pendingLevels > 0) {
      this.levelUpCards = rollCards(this.player, 3, Math.random, this.wave);
      this.onLevelUpUI?.(this.levelUpCards);
    } else {
      this.state = STATE.PLAYING;
    }
  }

  onPlayerDeath() {
    this.state = STATE.DEAD;
    audio.gameOver();
    this.addTrauma(0.8);
    this.particles.explosion(this.player.x, 0.5, this.player.z, 5, [1, 0.2, 0.3]);
    this.shockwaves.spawn({
      x: this.player.x, z: this.player.z, r0: 0.5, r1: 10,
      dur: 0.6, color: [1, 0.2, 0.3],
    });
    this.onGameOver?.(this._summary());
  }

  onAbilityUsed(player) {
    this.addTrauma(0.3);
    this.particles.burst({
      x: player.x, y: 0.5, z: player.z,
      count: 35, speed: 8, color: [new THREE.Color(player.char.color).toArray()],
      size: 0.45, life: 0.5, gravity: 0,
    });
    this.shockwaves.spawn({
      x: player.x, z: player.z, r0: 0.5, r1: 8,
      dur: 0.5, color: [new THREE.Color(player.char.color).toArray()],
    });
  }

  _summary() {
    return {
      wave: this.wave,
      kills: this.kills,
      level: this.player?.level || 1,
      time: this.runTime,
      gold: this.player?.gold || 0,
    };
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  render(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 2);
    const shake = this.trauma * this.trauma;
    this.shakeX = (Math.random() - 0.5) * shake * 1.5;
    this.shakeY = (Math.random() - 0.5) * shake * 1.5;

    this.camera.position.set(
      this.camTarget.x + this.shakeX,
      CAMERA.height + this.shakeY,
      this.camTarget.z + CAMERA.distance,
    );
    this.camera.lookAt(this.camTarget.x + this.shakeX, 0, this.camTarget.z);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
