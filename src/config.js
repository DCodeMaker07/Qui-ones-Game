// Configuración central del juego. Cambia aquí tamaños, escalas, textos y rutas de assets.

export const GAME = {
  width: 1280, // 16:9: el juego llena el ancho de la ventana
  height: 720,
  scrollSpeed: 120, // px/s a los que se mueve el terreno
};

// Los sprites vienen en tamaño nativo de Pyxel Edit (96, 132, 172 px...).
// Estas escalas definen cuánto se ven en pantalla.
export const ESCALA = {
  nido: 0.6,
  deposito: 1.3,
  avionEnemigo: 0.55,
  soldado: 0.65,
  barrera: 0.65, // la barrera de los aliados (132x72)
  caido: 0.65, // el soldado caído (el dibujo es de 132x132). Igual que el soldado vivo para que los píxeles midan lo mismo
  explosion: 0.8,
  botiquinAire: 0.5,
  botiquinSuelo: 0.35,
};

// Punto de giro de la metralleta dentro de nido_arma.png (0-1): eje del cañón y centro del arma.
export const ARMA_ORIGEN = { x: 0.49, y: 0.57 };

// Tipografías iguales a las del juego de Grau: monospace para diálogos/HUD, Georgia para títulos
// y Nunito (en index.html) para los formularios HTML.
// Voces en las escenas con personajes (CutsceneScene).
export const VOCES = {
  // true: el jugador LEE EN VOZ ALTA las líneas de Quiñones (micrófono) y el juego las repite con la voz H/M del DNI.
  // false: las líneas de Quiñones se tratan como las de los demás (audio grabado o voz de respaldo).
  jugadorLeeAQuinones: true,
  respaldoTTS: true, // si falta el audio grabado de una línea, la lee la voz del navegador
  autoAvance: true, // la escena avanza sola cuando termina la voz
  pausaMs: 700, // pausa antes de avanzar a la siguiente línea
  toleranciaLetras: 1, // letras de diferencia que se perdonan en palabras largas (errores del reconocedor)
  permitirSaltar: false, // false: hay que decir la frase completa; ESPACIO solo salta si no hay micrófono
};

// Multijugador: servidor de salas por WebSocket (ver server/ y README).
// En producción define VITE_WS_URL al compilar (p. ej. wss://mi-servicio.onrender.com). En local usa el servidor de tu computador.
export const RED = {
  // Con ?. y typeof también se puede importar este archivo desde Node (scripts/guion-voces.mjs), donde no hay import.meta.env ni location
  urlPorDefecto: import.meta.env?.VITE_WS_URL || (typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) ? 'ws://localhost:8080' : ''),
  versionMinima: 4, // el servidor debe hablar al menos este protocolo (si no, está desactualizado: reiniciarlo)
  envioPorSegundo: 10, // fotos del campo de batalla que el piloto envía a Layla
};

export const FUENTE = 'monospace';
export const FUENTE_TITULO = 'Georgia, serif';
// Los tamaños del código se escribieron para una fuente más ancha; px() los ajusta a monospace.
export const px = (n) => `${Math.round(n * 1.25)}px`;

// Pantalla de inicio: título e integrantes (requisito del curso).
export const INFO = {
  titulo: '1941:\nQUEBRADA SECA',
  subtitulo: 'Homenaje a José Abelardo Quiñones Gonzales',
  curso: 'Diseño y Desarrollo de Juegos Interactivos II',
  integrantes: ['David Saavedra'],
  profesor: 'David William Cota S.',
  creditos: ['Pixel art: Pyxel Edit', 'Motor: Phaser 3  ·  Vite'], // líneas extra del panel de Créditos
};

// Línea de tiempo final (estilo Marvel): ver LineaTiempoScene. Cronológico y en zigzag (arriba, abajo, arriba, abajo).
// Las fechas son las de los hechos históricos que cubre cada juego; cámbialas por las de lanzamiento si prefieres.
export const LINEA_TIEMPO = {
  fase: 'FASE UNO',
  marca: 'DCODEMAKER07',
  juegos: [
    { tipo: 'grau', titulo: ['COMBATE NAVAL', 'DE ANGAMOS'], fecha: '8 DE OCTUBRE DE 1879', logo: 'logo_grau' },
    { tipo: 'quinones', titulo: ['1941', 'QUEBRADA SECA'], subtitulo: 'José Abelardo Quiñones', fecha: '23 DE JULIO DE 1941', etiqueta: 'ACABAS DE JUGAR', logo: 'logo_quinones' },
    { tipo: 'proximamente', fecha: 'POR ANUNCIAR' },
    { tipo: 'misterio', fecha: '¿?' },
  ],
};

