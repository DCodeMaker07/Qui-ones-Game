import './style.css';
import Phaser from 'phaser';
import { GAME } from './config.js';
import { VoiceSystem } from './sistemas/audio/VoiceSystem.js';
import { Red } from './red/Red.js';
import { ambiente } from './sistemas/efectos/Ambiente.js';
import { crearMasterMenu } from './sistemas/herramientas/MasterMenu.js';
import { iniciarMando } from './sistemas/entrada/Mando.js';
import { iniciarEspejoFinal } from './red/espejoFinal.js';
import BootScene from './escenas/arranque/BootScene.js';
import PreloadScene from './escenas/arranque/PreloadScene.js';
import IntroScene from './escenas/arranque/IntroScene.js';
import TitleScene from './escenas/menu/TitleScene.js';
import DniScene from './escenas/menu/DniScene.js';
import ModoScene from './escenas/menu/ModoScene.js';
import EstrategaScene from './escenas/estratega/EstrategaScene.js';
import CutsceneScene from './escenas/historia/CutsceneScene.js';
import DespegueScene from './escenas/historia/DespegueScene.js';
import Level1Scene from './escenas/niveles/Level1Scene.js';
import Level2Scene from './escenas/niveles/Level2Scene.js';
import Level3Scene from './escenas/niveles/Level3Scene.js';
import FinalAlternativoScene from './escenas/historia/FinalAlternativoScene.js';
import LineaTiempoScene from './escenas/historia/LineaTiempoScene.js';
import EndScene from './escenas/historia/EndScene.js';
import EndingScene from './escenas/historia/EndingScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME.width,
  height: GAME.height,
  backgroundColor: '#0b0f14',
  pixelArt: true,
  physics: {
    default: 'arcade',
    // Agrega ?debug a la URL para ver las hitboxes.
    arcade: { debug: new URLSearchParams(window.location.search).has('debug') },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, PreloadScene, IntroScene, TitleScene, DniScene, ModoScene, EstrategaScene, CutsceneScene, DespegueScene, Level1Scene, Level2Scene, Level3Scene, FinalAlternativoScene, LineaTiempoScene, EndingScene, EndScene],
});

// Sistema de voz compartido por todas las escenas: this.game.voice
game.voice = new VoiceSystem();
// Cliente del modo multijugador compartido por todas las escenas: this.game.red
game.red = new Red();
iniciarEspejoFinal(game); // Layla ve las escenas finales a la vez que el piloto

// El mando: aprieta las mismas teclas que ya usa el juego (ver sistemas/entrada/Mando.js)
iniciarMando(game);

// Solo en desarrollo: acceso al juego desde la consola del navegador (window.__juego).
if (import.meta.env.DEV) window.__juego = game;

// Fondo animado: cada escena fija su paleta al crearse (Dialog/Cutscene/End lo hacen ellas mismas).
const AMBIENTE_POR_ESCENA = { IntroScene: 'intro', TitleScene: 'menu', DniScene: 'menu', DespegueScene: 'nivel1', Level1Scene: 'nivel1', Level2Scene: 'nivel2' };
game.events.once('ready', () => {
  game.scene.getScenes(false).forEach((s) => {
    const nombre = AMBIENTE_POR_ESCENA[s.scene.key];
    if (nombre) s.events.on('create', () => ambiente.escena(nombre));
    // Multijugador: Layla ve en qué escena está el piloto
    s.events.on('create', () => game.red.activa && game.red.rol === 'piloto' && game.red.enviar({ t: 'escena', nombre: s.scene.key, id: s.scene.settings.data?.id, victoria: s.scene.settings.data?.victoria }));
  });
  crearMasterMenu(game); // F2 o botón "MENÚ"
});
