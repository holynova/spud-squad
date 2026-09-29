export const ARENA = {
  half: 22,
  spawnMin: 18,
  spawnMax: 24,
};

export const PLAYER = {
  maxHp: 100,
  speed: 8,
  radius: 0.6,
  iframes: 0.5,
  dashSpeedMul: 2.5,
  dashDur: 0.2,
  dashCd: 1.5,
  pickupRange: 2.5,
};

export const WAVES = {
  duration: 45,
  total: 20,
  bossEvery: 5,
  prepTime: 3,
  restTime: 8,
};

export const ECONOMY = {
  goldPerKill: 0.15,
  healDropChance: 0.03,
};

export const CAMERA = {
  fov: 50,
  distance: 16,
  height: 20,
  lambda: 6,
};

export const COLORS = {
  spark: [1.0, 0.85, 0.4],
  frost: [0.4, 0.85, 1.0],
  arc: [0.65, 0.55, 1.0],
  ember: [1.0, 0.45, 0.15],
  toxic: [0.5, 1.0, 0.4],
  blood: [1.0, 0.2, 0.3],
  holy: [1.0, 0.95, 0.6],
  void: [0.7, 0.3, 1.0],
};
