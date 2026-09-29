import { Game } from './game/game.js';
import { UI } from './ui/ui.js';

const canvas = document.createElement('canvas');
document.getElementById('app').prepend(canvas);

const game = new Game(canvas);
const ui = new UI(game);

window.addEventListener('resize', () => game.resize());

window.__GAME__ = game;
