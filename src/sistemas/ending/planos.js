import Phaser from 'phaser';
import { ARMA_ORIGEN, INFO } from '../../config.js';
import { PISTA } from '../efectos/aerodromo.js';
import { BOMBA } from '../efectos/bomba.js';
import { paralelogramo } from '../../ui/dibujo.js';
import { COLOR, FUENTE_TITULO, TXT, estiloHud } from '../../ui/tema.js';
import { deslizar, golpe } from './efectos.js';

// Los planos del ending. Un plano es un contenedor con todo lo que se ve en un tramo de la música.
// Cada función recibe la escena y los datos del guion, arma el plano y devuelve { cont, capas, temporizadores }:
// EndingScene lo muestra, lo desvanece cuando toca y llama a limpiar().
//
// Para que nada tape a lo que debería quedar encima, cada plano tiene capas fijas (de abajo hacia arriba) y yo siempre
// agrego cada cosa a la capa que le toca:
//   fondo      terreno y tintes
//   suelo      nidos, base, soldados
//   sombras    sombras de los aviones
//   efectos    explosiones y fuego en el suelo
//   balas      balas trazadoras y estelas
//   bombas     bombas cayendo (siempre debajo del avión que las soltó)
//   aire       aviones y lo que pasa en el aire
//   texto      títulos y créditos
const CAPAS = ['fondo', 'suelo', 'sombras', 'efectos', 'balas', 'bombas', 'aire', 'texto'];

// Tamaños de los sprites en el ending (los del juego van a 0,55 a 0,65; acá son un poco más grandes, pero no tanto)
const ESCALA = { avion: 1.9, enemigo: 0.75, nido: 0.9, soldado: 1.7, bomba: 1.4, explosion: 1 };
const SOMBRA = { x: 15, y: 23 }; // desplazamiento de la sombra por cada unidad de escala del avión

function nuevoPlano(escena) {
  const cont = escena.add.container(0, 0).setDepth(10).setAlpha(0);
  const capas = Object.fromEntries(CAPAS.map((nombre) => [nombre, escena.add.container(0, 0)]));
  cont.add(Object.values(capas));
  return { cont, capas, temporizadores: [] };
}

export function limpiar(escena, plano) {
  plano.temporizadores.forEach((t) => t.remove());
  const matarTweens = (contenedor) =>
    contenedor.list?.forEach((hijo) => {
      escena.tweens.killTweensOf(hijo);
      matarTweens(hijo);
    });
  matarTweens(plano.cont);
  plano.cont.destroy(true);
}

// Lo mismo que delayedCall pero guardado en el plano, para que se cancele si el plano termina antes
function programar(escena, plano, segundos, accion) {
  const temporizador = escena.time.delayedCall(segundos * 1000, accion);
  plano.temporizadores.push(temporizador);
  return temporizador;
}

function repetir(escena, plano, ms, accion) {
  const temporizador = escena.time.addEvent({ delay: ms, loop: true, callback: accion });
  plano.temporizadores.push(temporizador);
  return temporizador;
}

// El terreno del juego, agrandado al doble y girado un poco, que se desliza todo el tramo. Encima va un tinte de atardecer
function fondoTerreno(escena, plano, { terreno, dur, velocidad = 70, angulo = 0, tinte = 0xffa85a, oscuro = 0 }) {
  const { width, height } = escena.scale;
  const lado = Math.hypot(width, height) * 1.15; // así, aunque lo gire, no se ven los bordes
  const ts = escena.add.tileSprite(width / 2, height / 2, lado, lado, terreno).setAngle(angulo).setTileScale(2);
  escena.tweens.add({ targets: ts, tilePositionY: -velocidad * dur, duration: dur * 1000, ease: 'Linear' });
  const tono = escena.add.rectangle(width / 2, height / 2, width, height, tinte, 0.32).setBlendMode(Phaser.BlendModes.MULTIPLY);
  plano.capas.fondo.add([ts, tono]);
  if (oscuro) plano.capas.fondo.add(escena.add.rectangle(width / 2, height / 2, width, height, 0x000000, oscuro));
}

// ---------- aviones ----------

