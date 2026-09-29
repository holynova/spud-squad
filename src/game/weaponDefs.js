export const WEAPONS = [
  {
    id: 'shotgun', name: '霰弹枪', color: '#ffb13b', element: 'kinetic',
    desc: '近距离锥形散射，弹丸独立暴击',
    maxLevel: 5,
    base: { damage: 8, cd: 1.0, pellets: 5, spread: 0.4, speed: 30, life: 0.4, range: 14, knock: 4, size: 0.3 },
    levels: [
      { pellets: 7 }, { damage: 12, pellets: 8 }, { damage: 15, cd: 0.85 },
      { damage: 20, pellets: 10, spread: 0.5 },
    ],
  },
  {
    id: 'smg', name: '冲锋枪', color: '#41b8ff', element: 'kinetic',
    desc: '极高射速，压制火力',
    maxLevel: 5,
    base: { damage: 4, cd: 0.1, speed: 45, life: 0.7, range: 22, knock: 1, size: 0.18, pierce: 0 },
    levels: [
      { cd: 0.085 }, { damage: 6, pierce: 1 }, { damage: 7, cd: 0.07 },
      { damage: 9, pierce: 2 },
    ],
  },
  {
    id: 'sniper', name: '狙击枪', color: '#ff5f6d', element: 'kinetic',
    desc: '超远穿透，单发高伤',
    maxLevel: 5,
    base: { damage: 45, cd: 2.0, speed: 80, life: 1.2, range: 50, knock: 8, size: 0.35, pierce: 5 },
    levels: [
      { damage: 65 }, { damage: 85, cd: 1.7 }, { damage: 110, pierce: 8 },
      { damage: 150, cd: 1.4 },
    ],
  },
  {
    id: 'rocket', name: '火箭筒', color: '#ff7a3b', element: 'fire',
    desc: '范围爆炸，清群利器',
    maxLevel: 5,
    base: { damage: 25, cd: 1.6, speed: 20, life: 1.5, radius: 3.5, knock: 8, size: 0.4, explode: true },
    levels: [
      { radius: 4.2 }, { damage: 38, radius: 4.8 }, { damage: 50, cd: 1.3 },
      { damage: 65, radius: 5.5 },
    ],
  },
  {
    id: 'tesla', name: '特斯拉', color: '#c46bff', element: 'arc',
    desc: '连锁闪电，自动弹跳',
    maxLevel: 5,
    base: { damage: 12, cd: 0.7, speed: 35, life: 0.6, range: 18, bounces: 3, decay: 0.85, size: 0.35 },
    levels: [
      { bounces: 5 }, { damage: 18, bounces: 6 }, { damage: 24, cd: 0.55 },
      { damage: 32, bounces: 8 },
    ],
  },
  {
    id: 'frost', name: '冰冻射线', color: '#6fe3ff', element: 'frost',
    desc: '减速控制，安全风筝',
    maxLevel: 5,
    base: { damage: 3, cd: 0.06, dps: true, cone: 0.35, range: 10, slow: 0.4, slowDur: 1.5, size: 0.25 },
    levels: [
      { cone: 0.45, range: 12 }, { damage: 4.5, slow: 0.55 }, { damage: 6, cone: 0.55 },
      { damage: 8, range: 14 },
    ],
  },
  {
    id: 'orbital', name: '轨道炮', color: '#7dffb0', element: 'kinetic',
    desc: '环绕弹体，持续输出',
    maxLevel: 5,
    base: { damage: 10, cd: 0.5, count: 2, radius: 3, spin: 2.5, knock: 5, size: 0.35 },
    levels: [
      { count: 3 }, { damage: 15, radius: 3.5 }, { count: 4, damage: 20 },
      { count: 5, damage: 25, spin: 3.5 },
    ],
  },
  {
    id: 'knife', name: '飞刀', color: '#ffe066', element: 'kinetic',
    desc: '回旋返回，路径伤害',
    maxLevel: 5,
    base: { damage: 15, cd: 0.8, speed: 28, life: 1.2, range: 16, knock: 3, size: 0.28, boomerang: true },
    levels: [
      { damage: 22 }, { damage: 30, cd: 0.65 }, { damage: 40, count: 2 },
      { damage: 55, count: 3 },
    ],
  },
];

export const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export function weaponStats(weapon, level) {
  const s = { ...weapon.base };
  for (let i = 0; i < level - 1 && i < weapon.levels.length; i++) {
    Object.assign(s, weapon.levels[i]);
  }
  return s;
}
