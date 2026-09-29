export const ENEMIES = {
  grunt: {
    id: 'grunt', name: '小兵', hp: 20, speed: 3.5, damage: 8, radius: 0.55,
    xp: 1, gold: [3, 8], color: '#ff4d6d', behavior: 'chase', mass: 1, unlockWave: 1,
  },
  runner: {
    id: 'runner', name: '疾行', hp: 14, speed: 6.5, damage: 6, radius: 0.45,
    xp: 1, gold: [3, 8], color: '#ff9f43', behavior: 'charger', mass: 0.7,
    dashCd: [1.5, 2.5], dashSpeed: 14, dashDur: 0.4, unlockWave: 2,
  },
  tank: {
    id: 'tank', name: '重装', hp: 120, speed: 2.0, damage: 18, radius: 1.1,
    xp: 5, gold: [12, 25], color: '#6c8cff', behavior: 'chase', mass: 4, armor: 0.1, unlockWave: 4,
  },
  shooter: {
    id: 'shooter', name: '射手', hp: 30, speed: 2.8, damage: 8, radius: 0.55,
    xp: 3, gold: [6, 14], color: '#c86bff', behavior: 'ranged', keepDist: 10,
    shotCd: 2.0, bulletSpeed: 14, bulletDamage: 8, unlockWave: 5,
  },
  dasher: {
    id: 'dasher', name: '突刺', hp: 40, speed: 3.0, damage: 14, radius: 0.6,
    xp: 4, gold: [8, 18], color: '#00e5ff', behavior: 'dasher', telegraph: 0.6,
    dashSpeed: 22, dashDur: 0.5, dashCd: [2.0, 3.0], unlockWave: 7,
  },
  swarmling: {
    id: 'swarmling', name: '蜂群', hp: 6, speed: 5.5, damage: 3, radius: 0.28,
    xp: 1, gold: [1, 3], color: '#7dff9b', behavior: 'chase', mass: 0.3, unlockWave: 3,
  },
  splitter: {
    id: 'splitter', name: '分裂', hp: 60, speed: 2.8, damage: 10, radius: 0.9,
    xp: 4, gold: [8, 16], color: '#ff6ec7', behavior: 'chase', mass: 2.5,
    splitInto: 'swarmling', splitCount: 3, unlockWave: 8,
  },
  elite: {
    id: 'elite', name: '精英', hp: 250, speed: 3.0, damage: 20, radius: 0.95,
    xp: 12, gold: [25, 45], color: '#ff4fd8', behavior: 'chase', mass: 3.5,
    armor: 0.18, elite: true, unlockWave: 9,
  },
};

export const BOSSES = {
  colossus: {
    id: 'colossus', name: '熔核巨像', hp: 3000, speed: 1.8, damage: 30, radius: 2.5,
    xp: 80, gold: [150, 250], color: '#ff5a2b', behavior: 'boss_ring', mass: 40,
    armor: 0.15, boss: true, ringCd: 2.2, ringBullets: 20, ringSpeed: 10, chargeCd: 6,
  },
  frost: {
    id: 'frost', name: '冰霜领主', hp: 5000, speed: 2.0, damage: 32, radius: 2.7,
    xp: 120, gold: [200, 320], color: '#66d9ff', behavior: 'boss_frost', mass: 45,
    armor: 0.18, boss: true, ringCd: 2.8, ringBullets: 16, ringSpeed: 8, summonCd: 7, iceCd: 5,
  },
  void: {
    id: 'void', name: '虚空吞噬', hp: 9000, speed: 2.4, damage: 38, radius: 3.0,
    xp: 200, gold: [350, 500], color: '#b14cff', behavior: 'boss_void', mass: 60,
    armor: 0.22, boss: true, ringCd: 2.0, ringBullets: 26, ringSpeed: 12, summonCd: 5.5, pullRadius: 20,
  },
};

export const BOSS_ORDER = ['colossus', 'frost', 'void'];

export function enemyScale(wave) {
  return {
    hp: (1 + (wave - 1) * 0.3) * (1 + (wave - 1) * 0.02 * (wave - 1)),
    damage: 1 + (wave - 1) * 0.12,
    speed: 1 + Math.min(0.5, (wave - 1) * 0.03),
    xp: 1 + Math.floor((wave - 1) * 0.1),
    gold: 1 + (wave - 1) * 0.05,
  };
}

export function poolForWave(wave) {
  return Object.values(ENEMIES).filter((e) => e.unlockWave <= wave);
}