function crearAvion(escena, plano, x, y, escala, rotacion = 0, tinte) {
  const sombra = escena.add.sprite(x + SOMBRA.x * escala, y + SOMBRA.y * escala, 'avion_jugador').setScale(escala * 1.05).setRotation(rotacion).setTint(0x000000).setAlpha(0.28);
  const avion = escena.add.sprite(x, y, 'avion_jugador').setScale(escala).setRotation(rotacion);
  if (tinte !== undefined) avion.setTint(tinte);
  sombra.play('nave_vuelo');
  avion.play('nave_vuelo');
  plano.capas.sombras.add(sombra);
  plano.capas.aire.add(avion);
  return { avion, sombra, escala };
}

// El avión vuela en línea recta por la ruta [x0, y0, x1, y1] y va dejando una estela blanca detrás
function volar(escena, plano, { ruta, desfase = [0, 0], escala = ESCALA.avion, demora = 0, dur, ease = 'Sine.easeInOut', tinte }) {
  const [x0, y0, x1, y1] = ruta;
  const [dx, dy] = desfase;
  const rotacion = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2; // con rotación 0 el sprite mira hacia arriba
  const { avion, sombra } = crearAvion(escena, plano, x0 + dx, y0 + dy, escala, rotacion, tinte);
  const config = { duration: dur * 1000, delay: demora * 1000, ease };
  escena.tweens.add({ targets: avion, x: x1 + dx, y: y1 + dy, ...config });
  escena.tweens.add({ targets: sombra, x: x1 + dx + SOMBRA.x * escala, y: y1 + dy + SOMBRA.y * escala, ...config });

  const ux = Math.cos(rotacion - Math.PI / 2);
  const uy = Math.sin(rotacion - Math.PI / 2);
  repetir(escena, plano, 55, () => {
    const { width, height } = escena.scale;
    if (avion.x < 0 || avion.x > width || avion.y < 0 || avion.y > height) return;
    const estela = escena.add.circle(avion.x - ux * 15 * escala, avion.y - uy * 15 * escala, 2.3 * escala, 0xffffff, 0.55);
    plano.capas.balas.add(estela);
    escena.tweens.add({ targets: estela, scale: 2.6, alpha: 0, duration: 900, onComplete: () => estela.destroy() });
  });
  return avion;
}

// Uno o varios aviones cruzando la pantalla (formación = lista de desfases respecto al que lidera)
export function vuelo(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno, dur: d.dur, angulo: d.angulo ?? 0 });
  d.formacion.forEach((desfase, i) => volar(escena, plano, { ruta: d.ruta, desfase, escala: d.escala, demora: i * 0.12, dur: d.dur }));
  return plano;
}

// ---------- momentos de los niveles en movimiento ----------
// Escenas de acción armadas con los mismos sprites del juego: las bombas, las explosiones, las torretas, los aviones
// enemigos y los soldados. No es una partida grabada, es una coreografía que imita lo que pasa en los niveles.

// capa: la explosión de un avión en el aire va en 'aire' para quedar sobre él; la de una torreta, en 'efectos'
function explotar(escena, plano, x, y, escala = ESCALA.explosion, capa = 'efectos') {
  const explosion = escena.add.sprite(x, y, 'explosion').setScale(escala);
  plano.capas[capa].add(explosion);
  explosion.play('explotar');
  explosion.once('animationcomplete', () => explosion.destroy());
}

// Una llama dentro del contenedor que le paso (así se mueve con lo que está quemando). Si no tengo la hoja, un círculo naranja
function fuego(escena, contenedor, x, y, escala = 0.6) {
  if (!escena.textures.exists('llama')) {
    const brasa = escena.add.circle(x, y - 10, 16 * escala, 0xff7a1a, 0.85);
    contenedor.add(brasa);
    return brasa;
  }
  if (!escena.anims.exists('llama')) escena.anims.create({ key: 'llama', frames: escena.anims.generateFrameNumbers('llama'), frameRate: 12, repeat: -1 });
  const llama = escena.add.sprite(x, y, 'llama').setOrigin(0.5, 1).setScale(escala);
  llama.play({ key: 'llama', startFrame: Phaser.Math.Between(0, 5) });
  contenedor.add(llama);
  return llama;
}

