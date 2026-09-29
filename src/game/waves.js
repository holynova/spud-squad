import { WAVES } from './config.js';
import { poolForWave, BOSS_ORDER, BOSSES } from './enemyDefs.js';

export function wavePlan(wave, rng) {
  const pool = poolForWave(wave);
  const isBoss = wave % WAVES.bossEvery === 0;
  const duration = isBoss ? WAVES.duration * 1.5 : WAVES.duration;

  const roster = [];
  const baseCount = 8 + wave * 3;

  for (let i = 0; i < baseCount; i++) {
    const def = pool[Math.floor(rng() * pool.length)];
    roster.push(def.id);
  }

  if (isBoss) {
    const bossIdx = Math.floor(wave / WAVES.bossEvery) - 1;
    const bossId = BOSS_ORDER[Math.min(bossIdx, BOSS_ORDER.length - 1)];
    roster.push(bossId);
  }

  if (wave >= 9 && rng() < 0.3) {
    roster.push('elite');
  }

  return { roster, duration, isBoss };
}
