import { CHARACTERS } from '../game/characters.js';
import { WEAPON_MAP } from '../game/weaponDefs.js';
import { STATE } from '../game/game.js';
import { audio } from '../core/audio.js';

const STAT_LABELS = {
  maxHp: '生命', speed: '移速', damage: '伤害', attackSpeed: '攻速',
  area: '范围', critChance: '暴击率', critDamage: '暴伤', armor: '减伤',
};

export class UI {
  constructor(game) {
    this.game = game;
    this.selectedChar = CHARACTERS[0].id;
    this._confirmAbandon = false;
    this._weaponSig = '';
    this._cache();
    this._bindMenu();
    this._bindHUD();
    this._bindLevelUp();
    this._bindGameOver();
    this._bindPause();
    this._bindTouch();
    this._renderCharSelect();
  }

  _cache() {
    this.menu = document.getElementById('menu');
    this.hud = document.getElementById('hud');
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.xpFill = document.getElementById('xp-fill');
    this.xpText = document.getElementById('xp-text');
    this.statWave = document.getElementById('stat-wave');
    this.statTime = document.getElementById('stat-time');
    this.statKills = document.getElementById('stat-kills');
    this.statGold = document.getElementById('stat-gold');
    this.statLevel = document.getElementById('stat-level');
    this.weaponBar = document.getElementById('weapon-bar');
    this.abilityBtn = document.getElementById('ability-btn');
    this.abilityName = document.getElementById('ability-name');
    this.abilityCd = document.getElementById('ability-cd');
    this.pauseBtn = document.getElementById('pause-btn');
    this.waveBanner = document.getElementById('wave-banner');
    this.levelupScreen = document.getElementById('levelup-screen');
    this.upgradeCards = document.getElementById('upgrade-cards');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.gameoverSummary = document.getElementById('gameover-summary');
    this.charSelect = document.getElementById('char-select');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.pauseScreen = document.getElementById('pause-screen');
    this.pauseSub = document.getElementById('pause-sub');
    this.resumeBtn = document.getElementById('resume-btn');
    this.abandonBtn = document.getElementById('abandon-btn');
    this.abandonWarning = document.getElementById('abandon-warning');
  }

  _fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  _bindMenu() {
    this.startBtn.addEventListener('click', () => {
      audio.init();
      this.menu.style.display = 'none';
      this.hud.style.display = 'block';
      document.body.classList.add('in-game');
      this.game.startRun(this.selectedChar);
    });
  }

  _bindHUD() {
    this.game.onWaveStart = (wave, isBoss) => {
      this.waveBanner.textContent = isBoss ? `BOSS - 第 ${wave} 波` : `第 ${wave} 波`;
      this.waveBanner.style.opacity = '1';
      setTimeout(() => { this.waveBanner.style.opacity = '0'; }, 2000);
    };
    this.pauseBtn.addEventListener('click', () => this.game.togglePause());
    this.abilityBtn.addEventListener('click', () => {
      if (this.game.player) this.game.player.useAbility();
    });
  }

  _bindPause() {
    this.game.onPause = (paused) => {
      this.pauseScreen.style.display = paused ? 'flex' : 'none';
      if (paused) {
        this.pauseSub.textContent = `第 ${this.game.wave} 波 / 击杀 ${this.game.kills} / 等级 ${this.game.player?.level || 1}`;
      } else {
        this._resetAbandon();
      }
    };
    this.game.onQuitToMenu = () => {
      this.pauseScreen.style.display = 'none';
      this.hud.style.display = 'none';
      this.menu.style.display = 'flex';
      document.body.classList.remove('in-game');
      this._resetAbandon();
    };
    this.resumeBtn.addEventListener('click', () => this.game.togglePause());
    this.abandonBtn.addEventListener('click', () => {
      if (!this._confirmAbandon) {
        this._confirmAbandon = true;
        this.abandonBtn.textContent = '确认放弃？';
        this.abandonWarning.style.display = 'block';
        return;
      }
      this.game.quitToMenu();
    });
  }

  _resetAbandon() {
    this._confirmAbandon = false;
    this.abandonBtn.textContent = '放弃本局';
    this.abandonWarning.style.display = 'none';
  }