// Una bala trazadora que va de un punto a otro (amarilla las mías, roja las enemigas)
function trazadora(escena, plano, de, a, { color = 0xffe066, dur = 600, escala = 0.45 } = {}) {
  const angulo = Math.atan2(a.y - de.y, a.x - de.x);
  const bala = escena.add.image(de.x, de.y, 'bala').setScale(escala).setTint(color).setRotation(angulo + Math.PI / 2);
  plano.capas.balas.add(bala);
  escena.tweens.add({ targets: bala, x: a.x, y: a.y, duration: dur, onComplete: () => bala.destroy() });
}

// La bomba del juego (grande e inclinada al salir, de punta y chica al caer) y, al llegar, lo que yo le diga
function bombaCaer(escena, plano, de, a, alAterrizar) {
  const bomba = escena.add.image(de.x, de.y, 'bomba').setScale(BOMBA.escIni * ESCALA.bomba).setAngle(BOMBA.anguloIni);
  plano.capas.bombas.add(bomba);
  escena.tweens.add({
    targets: bomba, x: a.x, y: a.y, scale: BOMBA.escFin * ESCALA.bomba, duration: BOMBA.duracion, ease: 'Quad.easeIn',
    onComplete: () => {
      bomba.destroy();
      alAterrizar();
    },
  });
  escena.tweens.add({ targets: bomba, angle: BOMBA.anguloFin, duration: BOMBA.cabeceo, ease: 'Sine.easeInOut' });
}

// Un nido con su ametralladora. Si le paso velocidad, baja con el terreno
function torreta(escena, plano, x, y, { escala = ESCALA.nido, velocidad = 0, dur = 0 } = {}) {
  const base = escena.add.image(0, 0, 'nido_base').setScale(escala);
  const arma = escena.add.image(0, 0, 'nido_arma').setScale(escala).setOrigin(ARMA_ORIGEN.x, ARMA_ORIGEN.y);
  const cont = escena.add.container(x, y, [base, arma]);
  plano.capas.suelo.add(cont);
  if (velocidad) escena.tweens.add({ targets: cont, y: y + velocidad * dur, duration: dur * 1000, ease: 'Linear' });
  return { cont, base, arma, escala, viva: true };
}

// La torreta destruida queda negra, sin arma y en llamas
function derribar(escena, t) {
  t.viva = false;
  t.arma.setVisible(false);
  t.base.setTint(0x3a3a3a);
  fuego(escena, t.cont, 0, 16 * t.escala, t.escala * 0.8);
}

// El avión se mueve de lado con su sombra
function desplazar(escena, { avion, sombra, escala }, x, dur = 900) {
  escena.tweens.add({ targets: avion, x, duration: dur, ease: 'Sine.easeInOut' });
  escena.tweens.add({ targets: sombra, x: x + SOMBRA.x * escala, duration: dur, ease: 'Sine.easeInOut' });
}

// Nivel 1: el avión bombardea nidos que bajan con el terreno. Cada nido que cae se incendia, y todos le disparan
export function bombardeo(escena, d) {
  const plano = nuevoPlano(escena);
  const velocidad = 120;
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_1', dur: d.dur, velocidad, oscuro: 0.08 });
  const jugador = crearAvion(escena, plano, 640, 250, ESCALA.avion);
  const { avion } = jugador;

  // [segundo en que suelto la bomba, columna del nido]. El nido empieza más arriba mientras más tarde le toque
  [[1.2, 430], [2.5, 800], [3.8, 560], [5.1, 900], [6.4, 700]].forEach(([t, x]) => {
    const nido = torreta(escena, plano, x, 416 - velocidad * t, { velocidad, dur: d.dur });
    programar(escena, plano, Math.max(0, t - 0.9), () => desplazar(escena, jugador, x));
    programar(escena, plano, t, () => {
      const destino = { x, y: nido.cont.y + velocidad * 0.7 }; // la bomba tarda 0,7 s en caer y el nido sigue bajando
      bombaCaer(escena, plano, { x: avion.x, y: avion.y + 30 }, destino, () => {
        explotar(escena, plano, nido.cont.x, nido.cont.y);
        derribar(escena, nido);
        escena.cameras.main.shake(180, 0.004);
      });
    });
    repetir(escena, plano, 700, () => nido.viva && nido.cont.y > 90 && nido.cont.y < 620 && trazadora(escena, plano, { x: nido.cont.x, y: nido.cont.y - 25 }, avion, { color: 0xff5555, dur: 700 }));
  });
  // Mi ametralladora sigue disparando hacia arriba
  repetir(escena, plano, 140, () => trazadora(escena, plano, { x: avion.x, y: avion.y - 55 }, { x: avion.x, y: -40 }, { dur: 650, escala: 0.55 }));
  return plano;
}

