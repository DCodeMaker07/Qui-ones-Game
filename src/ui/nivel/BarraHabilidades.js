import { CAPA, FUENTE_UI } from '../tema.js';
import { barridoCuadrado } from '../dibujo.js';
import { METAL, bordeDe, estiloInstrumento, hueco, remaches, tecla } from '../cabina.js';
import { GOTA } from '../../sistemas/nivel/agua.js';
import { TONEL_ICONO } from '../../sistemas/nivel/iconos.js';
import { TECLAS, nombreTecla } from '../../sistemas/nivel/constantes.js';
import { alCambiarEntrada, usandoMando } from '../../sistemas/entrada/preferencias.js';
import { BOTON_DE_MANDO, COLOR_BOTON, dibujarBotonDeCara } from '../../sistemas/entrada/etiquetas.js';

// Las habilidades en el medio del tablero de la cabina, al estilo de League of Legends: cuatro casillas grandes (Q, W, E, R), dos más
// chicas para el agua (F) y el tonel (X) y, debajo de cada una, una tecla con su letra. Cada casilla es un hueco hundido en el metal.
// Mientras una habilidad se recarga se oscurece con un reloj que gira y muestra los segundos que faltan; al volver a estar lista hace
// un destello, y mientras la uso el borde se enciende en ámbar. Solo dibuja: los datos los pide a Habilidades.estado().
const X0 = 446; // donde empieza la primera casilla
const Y_ABAJO = 660; // el borde de abajo de todas las casillas
const LADO = 62;
const LADO_PEQ = 46;
const SEPARACION = 8;
const SEPARACION_PEQ = 16; // entre la R y el agua
const NARANJA = 0xffb000;

export default class BarraHabilidades {
  constructor(escena) {
    this.escena = escena;
    this.objetos = [];
    this.destello = [0, 0, 0, 0, 0, 0]; // brillo blanco que se apaga solo cuando la habilidad vuelve a estar lista
    this.estabaLista = [true, true, true, true, true, true];
    this.ultimaHora = escena.time.now;
    this.crear();
  }

