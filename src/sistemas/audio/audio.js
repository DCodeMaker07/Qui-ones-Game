import { volumen } from './ajustes.js';

// Reproduce un efecto solo si el archivo existe (así el juego corre sin audio).
export function playSfx(scene, key, config = {}) {
  if (scene.cache.audio.exists(key)) scene.sound.play(key, { ...config, volume: (config.volume ?? 1) * volumen('efectos') });
}
