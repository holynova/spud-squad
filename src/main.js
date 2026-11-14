import { Game } from './game/game.js';
import { UI } from './ui/ui.js';

const canvas = document.createElement('canvas');
document.getElementById('app').prepend(canvas);

const game = new Game(canvas);
const ui = new UI(game);

// The HUD never updated: UI.update() had no caller. Drive it from the
// render loop so HP / XP / wave / weapons stay live every frame.
game.onRender = () => ui.update();

// Apply the viewport-dependent camera setup once at startup too: on a
// portrait phone the page loads at 50 FOV and resize() only fires on
// rotate, so the widened portrait FOV would never apply.
game.resize();
window.addEventListener('resize', () => game.resize());

window.__GAME__ = game;
