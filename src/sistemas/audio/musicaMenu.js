// Música del menú: una sola pista (assets/audio/musica/musica_menu.mp3) que suena en TitleScene y sigue en DniScene.
import { actualizarPista, detenerPista, iniciarPista } from './pistas.js';

// Entrada gradual: el volumen sube de 0 al nivel del menú en 4 s (1,2 s si se viene de una partida)
export const iniciarMusicaMenu = (scene, ms = 4000) => iniciarPista(scene, 'musica_menu', 1, ms);
export const detenerMusicaMenu = (scene, ms = 700) => detenerPista(scene, 'musica_menu', ms);
export const actualizarMusicaMenu = (scene) => actualizarPista(scene, 'musica_menu');
