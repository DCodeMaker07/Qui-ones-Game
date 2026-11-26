import { CAPA, FUENTE_UI, MARGEN, estiloHud } from '../tema.js';
import { barridoCuadrado } from '../dibujo.js';
import { crearVidrio } from '../vidrio.js';
import { GOTA } from '../../sistemas/nivel/agua.js';
import { TONEL_ICONO } from '../../sistemas/nivel/iconos.js';
import { nombreTecla, TECLAS } from '../../sistemas/nivel/constantes.js';

// La barra de habilidades de abajo al centro, al estilo de League of Legends pero de vidrio líquido: cuatro cuadros grandes
// (Q, W, E, R), dos más chicos para el agua (F) y el tonel (X) y, a la izquierda, el indicador de altura. Cada habilidad tiene la tecla arriba
// y, mientras se recarga, se oscurece con un reloj que gira y muestra los segundos que faltan; al volver a estar lista hace un
// destello. Solo dibuja: los datos los pide a Habilidades.estado() y Altura.estado().
const LADO = 68;
const LADO_AGUA = 52;
const SEPARACION = 10;
const SEPARACION_AGUA = 22;
const ANCHO_ALTURA = 52; // el indicador de altura
const ORO = 0xc8aa6e;
const NARANJA = 0xffb000;
const TINTE_RECARGA = 0x8d97a3; // el vidrio se apaga mientras la habilidad se recarga
const TINTE_ACTIVA = 0xffb86b; // y se enciende mientras la estoy usando
const CELESTE = 0x9fe2ff;
// El tinte del vidrio de cada cuadro: neutro, cálido para la R (fuego) y azul para el agua
const TINTES = [0xe6f1ff, 0xe6f1ff, 0xe6f1ff, 0xffd9a8, 0xa8d8ff, 0xd0f2ff];

export default class BarraHabilidades {
  constructor(escena) {
    this.escena = escena;
    this.objetos = [];
    this.destello = TINTES.map(() => 0); // brillo blanco que se apaga solo cuando la habilidad vuelve a estar lista
    this.estabaLista = TINTES.map(() => true);
    this.ultimaHora = escena.time.now;
    this.crear();
  }