  crear() {
    const e = this.escena;
    // Cada casilla: centro y lado. Q, W, E y R grandes y el agua y el tonel más chicos, a la derecha y alineados abajo
    this.cuadros = [0, 1, 2, 3].map((i) => ({ lado: LADO, cx: X0 + i * (LADO + SEPARACION) + LADO / 2, cy: Y_ABAJO - LADO / 2 }));
    const xPeq = X0 + 4 * LADO + 3 * SEPARACION + SEPARACION_PEQ;
    this.cuadros.push({ lado: LADO_PEQ, cx: xPeq + LADO_PEQ / 2, cy: Y_ABAJO - LADO_PEQ / 2 });
    this.cuadros.push({ lado: LADO_PEQ, cx: xPeq + LADO_PEQ + SEPARACION + LADO_PEQ / 2, cy: Y_ABAJO - LADO_PEQ / 2 });

    // Lo fijo: el hueco de cada casilla, sus remaches y la tecla de abajo
    const fondo = e.add.graphics();
    this.cuadros.forEach(({ cx, cy, lado }) => {
      hueco(fondo, cx - lado / 2, cy - lado / 2, lado, lado, 6);
      remaches(fondo, cx - lado / 2, cy - lado / 2, lado, lado, 4);
    });
    this.iconos = this.crearIconos();
    this.frente = e.add.graphics(); // el reloj de enfriamiento, el borde de estado y el destello van encima de los íconos
    this.numeros = this.cuadros.map(({ cx, cy, lado }) => e.add.text(cx, cy, '', estiloInstrumento(lado === LADO ? 24 : 18, '#ffffff', { strokeThickness: 3 })).setOrigin(0.5));
    this.gTeclas = e.add.graphics(); // las teclas de abajo de cada casilla: cuadritos con su letra, o botones de colores si juego con mando
    this.letras = this.cuadros.map(({ cx }) => e.add.text(cx, Y_ABAJO + 10, '', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '11px', color: '#f0e6d2' }).setOrigin(0.5));
    this.pintarTeclas();
    const quitar = alCambiarEntrada(() => this.pintarTeclas());
    e.events.once('shutdown', quitar);
    this.objetos = [fondo, ...this.iconos.flat(), this.frente, this.gTeclas, ...this.numeros, ...this.letras];
    this.objetos.forEach((o) => o.setDepth(CAPA.hud));
  }

  // Debajo de cada casilla va su tecla. Con teclado es un cuadrito con la letra; con mando muestro el botón que le toca (A, B, X, Y con su color
  // y en círculo, como en el mando de verdad; los gatillos y el resto en cuadrito)
  pintarTeclas() {
    const g = this.gTeclas.clear();
    [TECLAS.bomba, TECLAS.disparo, TECLAS.rafaga, TECLAS.especial, TECLAS.agua, TECLAS.tonel].forEach((codigo, i) => {
      const { cx } = this.cuadros[i];
      const boton = usandoMando() ? BOTON_DE_MANDO[codigo] : undefined; // A, B, X, Y, RT, LT...
      const deCara = boton && COLOR_BOTON[boton]; // los cuatro botones de colores
      let texto = nombreTecla(codigo);
      if (deCara) {
        const conSimbolo = dibujarBotonDeCara(g, cx, Y_ABAJO + 10, boton); // en PlayStation el símbolo ya va dibujado y no pongo letra
        if (conSimbolo) texto = '';
      } else {
        tecla(g, cx, Y_ABAJO + 10, 28, 16);
      }
      this.letras[i].setText(texto).setColor(deCara ? '#0b0b0b' : '#f0e6d2').setFontSize(texto.length > 3 ? '9px' : '11px');
    });
  }

  // Los íconos los armo con los mismos sprites del juego: la bomba, una bala, tres balas en abanico, una llama, la gota de agua y el tonel
  crearIconos() {
    const e = this.escena;
    const c = this.cuadros;
    const bala = (x, y, angulo = 0) => e.add.image(x, y, 'bala').setScale(0.55).setAngle(angulo);
    const llama = e.textures.exists('llama')
      ? e.add.image(c[3].cx, c[3].cy + 15, 'llama', 2).setOrigin(0.5, 1).setScale(0.33) // más chica que la casilla, para que respire
      : e.add.triangle(c[3].cx, c[3].cy + 4, -11, 18, 11, 18, 0, -18, NARANJA);
    return [
      [e.add.image(c[0].cx, c[0].cy, 'bomba').setScale(0.68).setAngle(180)],
      [bala(c[1].cx - 8, c[1].cy), bala(c[1].cx + 8, c[1].cy)],
      [bala(c[2].cx - 14, c[2].cy + 2, -24), bala(c[2].cx, c[2].cy - 2), bala(c[2].cx + 14, c[2].cy + 2, 24)],
      [llama],
      [e.add.image(c[4].cx, c[4].cy, GOTA).setScale(0.5)],
      [e.add.image(c[5].cx, c[5].cy, TONEL_ICONO).setScale(0.56)],
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
      if (recargando) barridoCuadrado(frente, cx, cy, mitad - 1, h.restante / h.espera, 0x000000, 0.6);
      if (this.destello[i] > 0) frente.fillStyle(0xffffff, this.destello[i] * 0.55).fillRect(cx - mitad + 1, cy - mitad + 1, lado - 2, lado - 2);

      // El borde de la casilla muestra el estado: ámbar latiendo mientras la uso, apagado al recargarse y gris metal cuando está lista
      if (h.activa) bordeDe(frente, cx - mitad, cy - mitad, lado, lado, NARANJA, 3, 0.7 + 0.3 * pulso);
      else bordeDe(frente, cx - mitad, cy - mitad, lado, lado, recargando ? 0x2a2f36 : METAL.borde, 2, 1);

      const texto = recargando ? String(h.restante < 10 ? h.restante.toFixed(1) : Math.ceil(h.restante)) : '';
      if (this.numeros[i].text !== texto) this.numeros[i].setText(texto);
    });
  }
}
