export const UPGRADE_POOL = [
  {
    id: 'damage', name: '攻击力', icon: '⚔️', desc: '所有武器伤害 +15%',
    rarity: 'common', weight: 100,
    apply: (p) => { p.damageMul *= 1.15; },
  },
  {
    id: 'speed', name: '攻击速度', icon: '⚡', desc: '攻击速度 +12%',
    rarity: 'common', weight: 90,
    apply: (p) => { p.attackSpeedMul *= 1.12; },
  },
  {
    id: 'maxhp', name: '生命上限', icon: '❤️', desc: '最大生命 +25 并回复 25',
    rarity: 'common', weight: 85,
    apply: (p) => { p.maxHp += 25; p.heal(25); },
  },
  {
    id: 'movespeed', name: '移动速度', icon: '👟', desc: '移动速度 +10%',
    rarity: 'common', weight: 80,
    apply: (p) => { p.speed *= 1.1; },
  },
  {
    id: 'area', name: '范围扩大', icon: '💥', desc: '爆炸/技能范围 +20%',
    rarity: 'rare', weight: 50,
    apply: (p) => { p.areaMul *= 1.2; },
  },
  {
    id: 'crit', name: '暴击率', icon: '🎯', desc: '暴击率 +8%',
    rarity: 'rare', weight: 45,
    apply: (p) => { p.critChance += 0.08; },
  },
  {
    id: 'critdmg', name: '暴击伤害', icon: '💢', desc: '暴击伤害 +30%',
    rarity: 'rare', weight: 40,
    apply: (p) => { p.critDamage += 0.3; },
  },
  {
    id: 'armor', name: '护甲', icon: '🛡️', desc: '减伤 +8%',
    rarity: 'rare', weight: 40,
    apply: (p) => { p.armor = Math.min(0.6, p.armor + 0.08); },
  },
  {
    id: 'pickup', name: '拾取范围', icon: '🧲', desc: '拾取范围 +30%',
    rarity: 'common', weight: 60,
    apply: (p) => { p.pickupRangeBonus = (p.pickupRangeBonus || 0) + 0.3; },
  },
  {
    id: 'xpboost', name: '经验加成', icon: '📚', desc: '经验获取 +20%',
    rarity: 'rare', weight: 35,
    apply: (p) => { p.xpMul = (p.xpMul || 1) * 1.2; },
  },
  {
    id: 'goldboost', name: '金币加成', icon: '💰', desc: '金币获取 +25%',
    rarity: 'rare', weight: 35,
    apply: (p) => { p.goldMul = (p.goldMul || 1) * 1.25; },
  },
  {
    id: 'regen', name: '生命恢复', icon: '💚', desc: '每秒回复 1.5 生命',
    rarity: 'epic', weight: 20,
    apply: (p) => { p.regen = (p.regen || 0) + 1.5; },
  },
  {
    id: 'weapon', name: '武器升级', icon: '🔫', desc: '随机一把武器升 1 级',
    rarity: 'epic', weight: 25,
    apply: (p) => {
      const upgradable = p.weapons.filter((w) => w.level < w.def.maxLevel);
      if (upgradable.length > 0) {
        const w = upgradable[Math.floor(Math.random() * upgradable.length)];
        w.level++;
      } else {
        p.damageMul *= 1.1;
      }
    },
  },
  {
    id: 'newweapon', name: '新武器', icon: '🆕', desc: '获得一把随机新武器',
    rarity: 'epic', weight: 15,
    apply: (p) => {
      if (p.weapons.length < 6) {
        const owned = new Set(p.weapons.map((w) => w.def.id));
        const available = Object.values(p.game.weaponDefs).filter((w) => !owned.has(w.id));
        if (available.length > 0) {
          const def = available[Math.floor(Math.random() * available.length)];
          p.addWeapon(def.id);
        }
      } else {
        p.damageMul *= 1.15;
      }
    },
  },
];

export function rollCards(player, count, rng, wave) {
  const available = UPGRADE_POOL.filter((u) => {
    if (u.id === 'newweapon' && player.weapons.length >= 6) return false;
    return true;
  });

  const cards = [];
  const used = new Set();

  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((s, c) => s + c.weight, 0);
    let roll = rng() * totalWeight;
    let picked = available[0];
    for (const c of available) {
      roll -= c.weight;
      if (roll <= 0) { picked = c; break; }
    }
    if (!used.has(picked.id)) {
      used.add(picked.id);
      cards.push(picked);
    }
  }

  return cards;
}