// Pivote (en píxeles del sprite de 72x72) de cada animación del soldado aliado: el centro de la caja del cuerpo en su
// primer frame. Cada hoja dibuja al soldado en un lugar distinto de la celda (p. ej. al disparar hacia arriba está
// unos 6 px más abajo que al caminar); sin esto el sprite "salta" al cambiar de animación.
const ORIGEN_ALIADO = {
  aliado_arriba: [36.5, 34.5],
  aliado_dispara_arriba: [36.5, 41],
  aliado_abajo: [32.5, 33.5],
  aliado_dispara_abajo: [36.5, 28],
  aliado_derecha: [35, 36.5],
};
export function alinearAliado(sprite, anim) {
  const o = ORIGEN_ALIADO[anim];
  if (o) sprite.setOrigin(o[0] / 72, o[1] / 72);
}

// El piloto del HUD es siempre Quiñones. Layla es la voz de la torre (radio).
export function retratoPiloto() {
  return 'retrato_quinones';
}

// Manifiesto de assets. Si un archivo no existe, PreloadScene genera un placeholder
// del mismo tamaño para que el juego se pueda probar mientras terminas el pixel art.
export const MANIFEST = {
  images: [
    { key: 'pantalla_carga', url: 'assets/ui/pantalla_carga.png', w: 960, h: 540, color: 0x3a2a4a },
    { key: 'terreno_1', url: 'assets/fondos/terreno_zarumilla.png', w: 256, h: 256, color: 0xc98a3c },
    { key: 'terreno_2', url: 'assets/fondos/terreno_quebrada.png', w: 256, h: 256, color: 0xa86f35 },
    { key: 'terreno_3', url: 'assets/fondos/terreno_base.png', w: 256, h: 256, color: 0x4f7a3a }, // Nivel 3: terreno verdoso
    // Opcionales (si faltan se dibujan por código): río del Nivel 3 (se repite en vertical) y paracaídas del final alternativo
    { key: 'paracaidas', url: 'assets/sprites/aviones/paracaidas.png', w: 120, h: 120, color: 0xe8e0c8, opcional: true },
    { key: 'palacio', url: 'assets/fondos/palacio_fondo.png', w: 1280, h: 693, color: 0x4a3a2a },
    { key: 'bomba', url: 'assets/sprites/armas/bomba.png', w: 29, h: 71, color: 0x222222 }, // la punta del sprite va ARRIBA: al caer se gira 180° y se dibuja a escala (ver sistemas/efectos/bomba.js)
    { key: 'bala', url: 'assets/sprites/armas/bala.png', w: 19, h: 71, color: 0xffe066 }, // la punta va arriba; se gira hacia donde viaja (ver BALA_ESC)
    { key: 'nido_base', url: 'assets/sprites/objetivos/nido_base.png', w: 132, h: 132, color: 0xd2a679 },
    { key: 'nido_arma', url: 'assets/sprites/objetivos/nido_arma.png', w: 40, h: 69, color: 0x445566 },
    // La barrera que coloca Layla en el multijugador (opcional: si falta se dibuja un rectángulo)
    { key: 'barrera_aliada', url: 'assets/sprites/objetivos/barrera_aliada.png', w: 132, h: 72, color: 0x8a6a3a, opcional: true },
    // La base del Nivel 2 (el depósito de suministros), 264x132. Opcional: si falta, se usa el depósito de abajo (deposito.png)
    { key: 'base_suministros', url: 'assets/sprites/objetivos/base_suministros.png', w: 264, h: 132, color: 0x6b4a2b, opcional: true },
    { key: 'deposito', url: 'assets/sprites/objetivos/deposito.png', w: 132, h: 132, color: 0x6b4a2b },
    { key: 'botiquin_suelo', url: 'assets/sprites/objetivos/botiquin_suelo.png', w: 132, h: 132, color: 0x88cc88 },
    { key: 'retrato_quinones', url: 'assets/ui/retratos/retrato_quinones.png', w: 132, h: 132, color: 0x35506b },
    { key: 'retrato_protagonista', url: 'assets/ui/retratos/retrato_protagonista.png', w: 132, h: 132, color: 0x6b3550 },
    { key: 'retrato_presidente', url: 'assets/ui/retratos/retrato_presidente.png', w: 132, h: 132, color: 0x555555 },
    { key: 'retrato_general', url: 'assets/ui/retratos/retrato_general.png', w: 132, h: 132, color: 0x4a5a3a }, // general de tierra (placeholder hasta dibujarlo)
    // Torre de control de Layla (opcional): si existe, reemplaza el decorado dibujado por código. PNG de 1280x720.
    { key: 'torre_fondo', url: 'assets/ui/torre/torre_fondo.png', w: 1280, h: 720, color: 0x000000, opcional: true },
    // Base grande del Nivel 3 (opcional: si falta se usa el depósito agrandado). Ver Level3Scene (spriteBase).
    { key: 'base_enemiga', url: 'assets/sprites/objetivos/base_enemiga.png', w: 264, h: 132, color: 0x6b4a2b, opcional: true }, // base ancha (2:1)
    // Logos opcionales de la línea de tiempo final (si faltan se dibuja el título con tipografía)
    { key: 'logo_grau', url: 'assets/ui/logos/logo_grau.png', w: 280, h: 120, color: 0x000000, opcional: true },
    { key: 'logo_quinones', url: 'assets/ui/logos/logo_quinones.png', w: 280, h: 120, color: 0x000000, opcional: true },
    // El cráter donde cae un soldado enemigo al morir (opcional, igual que el del aliado)
    { key: 'muerte_enemigo', url: 'assets/sprites/soldados/pose-muerte-enemigo.png', w: 132, h: 132, color: 0x6b4a2b, opcional: true },
    // El cráter donde cae un soldado aliado al morir. Opcional: si falta, el soldado solo desaparece con su explosión
    { key: 'muerte_aliado', url: 'assets/sprites/soldados/pose-muerte-aliado.png', w: 132, h: 132, color: 0x6b4a2b, opcional: true },
    { key: 'yo_pixel', url: 'assets/ui/retratos/yo-pixel.png', w: 1086, h: 1448, color: 0x333333 }, // retrato del autor (Créditos)
    // Intro (opcionales): si existen, reemplazan al logo dibujado por código. PNG con fondo transparente.
    { key: 'logo', url: 'assets/intro/logo.png', w: 360, h: 200, color: 0x000000, opcional: true },
    { key: 'logo_variante', url: 'assets/intro/logo_variante.png', w: 360, h: 200, color: 0x000000, opcional: true },
  ],
  // Hojas de sprites: fw/fh = tamaño de cada celda, frames = cantidad de celdas en fila.
  sheets: [
    { key: 'avion_jugador', url: 'assets/sprites/aviones/avion_jugador.png', fw: 96, fh: 96, frames: 5, color: 0xa9b4c2 },
    { key: 'avion_jugador_danado', url: 'assets/sprites/aviones/avion_jugador_danado.png', fw: 96, fh: 96, frames: 5, color: 0xb08080 },
    { key: 'avion_enemigo', url: 'assets/sprites/aviones/avion_enemigo.png', fw: 172, fh: 172, frames: 5, color: 0x4f6b3a },
    { key: 'explosion', url: 'assets/sprites/armas/explosion.png', fw: 132, fh: 132, frames: 6, color: 0xffb300 },
    { key: 'botiquin_aire', url: 'assets/sprites/objetivos/botiquin_aire.png', fw: 132, fh: 132, frames: 4, color: 0xdddddd },
    { key: 'quinones_hablar', url: 'assets/ui/retratos/quinones_hablar.png', fw: 132, fh: 132, frames: 7, color: 0x35506b },
    { key: 'quinones_parpadeo', url: 'assets/ui/retratos/quinones_parpadeo.png', fw: 132, fh: 132, frames: 7, color: 0x35506b },
    { key: 'layla_hablar', url: 'assets/ui/retratos/layla_hablar.png', fw: 132, fh: 132, frames: 6, color: 0x6b3550 },
    { key: 'layla_parpadeo', url: 'assets/ui/retratos/layla_parpadeo.png', fw: 132, fh: 132, frames: 7, color: 0x6b3550 },
    { key: 'presidente_hablar', url: 'assets/ui/retratos/presidente_hablar.png', fw: 132, fh: 132, frames: 4, color: 0x555555 },
    { key: 'general_hablar', url: 'assets/ui/retratos/general_hablar.png', fw: 132, fh: 132, frames: 4, color: 0x4a5a3a },
    // Llama animada (opcional; si falta se dibujan llamas por código): torretas incendiadas, fuego del bombardeo especial y base en llamas.
    // Tira de 6 cuadros de 132x132, con la base de la llama abajo y fondo transparente.
    { key: 'llama', url: 'assets/sprites/armas/llama.png', fw: 132, fh: 132, frames: 6, color: 0xff7a1a, opcional: true },
    // Ventanal animado de la torre de Layla (opcional): tira de cuadros de 1280x150 (ver TorreControl.js). Cambia `frames` si tu tira tiene otro número.
    { key: 'torre_ventana', url: 'assets/ui/torre/torre_ventana.png', fw: 1280, fh: 150, frames: 8, color: 0x000000, opcional: true },
    { key: 'soldado_aliado_arriba', url: 'assets/sprites/soldados/soldado_aliado_arriba.png', fw: 72, fh: 72, frames: 5, color: 0x5a6a85 },
    { key: 'soldado_aliado_abajo', url: 'assets/sprites/soldados/soldado_aliado_abajo.png', fw: 72, fh: 72, frames: 6, color: 0x5a6a85 },
    { key: 'soldado_aliado_derecha', url: 'assets/sprites/soldados/soldado_aliado_derecha.png', fw: 72, fh: 72, frames: 7, color: 0x5a6a85 },
    { key: 'soldado_aliado_dispara_arriba', url: 'assets/sprites/soldados/soldado_aliado_dispara_arriba.png', fw: 72, fh: 72, frames: 4, color: 0x5a6a85 },
    { key: 'soldado_aliado_dispara_abajo', url: 'assets/sprites/soldados/soldado_aliado_dispara_abajo.png', fw: 72, fh: 72, frames: 4, color: 0x5a6a85 },
    { key: 'soldado_enemigo_dispara_arriba', url: 'assets/sprites/soldados/soldado_enemigo_dispara_arriba.png', fw: 72, fh: 72, frames: 4, color: 0x7a8a3a },
    { key: 'soldado_enemigo_dispara_abajo', url: 'assets/sprites/soldados/soldado_enemigo_dispara_abajo.png', fw: 72, fh: 72, frames: 4, color: 0x7a8a3a },
    // El soldado enemigo caminando hacia la derecha (7 cuadros). Hacia la izquierda se usa el mismo, espejado.
    { key: 'soldado_enemigo_derecha', url: 'assets/sprites/soldados/soldado_enemigo_derecha.png', fw: 72, fh: 72, frames: 7, color: 0x7a8a3a },
    // Aún sin dibujar: hoja de caminata del soldado enemigo hacia abajo (usa placeholder y los enemigos no la usan hasta que exista).
    { key: 'soldado_enemigo_abajo', url: 'assets/sprites/soldados/soldado_enemigo_abajo.png', fw: 72, fh: 72, frames: 6, color: 0x7a8a3a },
  ],
  // Audio opcional: si falta el archivo, simplemente no suena.
  audio: [
    { key: 'sfx_bomba', url: 'assets/audio/efectos/sfx_bomba.mp3' },
    { key: 'sfx_disparo', url: 'assets/audio/efectos/sfx_disparo.mp3' },
    { key: 'sfx_explosion', url: 'assets/audio/efectos/sfx_explosion.mp3' },
    { key: 'musica_nivel1', url: 'assets/audio/musica/musica_level_1.mp3' },
    { key: 'musica_nivel2', url: 'assets/audio/musica/musica_level_2.mp3' },
    { key: 'musica_nivel3', url: 'assets/audio/musica/musica_nivel_3.mp3' }, // Nivel 3: la base
    { key: 'sfx_intro', url: 'assets/audio/efectos/sfx_intro.mp3' }, // golpe al aparecer el título
    { key: 'musica_intro', url: 'assets/audio/musica/musica_intro.mp3' }, // ambiente de la intro
    { key: 'musica_menu', url: 'assets/audio/musica/musica_menu.mp3' }, // título y pantalla del DNI (en bucle)
    { key: 'musica_final', url: 'assets/audio/musica/musica_final.mp3' }, // escena del tributo (en bucle)
    { key: 'musica_ending', url: 'assets/audio/musica/musica_ending.mp3' }, // el ending (suena entero: ending y línea de tiempo)
    { key: 'musica_dialogo', url: 'assets/audio/musica/musica_dialogo.mp3' }, // escenas con personajes y menú de pausa (en bucle)
    { key: 'sfx_menu_mover', url: 'assets/audio/efectos/sfx_menu_mover.mp3' }, // cambiar de opción en el menú
    { key: 'sfx_menu_ok', url: 'assets/audio/efectos/sfx_menu_ok.mp3' }, // confirmar
    { key: 'sfx_menu_volver', url: 'assets/audio/efectos/sfx_menu_volver.mp3' }, // cerrar un panel
    { key: 'sfx_moneda', url: 'assets/audio/efectos/sfx_moneda.mp3' }, // clic en la insignia D (sonido de moneda 8 bits)
    { key: 'sfx_texto', url: 'assets/audio/efectos/sfx_texto.mp3' }, // se repite mientras se escribe el diálogo
  ],
  // Animaciones: se crean con todos los frames de cada hoja.
  anims: [
    { key: 'nave_vuelo', sheet: 'avion_jugador', rate: 14, repeat: -1 },
    { key: 'nave_danada', sheet: 'avion_jugador_danado', rate: 14, repeat: -1 },
    { key: 'enemigo_vuelo', sheet: 'avion_enemigo', rate: 14, repeat: -1 },
    { key: 'explotar', sheet: 'explosion', rate: 10, repeat: 0 },
    { key: 'botiquin_caer', sheet: 'botiquin_aire', rate: 6, repeat: -1 },
    { key: 'quinones_hablar', sheet: 'quinones_hablar', rate: 9, repeat: -1 },
    { key: 'quinones_parpadeo', sheet: 'quinones_parpadeo', rate: 12, repeat: 0 },
    { key: 'layla_hablar', sheet: 'layla_hablar', rate: 9, repeat: -1 },
    { key: 'layla_parpadeo', sheet: 'layla_parpadeo', rate: 12, repeat: 0 },
    { key: 'presidente_hablar', sheet: 'presidente_hablar', rate: 8, repeat: -1 },
    { key: 'general_hablar', sheet: 'general_hablar', rate: 8, repeat: -1 },
    // "delante" del soldado aliado = caminar hacia arriba (hacia el frente de combate).
    { key: 'aliado_arriba', sheet: 'soldado_aliado_arriba', rate: 8, repeat: -1 },
    { key: 'aliado_abajo', sheet: 'soldado_aliado_abajo', rate: 8, repeat: -1 },
    { key: 'aliado_derecha', sheet: 'soldado_aliado_derecha', rate: 8, repeat: -1 },
    { key: 'aliado_dispara_arriba', sheet: 'soldado_aliado_dispara_arriba', rate: 10, repeat: -1 },
    { key: 'aliado_dispara_abajo', sheet: 'soldado_aliado_dispara_abajo', rate: 10, repeat: -1 },
    { key: 'enemigo_dispara_arriba', sheet: 'soldado_enemigo_dispara_arriba', rate: 10, repeat: -1 },
    { key: 'enemigo_dispara_abajo', sheet: 'soldado_enemigo_dispara_abajo', rate: 10, repeat: -1 },
    { key: 'enemigo_derecha', sheet: 'soldado_enemigo_derecha', rate: 8, repeat: -1 },
    { key: 'enemigo_caminar', sheet: 'soldado_enemigo_abajo', rate: 8, repeat: -1 }, // hacia abajo
  ],
};