  _bindLevelUp() {
    this.game.onLevelUpUI = (cards) => {
      this.levelupScreen.style.display = 'flex';
      this.upgradeCards.innerHTML = '';
      cards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = 'upgrade-card';
        el.innerHTML = `<div class="icon">${card.icon}</div><div class="title">${card.name}</div><div class="desc">${card.desc}</div><div class="key-hint">${i + 1}</div>`;
        el.addEventListener('click', () => this._pickCard(i));
        this.upgradeCards.appendChild(el);
      });
    };
    window.addEventListener('keydown', (e) => {
      if (this.game.state !== STATE.LEVELUP) return;
      const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (idx >= 0) this._pickCard(idx);
    });
  }

  _pickCard(i) {
    if (this.game.state !== STATE.LEVELUP) return;
    this.game.chooseUpgrade(i);
    if (this.game.state !== STATE.LEVELUP) {
      this.levelupScreen.style.display = 'none';
    }
  }

  _bindGameOver() {
    this.game.onGameOver = (summary) => {
      document.body.classList.remove('in-game');
      this.gameoverScreen.style.display = 'flex';
      this.gameoverSummary.innerHTML = `
        存活波次: <span>${summary.wave}</span><br>
        总击杀: <span>${summary.kills}</span><br>
        最终等级: <span>${summary.level}</span><br>
        存活时间: <span>${this._fmtTime(summary.time)}</span><br>
        收集金币: <span>${summary.gold}</span>
      `;
    };
    this.game.onVictory = (summary) => {
      document.body.classList.remove('in-game');
      this.gameoverScreen.style.display = 'flex';
      this.gameoverScreen.querySelector('h2').textContent = '胜利!';
      this.gameoverSummary.innerHTML = `
        恭喜通关!<br>
        总击杀: <span>${summary.kills}</span><br>
        最终等级: <span>${summary.level}</span><br>
        存活时间: <span>${this._fmtTime(summary.time)}</span><br>
        收集金币: <span>${summary.gold}</span>
      `;
    };
    this.restartBtn.addEventListener('click', () => {
      audio.init();
      this.gameoverScreen.style.display = 'none';
      this.gameoverScreen.querySelector('h2').textContent = '游戏结束';
      this.menu.style.display = 'flex';
      this.hud.style.display = 'none';
      this.game.state = STATE.MENU;
    });
  }

  _bindTouch() {
    const input = this.game.input;
    const stick = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    if (!stick || !knob) return;
    const R = 44;
    let activePointer = null;
    const move = (e) => {
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      input.touchMove.x = dx / R;
      input.touchMove.y = dy / R;
    };
    stick.addEventListener('pointerdown', (e) => {
      activePointer = e.pointerId;
      stick.setPointerCapture(e.pointerId);
      move(e);
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== activePointer) return;
      move(e);
    });
    const release = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      input.touchMove.x = 0;
      input.touchMove.y = 0;
      knob.style.transform = 'translate(0px, 0px)';
    };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);
    const dashBtn = document.getElementById('btn-dash');
    dashBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.touchDash = true;
    });
    dashBtn.addEventListener('pointerup', () => { input.touchDash = false; });
    dashBtn.addEventListener('pointercancel', () => { input.touchDash = false; });
    dashBtn.addEventListener('pointerleave', () => { input.touchDash = false; });
  }

  _formatStats(c) {
    const parts = [];
    for (const [k, v] of Object.entries(c.stats)) {
      if (!v) continue;
      if (k === 'maxHp') parts.push(`生命 ${v > 0 ? '+' : ''}${v}`);
      else parts.push(`${STAT_LABELS[k]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`);
    }
    return parts.join(' / ');
  }

  _renderCharSelect() {
    this.charSelect.innerHTML = '';
    for (const c of CHARACTERS) {
      const el = document.createElement('div');
      el.className = 'char-card' + (c.id === this.selectedChar ? ' selected' : '');
      el.style.setProperty('--char-color', c.color);
      const weapon = WEAPON_MAP[c.weapon];
      el.innerHTML = `<div class="icon">${c.icon}</div><div class="name">${c.name}</div><div class="desc">${c.desc}</div><div class="stats">${this._formatStats(c)}</div><div class="weapon">初始武器：${weapon ? weapon.name : c.weapon}</div><div class="ability">技能：${c.ability.name}（${c.ability.desc}）</div>`;
      el.addEventListener('click', () => {
        this.selectedChar = c.id;
        this.charSelect.querySelectorAll('.char-card').forEach((card) => card.classList.remove('selected'));
        el.classList.add('selected');
      });
      this.charSelect.appendChild(el);
    }
  }

  update() {
    const p = this.game.player;
    if (!p) return;
    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    const xpPct = Math.min(100, (p.xp / p.xpNeed) * 100);
    this.xpFill.style.width = `${xpPct}%`;
    this.xpText.textContent = `${Math.floor(p.xp)} / ${p.xpNeed}`;
    this.statWave.textContent = this.game.wave;
    this.statKills.textContent = this.game.kills;
    this.statGold.textContent = p.gold;
    this.statLevel.textContent = p.level;
    const g = this.game;
    if (g.phase === 'prep') this.statTime.textContent = `准备 ${Math.max(0, Math.ceil(g.phaseTimer))} 秒`;
    else if (g.phase === 'rest') this.statTime.textContent = `休整 ${Math.max(0, Math.ceil(g.phaseTimer))} 秒`;
    else if (g.phase === 'combat' && g.waveTimer > 0) this.statTime.textContent = `战斗 ${Math.ceil(g.waveTimer)} 秒`;
    else this.statTime.textContent = '清剿残敌';
    const sig = p.weapons.map((w) => `${w.def.id}:${w.level}`).join(',');
    if (sig !== this._weaponSig) {
      this._weaponSig = sig;
      this.weaponBar.innerHTML = p.weapons.map((w) => `<div class="wslot" style="--wcolor:${w.def.color}" title="${w.def.name} Lv.${w.level}">${w.def.name[0]}<span>${w.level}</span></div>`).join('');
    }
    const ab = p.char.ability;
    this.abilityName.textContent = ab.name;
    if (p.abilityCd > 0) {
      this.abilityCd.textContent = `${Math.ceil(p.abilityCd)} 秒`;
      this.abilityBtn.classList.add('cooling');
    } else if (p.abilityT > 0) {
      this.abilityCd.textContent = '生效中';
      this.abilityBtn.classList.remove('cooling');
    } else {
      this.abilityCd.textContent = '就绪';
      this.abilityBtn.classList.remove('cooling');
    }
  }
}
