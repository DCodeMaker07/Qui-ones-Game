// Acá dejo los colores, las fuentes y las medidas que uso en toda la interfaz.
// Si quiero cambiar el look del juego, lo cambio acá y listo.
import { FUENTE, FUENTE_TITULO } from '../config.js';

export { FUENTE, FUENTE_TITULO };

// Es la misma tipografía del menú principal (se carga desde el CSS)
export const FUENTE_UI = '"Nunito", "Segoe UI", Arial, sans-serif';

export const COLOR = {
  naranja: 0xffb000,
  dorado: 0xffd35a,
  blanco: 0xffffff,
  negro: 0x000000,
  fondo: 0x0b0b0b, // fondo de los paneles
  verde: 0x4cd964,
  rojo: 0xff4a3d,
  vidaVacia: 0x1d2a1c,
  gris: 0x8a8a8a,
};

// Lo mismo pero como texto, porque Phaser pide strings en los estilos de texto
export const TXT = {
  naranja: '#ffb000',
  dorado: '#ffd35a',
  blanco: '#ffffff',
  gris: '#c4c4c4',
  grisOscuro: '#8a8a8a',
  rojo: '#ff5a4a',
  verde: '#7cfc9a',
};

// Capas: el HUD siempre va sobre el juego y los modales sobre el HUD
export const CAPA = {
  hud: 20,
  radio: 30,
  modal: 100,
};

// Margen de la pantalla para el HUD
export const MARGEN = 24;

// Estilo de texto "de HUD": blanco con borde negro grueso, como en GTA IV
export function estiloHud(tam, extra = {}) {
  return {
    fontFamily: FUENTE_UI,
    fontStyle: 'bold italic',
    fontSize: `${tam}px`,
    color: TXT.blanco,
    stroke: '#000000',
    strokeThickness: Math.max(3, Math.round(tam / 6)),
    ...extra,
  };
}