// Nivel 2: aviones enemigos bajan hacia mí y los derribo con la ráfaga (tandas de tres balas en abanico)
export function combate(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_2', dur: d.dur, velocidad: 220, oscuro: 0.08 });
  const { avion, sombra } = crearAvion(escena, plano, 640, 540, ESCALA.avion);
  escena.tweens.add({ targets: avion, x: { from: 540, to: 760 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: () => (sombra.x = avion.x + SOMBRA.x * ESCALA.avion) });

  [[420, 0.3], [860, 1.5], [620, 2.7], [960, 3.9]].forEach(([x, t]) => {
    const enemigo = escena.add.sprite(x, -130, 'avion_enemigo').setScale(ESCALA.enemigo).setAngle(180).setAlpha(0); // la nariz mira hacia abajo
    enemigo.play('enemigo_vuelo');
    plano.capas.aire.add(enemigo);
    programar(escena, plano, t, () => {
      enemigo.setAlpha(1);
      escena.tweens.add({ targets: enemigo, y: 240, duration: 1500, ease: 'Sine.easeOut' });
    });
    programar(escena, plano, t + 0.9, () => trazadora(escena, plano, { x: enemigo.x, y: enemigo.y + 45 }, avion, { color: 0xff5555, dur: 650 }));
    programar(escena, plano, t + 1.5, () => {
      // La ráfaga: cinco tandas, cada una con tres balas que se abren
      for (let i = 0; i < 5; i++) {
        programar(escena, plano, i * 0.07, () => [-45, 0, 45].forEach((abre) => trazadora(escena, plano, { x: avion.x, y: avion.y - 55 }, { x: enemigo.x + abre, y: enemigo.y }, { dur: 420, escala: 0.55 })));
      }
    });
    programar(escena, plano, t + 2.2, () => {
      explotar(escena, plano, enemigo.x, enemigo.y, 1.6, 'aire');
      enemigo.destroy();
      escena.cameras.main.shake(160, 0.004);
    });
  });
  return plano;
}

// La infantería: mis soldados abajo y los enemigos arriba se disparan, con granadas que estallan en la línea enemiga
export function infanteria(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_3', dur: d.dur, velocidad: 20, oscuro: 0.12 });
  const fila = (clave, anim, y) =>
    [290, 430, 570, 710, 850, 990].map((x) => {
      const soldado = escena.add.sprite(x, y + Phaser.Math.Between(-14, 14), clave).setScale(ESCALA.soldado);
      soldado.play(anim);
      plano.capas.suelo.add(soldado);
      return soldado;
    });
  const aliados = fila('soldado_aliado_dispara_arriba', 'aliado_dispara_arriba', 500);
  const enemigos = fila('soldado_enemigo_dispara_abajo', 'enemigo_dispara_abajo', 220);
  const otro = (lista) => Phaser.Utils.Array.GetRandom(lista);
  repetir(escena, plano, 150, () => trazadora(escena, plano, otro(aliados), otro(enemigos), { dur: 450 }));
  repetir(escena, plano, 190, () => trazadora(escena, plano, otro(enemigos), otro(aliados), { color: 0xff5555, dur: 500 }));
  [[0.9, 520, 230, 1.3], [2.1, 860, 210, 1.5], [3, 380, 240, 1.2]].forEach(([t, x, y, k]) => programar(escena, plano, t, () => explotar(escena, plano, x, y, k)));
  return plano;
}

// Nivel 3: la base con sus defensas y mi bombardeo de fuego, que dibuja una línea de llamas con el vuelo
export function asedio(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_3', dur: d.dur, velocidad: 20, oscuro: 0.1 });
  plano.capas.suelo.add(escena.add.image(640, 250, 'base_enemiga').setScale(1.5));
  [[-270, -30], [270, -30], [-270, 100], [270, 100], [-120, 150], [120, 150]].forEach(([dx, dy]) => torreta(escena, plano, 640 + dx, 250 + dy, { escala: 0.75 }));

  const avion = volar(escena, plano, { ruta: [640, 780, 640, 380], dur: d.dur - 0.7, ease: 'Quad.easeOut' });
  // El fuego queda detrás de la cola y las explosiones adelante, las dos en la capa de efectos: siempre debajo del avión
  repetir(escena, plano, 90, () => avion.y < 700 && fuego(escena, plano.capas.efectos, avion.x + Phaser.Math.Between(-16, 16), avion.y + 90, 0.55));
  repetir(escena, plano, 380, () => avion.y < 640 && explotar(escena, plano, avion.x + Phaser.Math.Between(-70, 70), avion.y - 110, 1));
  escena.cameras.main.shake(d.dur * 1000, 0.003);
  return plano;
}

// ---------- créditos ----------

// Pares "ROL / nombre" apilados a la izquierda sobre un panel oscuro inclinado. A la derecha puede ir un retrato con marco dorado
export function creditos(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_2', dur: d.dur, velocidad: 50, angulo: 12, oscuro: 0.3 });

  const panel = escena.add.graphics();
  paralelogramo(panel, -160, 0, 900, 720, 110, 0x000000, 0.64);
  plano.capas.suelo.add(panel);
  deslizar(escena, panel, { dx: -500, dur: 500 });

  // Primero creo los textos para medir cuánto ocupan y después los centro verticalmente
  const bloques = d.lineas.map(([rol, nombre]) => ({
    rol: escena.add.text(110, 0, rol.toUpperCase(), estiloHud(22, { color: TXT.dorado, fontStyle: 'bold', letterSpacing: 5 })),
    nombre: escena.add.text(110, 0, nombre, estiloHud(nombre.length > 22 ? 36 : 52, { wordWrap: { width: 640 } })),
  }));
  const separacion = 38;
  const total = bloques.reduce((suma, b) => suma + b.rol.height + b.nombre.height + separacion, -separacion);
  let y = 360 - total / 2;
  bloques.forEach((b, i) => {
    b.rol.setY(y);
    b.nombre.setY(y + b.rol.height + 4);
    y += b.rol.height + b.nombre.height + separacion;
    plano.capas.texto.add([b.rol, b.nombre]);
    deslizar(escena, b.rol, { dx: -300, delay: 250 + i * 260 });
    deslizar(escena, b.nombre, { dx: -300, delay: 340 + i * 260 });
  });

  if (d.retrato) {
    const sombra = escena.add.rectangle(10, 10, 350, 460, 0x000000, 0.45);
    const borde = escena.add.rectangle(0, 0, 350, 460, COLOR.dorado);
    const foto = escena.add.image(0, 0, d.retrato).setDisplaySize(330, 440);
    const tarjeta = escena.add.container(1000, 360, [sombra, borde, foto]).setAngle(3);
    plano.capas.texto.add(tarjeta);
    deslizar(escena, tarjeta, { dx: 700, dur: 650, delay: 200, ease: 'Back.easeOut' });
  }
  return plano;
}

// ---------- soldados ----------

// Tres columnas de soldados marchando hacia arriba, sobre el terreno que se desliza
export function marcha(escena, d) {
  const plano = nuevoPlano(escena);
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_3', dur: d.dur, velocidad: 160, oscuro: 0.15 });
  [450, 640, 830].forEach((x, c) => {
    for (let fila = 0; fila < 4; fila++) {
      const y0 = 800 + fila * 110 + (c === 1 ? -50 : 0); // la columna del medio va un poco adelante
      const soldado = escena.add.sprite(x, y0, 'soldado_aliado_arriba').setScale(ESCALA.soldado);
      soldado.play('aliado_arriba');
      plano.capas.suelo.add(soldado);
      escena.tweens.add({ targets: soldado, y: y0 - 1300, duration: d.dur * 1000 + 800, ease: 'Sine.easeIn' }); // arrancan al paso y aceleran
    }
  });
  return plano;
}

// ---------- el título ----------

// El golpe de la canción: destello, el título cae grande y una formación en V de aviones sube por detrás
export function titulo(escena, d) {
  const plano = nuevoPlano(escena);
  const { width } = escena.scale;
  fondoTerreno(escena, plano, { terreno: d.terreno ?? 'terreno_1', dur: d.dur, velocidad: 130, oscuro: 0.25 });

  // La separación entre aviones es mayor que su ancho (unos 150 px), así ninguno tapa a otro
  const uve = [[0, 0], [-175, 110], [175, 110], [-350, 220], [350, 220], [-525, 330], [525, 330]];
  uve.forEach((desfase) => volar(escena, plano, { ruta: [width / 2, 1000, width / 2, -520], desfase, dur: d.dur - 0.5, escala: 1.6, ease: 'Quad.easeOut' })); // sube rápido y se va frenando

  const [anio, nombre] = INFO.titulo.replace(':', '').split('\n');
  const t1 = escena.add.text(width / 2, 255, anio, { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '200px', color: '#000000', stroke: '#ffffff', strokeThickness: 12 }).setOrigin(0.5);
  const t2 = escena.add.text(width / 2, 405, nombre, { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '74px', color: '#ffffff', stroke: '#000000', strokeThickness: 9 }).setOrigin(0.5);
  const t3 = escena.add.text(width / 2, 480, INFO.subtitulo.toUpperCase(), estiloHud(20, { color: TXT.dorado, fontStyle: 'bold', letterSpacing: 4 })).setOrigin(0.5);
  plano.capas.texto.add([t1, t2, t3]); // el texto va en su capa, siempre sobre los aviones
  golpe(escena, t1, { delay: 0 });
  golpe(escena, t2, { delay: 180, desde: 1.5 });
  deslizar(escena, t3, { dy: 30, delay: 600 });

  const destello = escena.add.rectangle(width / 2, 360, width, 720, 0xffffff, 1);
  plano.capas.texto.add(destello);
  escena.tweens.add({ targets: destello, alpha: 0, duration: 550 });
  escena.cameras.main.shake(260, 0.01);
  return plano;
}

// ---------- el cierre ----------

// El avión aterriza al atardecer sobre una pista que cruza el primer terreno del juego (el de Zarumilla). Va bajando: se
// achica y su sombra se pega a él hasta tocar la pista, levanta polvo y frena. Cuando vuelve la música aparece "FIN".
export function cierre(escena, d) {
  const plano = nuevoPlano(escena);
  const { width, height } = escena.scale;
  const toque = d.toqueEn; // segundo en que las ruedas tocan la pista
  const frenado = d.finEn + 1.5 - toque; // cuánto tarda en detenerse

  // Terreno y pista se desplazan juntos: rápido mientras el avión baja y frenando en seco después del toque
  const terreno = escena.add.tileSprite(width / 2, height / 2, width, height, 'terreno_1').setTileScale(2);
  const pista = escena.add.tileSprite(width / 2, height / 2, 320, height, PISTA).setTileScale(2);
  const velocidad = 470; // píxeles por segundo en el aire
  [terreno, pista].forEach((suelo) => {
    escena.tweens.add({ targets: suelo, tilePositionY: -velocidad * toque, duration: toque * 1000, ease: 'Linear' });
    escena.tweens.add({ targets: suelo, tilePositionY: -velocidad * toque - (velocidad * frenado) / 2, duration: frenado * 1000, delay: toque * 1000, ease: 'Quad.easeOut' });
  });
  const atardecer = escena.add.rectangle(width / 2, height / 2, width, height, 0xff8a50, 0.5).setBlendMode(Phaser.BlendModes.MULTIPLY);
  const cielo = escena.add.graphics(); // arriba se oscurece, ahí va la dedicatoria
  cielo.fillGradientStyle(0x140a2c, 0x140a2c, 0x140a2c, 0x140a2c, 0.75, 0.75, 0, 0).fillRect(0, 0, width, 380);
  const brillo = escena.add.image(width / 2, 90, 'ending_chispa').setScale(22).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4);
  plano.capas.fondo.add([terreno, pista, atardecer, cielo, brillo]);

  // El avión: la altura va de 1 (en el aire) a 0 (en el suelo). Con la altura cambian su tamaño y la distancia de su sombra
  const base = ESCALA.avion;
  const x = width / 2;
  const y = 470;
  const sombra = escena.add.sprite(x, y, 'avion_jugador').setTint(0x000000).setAlpha(0.3);
  const avion = escena.add.sprite(x, y, 'avion_jugador');
  [sombra, avion].forEach((s) => s.play('nave_vuelo'));
  plano.capas.sombras.add(sombra);
  plano.capas.aire.add(avion);
  const poner = (altura) => {
    const escala = base * (1 + 0.6 * altura);
    avion.setScale(escala);
    sombra.setScale(escala * 1.02).setPosition(x + SOMBRA.x * base * 3 * altura, y + SOMBRA.y * base * 3 * altura);
  };
  const altura = { v: 1 };
  poner(1);
  escena.tweens.add({ targets: altura, v: 0, duration: toque * 1000, ease: 'Sine.easeIn', onUpdate: () => poner(altura.v) });

  // Al tocar la pista las dos ruedas levantan polvo y la cámara tiembla un poco
  programar(escena, plano, toque, () => {
    escena.cameras.main.shake(220, 0.005);
    [-1, 1].forEach((lado) => {
      for (let i = 0; i < 6; i++) {
        const polvo = escena.add.circle(x + lado * 40, y + 45, Phaser.Math.Between(8, 14), 0xe8d8b0, 0.65);
        plano.capas.efectos.add(polvo);
        escena.tweens.add({ targets: polvo, x: polvo.x + lado * Phaser.Math.Between(10, 60), y: polvo.y + Phaser.Math.Between(80, 220), scale: 3, alpha: 0, duration: 1100, delay: i * 70, onComplete: () => polvo.destroy() });
      }
    });
  });

  const dedicatoria = [
    escena.add.text(width / 2, 110, 'EN MEMORIA DE', estiloHud(22, { color: TXT.dorado, fontStyle: 'bold', letterSpacing: 8 })).setOrigin(0.5),
    escena.add.text(width / 2, 168, 'José Abelardo Quiñones Gonzales', estiloHud(50)).setOrigin(0.5),
    escena.add.text(width / 2, 228, '23 DE JULIO DE 1941', estiloHud(26, { fontStyle: 'bold', letterSpacing: 6 })).setOrigin(0.5),
  ];
  plano.capas.texto.add(dedicatoria);
  dedicatoria.forEach((t, i) => deslizar(escena, t, { dy: 20, delay: 900 + i * 700, dur: 900 }));

  // El FIN sale arriba, lejos del avión, para no taparlo
  const fin = escena.add.text(width / 2, 200, 'FIN', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '150px', color: '#ffffff', stroke: '#000000', strokeThickness: 10 }).setOrigin(0.5).setAlpha(0);
  const gracias = escena.add.text(width / 2, 310, 'GRACIAS POR JUGAR', estiloHud(28, { fontStyle: 'bold', letterSpacing: 8 })).setOrigin(0.5).setAlpha(0);
  const curso = escena.add.text(width / 2, 636, `UTP  ·  ${INFO.curso.toUpperCase()}`, estiloHud(14, { fontStyle: 'bold', letterSpacing: 4 })).setOrigin(0.5).setAlpha(0);
  plano.capas.texto.add([fin, gracias, curso]);

  // Cuando vuelve la música la dedicatoria se va y entra el FIN
  programar(escena, plano, d.finEn, () => {
    escena.tweens.add({ targets: dedicatoria, alpha: 0, duration: 500 });
    golpe(escena, fin, { desde: 1.4, dur: 600, delay: 300 });
    escena.tweens.add({ targets: [gracias, curso], alpha: 1, duration: 800, delay: 900 });
  });
  return plano;
}