  crear() {
    const e = this.escena;
    const { width, height } = e.scale;
    const total = LADO * 4 + SEPARACION * 3 + SEPARACION_AGUA + LADO_AGUA * 2 + SEPARACION;
    const x0 = width / 2 - total / 2;
    const base = height - MARGEN; // borde de abajo de todos los cuadros
    // Cada cuadro: centro y lado. Q, W, E y R grandes y el agua más chica, alineada abajo
    this.cuadros = [0, 1, 2, 3].map((i) => ({ lado: LADO, cx: x0 + i * (LADO + SEPARACION) + LADO / 2, cy: base - LADO / 2 }));
    // El agua (F) y el tonel (X), más chicos, uno al lado del otro a la derecha
    const xAgua = x0 + LADO * 4 + SEPARACION * 3 + SEPARACION_AGUA + LADO_AGUA / 2;
    this.cuadros.push({ lado: LADO_AGUA, cx: xAgua, cy: base - LADO_AGUA / 2 });
    this.cuadros.push({ lado: LADO_AGUA, cx: xAgua + LADO_AGUA + SEPARACION, cy: base - LADO_AGUA / 2 });

    const panel = crearVidrio(e, x0 - 16, base - LADO - 14, total + 32, LADO + 28);
    // Cada cuadro tiene su propio vidrio, un poco más claro, para que se vea el marco de cada habilidad
    this.vidrios = this.cuadros.map(({ cx, cy, lado }, i) => crearVidrio(e, cx - lado / 2, cy - lado / 2, lado, lado, TINTES[i]));
    this.iconos = this.crearIconos();
    this.frente = e.add.graphics(); // el reloj de enfriamiento, los marcos y el destello van encima de los íconos
    this.numeros = this.cuadros.map(({ cx, cy, lado }) => e.add.text(cx, cy, '', estiloHud(lado === LADO ? 26 : 20, { fontStyle: 'bold' })).setOrigin(0.5));
    this.letras = this.cuadros.map(({ cx, cy, lado }) => e.add.text(cx, cy - lado / 2 - 3, '', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '13px', color: '#f0e6d2' }).setOrigin(0.5));
    const altura = this.crearAltura(x0 - 16 - 10 - ANCHO_ALTURA, base - LADO - 14, LADO + 28);
    this.objetos = [panel, ...this.vidrios, ...this.iconos.flat(), this.frente, ...this.numeros, ...this.letras, ...altura];
    this.objetos.forEach((o) => o.setDepth(CAPA.hud));
  }

  // El indicador de altura: tres rayitas (alto, normal y bajo) con la actual encendida, y abajo las teclas o, si hay que esperar,
  // los segundos que faltan para poder cambiar
  crearAltura(x, y, alto) {
    const e = this.escena;
    this.altura = { x, y, alto };
    const vidrio = crearVidrio(e, x, y, ANCHO_ALTURA, alto);
    this.gAltura = e.add.graphics();
    const cx = x + ANCHO_ALTURA / 2;
    this.txtAltura = e.add.text(cx, y + alto - 18, '', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '11px', color: '#f0e6d2', align: 'center' }).setOrigin(0.5);
    this.txtAlturaTitulo = e.add.text(cx, y + 13, 'ALTURA', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '10px', color: '#f0e6d2' }).setOrigin(0.5);
    return [vidrio, this.gAltura, this.txtAltura, this.txtAlturaTitulo];
  }

  // Los íconos los armo con los mismos sprites del juego: la bomba, una bala, tres balas en abanico, una llama y la gota de agua
  crearIconos() {
    const e = this.escena;
    const c = this.cuadros;
    const bala = (x, y, angulo = 0) => e.add.image(x, y, 'bala').setScale(0.6).setAngle(angulo);
    const llama = e.textures.exists('llama')
      ? e.add.image(c[3].cx, c[3].cy + 17, 'llama', 2).setOrigin(0.5, 1).setScale(0.36) // más chica que el cuadro, para que respire
      : e.add.triangle(c[3].cx, c[3].cy + 4, -11, 18, 11, 18, 0, -18, NARANJA);
    return [
      [e.add.image(c[0].cx, c[0].cy, 'bomba').setScale(0.75).setAngle(180)],
      [bala(c[1].cx - 9, c[1].cy), bala(c[1].cx + 9, c[1].cy)],
      [bala(c[2].cx - 15, c[2].cy + 2, -24), bala(c[2].cx, c[2].cy - 2), bala(c[2].cx + 15, c[2].cy + 2, 24)],
      [llama],
      [e.add.image(c[4].cx, c[4].cy, GOTA).setScale(0.55)],
      [e.add.image(c[5].cx, c[5].cy, TONEL_ICONO).setScale(0.62)],
    ];
  }

  actualizar() {
    const e = this.escena;
    const ahora = e.time.now;
    const dt = Math.min(0.1, (ahora - this.ultimaHora) / 1000);
    this.ultimaHora = ahora;
    const frente = this.frente.clear();
    const pulso = 0.5 + 0.5 * Math.sin(ahora / 140);

    e.habilidades.estado().forEach((h, i) => {
      const { cx, cy, lado } = this.cuadros[i];
      const mitad = lado / 2;
      const recargando = h.restante > 0;
      if (this.estabaLista[i] === false && !recargando) this.destello[i] = 1; // acaba de recargarse
      this.estabaLista[i] = !recargando;
      this.destello[i] = Math.max(0, this.destello[i] - dt * 3);

      this.iconos[i].forEach((icono) => (recargando ? icono.setTint(0x6a6a6a) : icono.clearTint()));
      if (recargando) barridoCuadrado(frente, cx, cy, mitad, h.restante / h.espera, 0x000000, 0.55);
      if (this.destello[i] > 0) frente.fillStyle(0xffffff, this.destello[i] * 0.55).fillRect(cx - mitad, cy - mitad, lado, lado);

      // Sin marco cuadrado: el estado se ve en el propio vidrio. Se apaga al recargarse y se enciende, latiendo, mientras uso la habilidad
      this.vidrios[i].setTint(h.activa ? TINTE_ACTIVA : recargando ? TINTE_RECARGA : TINTES[i]).setAlpha(h.activa ? 0.75 + 0.25 * pulso : 1);
      // La etiqueta de la tecla va sobre el borde de arriba, como en el juego original
      frente.fillStyle(0x0a0e14, 0.85).fillRoundedRect(cx - 12, cy - mitad - 12, 24, 18, 4);
      frente.lineStyle(2, ORO, 1).strokeRoundedRect(cx - 12, cy - mitad - 12, 24, 18, 4);

      this.letras[i].setText(h.tecla);
      const texto = recargando ? String(h.restante < 10 ? h.restante.toFixed(1) : Math.ceil(h.restante)) : '';
      if (this.numeros[i].text !== texto) this.numeros[i].setText(texto);
    });
    this.pintarAltura();
  }

  pintarAltura() {
    const { nivel, restante } = this.escena.altura.estado();
    const { x, y } = this.altura;
    const g = this.gAltura.clear();
    const cx = x + ANCHO_ALTURA / 2;
    const esperando = restante > 0;
    // De arriba hacia abajo: alto (1), normal (0) y bajo (-1)
    [1, 0, -1].forEach((piso, k) => {
      const actual = piso === nivel;
      g.fillStyle(actual ? CELESTE : 0xffffff, actual ? (esperando ? 0.6 : 1) : 0.22).fillRoundedRect(cx - 14, y + 24 + k * 15, 28, 9, 4);
    });
    const texto = esperando ? `${Math.ceil(restante)} s` : `${nombreTecla(TECLAS.subir).slice(0, 3)} ▲  ${TECLAS.bajar} ▼`;
    if (this.txtAltura.text !== texto) this.txtAltura.setText(texto);
  }
}
