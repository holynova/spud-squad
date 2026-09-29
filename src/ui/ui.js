import { CHARACTERS } from '../game/characters.js';
import { STATE } from '../game/game.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.selectedChar = CHARACTERS[0].id;
    this._cache();
    this._bindMenu();
    this._bindHUD();
    this._bindLevelUp();
    this._bindGameOver();
    this._renderCharSelect();
  }

  _cache() {
    this.menu = document.getElementById('menu');
    this.hud = document.getElementById('hud');
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.statWave = document.getElementById('stat-wave');
    this.statKills = document.getElementById('stat-kills');
    this.statGold = document.getElementById('stat-gold');
    this.statLevel = document.getElementById('stat-level');
    this.waveBanner = document.getElementById('wave-banner');
    this.levelupScreen = document.getElementById('levelup-screen');
    this.upgradeCards = document.getElementById('upgrade-cards');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.gameoverSummary = document.getElementById('gameover-summary');
    this.charSelect = document.getElementById('char-select');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');
  }

  _bindMenu() {
    this.startBtn.addEventListener('click', () => {
      this.menu.style.display = 'none';
      this.hud.style.display = 'block';
      this.game.startRun(this.selectedChar);
    });
  }

  _bindHUD() {
    this.game.onWaveStart = (wave, isBoss) => {
      this.waveBanner.textContent = isBoss ? `BOSS - 第 ${wave} 波` : `第 ${wave} 波`;
      this.waveBanner.style.opacity = '1';
      setTimeout(() => { this.waveBanner.style.opacity = '0'; }, 2000);
    };
  }

  _bindLevelUp() {
    this.game.onLevelUpUI = (cards) => {
      this.levelupScreen.style.display = 'flex';
      this.upgradeCards.innerHTML = '';
      cards.forEach((card, i) => {
        const el = document.createElement('div');
        el.className = 'upgrade-card';
        el.innerHTML = `<div class="icon">${card.icon}</div><div class="title">${card.name}</div><div class="desc">${card.desc}</div>`;
        el.addEventListener('click', () => {
          this.game.chooseUpgrade(i);
          if (this.game.state !== STATE.LEVELUP) {
            this.levelupScreen.style.display = 'none';
          }
        });
        this.upgradeCards.appendChild(el);
      });
    };
  }

  _bindGameOver() {
    this.game.onGameOver = (summary) => {
      this.gameoverScreen.style.display = 'flex';
      this.gameoverSummary.innerHTML = `
        存活波次: <span>${summary.wave}</span><br>
        总击杀: <span>${summary.kills}</span><br>
        最终等级: <span>${summary.level}</span><br>
        存活时间: <span>${Math.round(summary.time)}s</span><br>
        收集金币: <span>${summary.gold}</span>
      `;
    };
    this.game.onVictory = (summary) => {
      this.gameoverScreen.style.display = 'flex';
      this.gameoverScreen.querySelector('h2').textContent = '胜利!';
      this.gameoverSummary.innerHTML = `
        恭喜通关!<br>
        总击杀: <span>${summary.kills}</span><br>
        最终等级: <span>${summary.level}</span><br>
        存活时间: <span>${Math.round(summary.time)}s</span>
      `;
    };
    this.restartBtn.addEventListener('click', () => {
      this.gameoverScreen.style.display = 'none';
      this.gameoverScreen.querySelector('h2').textContent = '游戏结束';
      this.menu.style.display = 'flex';
      this.hud.style.display = 'none';
      this.game.state = STATE.MENU;
    });
  }

  _renderCharSelect() {
    this.charSelect.innerHTML = '';
    for (const c of CHARACTERS) {
      const el = document.createElement('div');
      el.className = 'char-card' + (c.id === this.selectedChar ? ' selected' : '');
      el.style.setProperty('--char-color', c.color);
      el.innerHTML = `<div class="icon">${c.icon}</div><div class="name">${c.name}</div><div class="desc">${c.desc}</div>`;
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
    const hpPct = (p.hp / p.maxHp) * 100;
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    this.statWave.textContent = this.game.wave;
    this.statKills.textContent = this.game.kills;
    this.statGold.textContent = p.gold;
    this.statLevel.textContent = p.level;
  }
}
