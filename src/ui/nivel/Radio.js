import { FUENTE_UI, MARGEN, CAPA, TXT } from '../tema.js';
import { METAL, remache } from '../cabina.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';

// La radio como un chat a la izquierda de la pantalla: solo el nombre y el mensaje, dentro de una placa de metal oscuro con una franja ámbar.
// Cada mensaje nuevo aparece abajo y el recuadro crece hacia arriba. Al llegar al alto máximo se hace scroll solo: lo viejo
// sube y se recorta por arriba, así siempre se ve lo último. Cada mensaje se apaga a los pocos segundos.
// Acá también están los comandos por voz del modo un jugador. En multijugador la radio la maneja Multijugador.js, que usa
// mostrar() para escribir en este mismo chat.

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function esPedidoBotiquin(texto) {
  return /botiqu|suministro|medic|curar|ayuda/i.test(sinAcentos(texto));
}

// Pedir refuerzos: "trae refuerzos", "necesito refuerzos", "manda más soldados"...
export function esPedidoRefuerzos(texto) {
  return /refuerzo|mas soldados|manda soldados|trae soldados/.test(sinAcentos(texto).toLowerCase());
}

// "Layla, coloca barreras" (también muros, escudos, cobertura...)
export function esPedidoBarreras(texto) {
  return /barrera|muro|escudo|cobertura|trinchera|parapeto/.test(sinAcentos(texto).toLowerCase());
}

// "Layla, que avancen más rápido los soldados": una palabra de velocidad y otra que hable de los soldados o de avanzar
export function esPedidoVelocidad(texto) {
  const limpio = sinAcentos(texto).toLowerCase();
  return /rapid|veloc|apur|prisa|corr|aceler/.test(limpio) && /soldado|avanc|marcha|tropa|aliado|camin/.test(limpio);
}

const ANCHO = 380;
const ALTO_MAX = 250; // alto máximo del contenido; si no cabe, se hace scroll
const RELLENO = 12;
const SEPARACION = 10; // entre un mensaje y el siguiente
const MAX_MENSAJES = 12;
const AUTORES = {
  layla: { nombre: 'LAYLA', color: '#ff8ad0' },
  piloto: { nombre: 'QUIÑONES', color: '#4af0ff' },
};

export default class Radio {
  constructor(escena) {
    this.escena = escena;
    this.mensajes = [];
    this.x = MARGEN;
    this.abajo = escena.scale.height - 155; // el borde de abajo del chat, justo arriba del retrato de Quiñones

    this.placa = escena.add.graphics(); // la placa de metal, que se redibuja más grande con cada mensaje
    this.contenido = escena.add.container(this.x + RELLENO, 0);
    // La máscara recorta lo que sube por arriba del recuadro cuando hay scroll
    this.mascara = escena.make.graphics({ add: false });
    this.mascara.setScrollFactor(0); // la radio y su máscara no se mueven con la cámara del nivel
    this.contenido.setMask(this.mascara.createGeometryMask());
    this.cont = escena.add.container(0, 0, [this.placa, this.contenido]).setDepth(CAPA.radio).setScrollFactor(0);
    escena.camara.interfaz(this.cont);
  }

  // texto: lo que se dice. "Layla: ..." y "Torre: ..." son de Layla y "Tú: ..." es mío; todo lo demás también lo dice la torre.
  // duracion: cuánto tiempo se queda el mensaje (por defecto según su largo)
  mostrar(texto, { duracion } = {}) {
    const e = this.escena;
    const { autor, cuerpo } = this.separarAutor(texto);
    const nombre = e.add.text(0, 0, AUTORES[autor].nombre, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '13px', color: AUTORES[autor].color });
    const mensaje = e.add.text(0, 0, cuerpo, { fontFamily: FUENTE_UI, fontSize: '16px', color: TXT.blanco, lineSpacing: 2, wordWrap: { width: ANCHO - RELLENO * 2 } });
    this.contenido.add([nombre, mensaje]);
    e.camara.interfaz(nombre, mensaje); // los textos nuevos también son interfaz
    const m = { nombre, mensaje, alto: nombre.height + mensaje.height + 2 };
    this.mensajes.push(m);
    [nombre, mensaje].forEach((t) => t.setAlpha(0));
    e.tweens.add({ targets: [nombre, mensaje], alpha: 1, duration: 220 });

    if (this.mensajes.length > MAX_MENSAJES) this.quitar(this.mensajes[0]);
    e.time.delayedCall(duracion ?? Math.max(5000, cuerpo.length * 90), () => this.quitar(m));
    this.acomodar();
  }

  separarAutor(texto) {
    const partes = /^(Layla|Torre|Tú): ?(.*)$/s.exec(texto);
    if (!partes) return { autor: 'layla', cuerpo: texto };
    return { autor: partes[1] === 'Tú' ? 'piloto' : 'layla', cuerpo: partes[2] };
  }

  // El mensaje se apaga y recién ahí lo saco de la lista para que el resto se acomode
  quitar(m) {
    if (m.quitado) return;
    m.quitado = true;
    this.escena.tweens.add({
      targets: [m.nombre, m.mensaje], alpha: 0, duration: 350,
      onComplete: () => {
        m.nombre.destroy();
        m.mensaje.destroy();
        this.mensajes = this.mensajes.filter((otro) => otro !== m);
        this.acomodar();
      },
    });
  }

  // Apila los mensajes, calcula el alto del recuadro (hasta ALTO_MAX) y hace scroll para que se vea el último
  acomodar() {
    let y = 0;
    this.mensajes.forEach((m) => {
      m.nombre.setY(y);
      m.mensaje.setY(y + m.nombre.height);
      y += m.alto + SEPARACION;
    });
    const total = Math.max(0, y - SEPARACION);
    const alto = Math.min(total, ALTO_MAX) + RELLENO * 2;
    const arriba = this.abajo - alto;
    const scroll = Math.max(0, total - ALTO_MAX); // lo que se pasó del alto máximo

    this.mascara.clear();
    this.placa.clear();
    if (this.mensajes.length) {
      this.dibujarPlaca(arriba, alto);
      this.mascara.fillStyle(0xffffff, 1).fillRect(this.x, arriba + 4, ANCHO, alto - 8);
    }
    this.escena.tweens.killTweensOf(this.contenido);
    this.escena.tweens.add({ targets: this.contenido, y: arriba + RELLENO - scroll, duration: 200, ease: 'Cubic.easeOut' });
  }

  // La placa: metal oscuro con borde gris, una franja ámbar a la izquierda y remaches en las esquinas
  dibujarPlaca(arriba, alto) {
    const g = this.placa;
    g.fillStyle(0x151a20, 0.92).fillRoundedRect(this.x, arriba, ANCHO, alto, 8);
    g.lineStyle(2, METAL.borde, 1).strokeRoundedRect(this.x, arriba, ANCHO, alto, 8);
    g.fillStyle(METAL.ambar, 1).fillRect(this.x + 3, arriba + 10, 3, alto - 20);
    [[this.x + 12, arriba + 6], [this.x + ANCHO - 8, arriba + 6], [this.x + 12, arriba + alto - 6], [this.x + ANCHO - 8, arriba + alto - 6]].forEach(([rx, ry]) => remache(g, rx, ry, 2));
  }

  ocultar() {
    this.cont.setVisible(false);
  }

  // Lo que Layla me contesta después de una orden: lo escribe en la radio y lo dice con su voz
  responder(texto) {
    if (!texto) return;
    this.mostrar('Layla: ' + texto, { duracion: 4500 });
    this.escena.game.voice?.hablar(texto, undefined, 'M'); // Layla siempre responde con voz de mujer
  }

  // Modo un jugador: hablo yo (tecla T), Layla repite con la voz que corresponde al DNI y después responde
  hablarPorVoz() {
    const e = this.escena;
    const voz = e.game.voice;
    if (!voz?.soportado) return this.mostrar('Tu navegador no soporta voz. Usa Chrome o Edge.');

    ambiente.pulso('#4aa3ff', 1500, 2);
    this.mostrar('Escuchando...', { duracion: 6000 });
    voz.escuchar({
      onTexto: (dicho) => {
        e.hud.pilotoHabla(1500);
        const enBase = e.fase === 'base';
        const pideBarreras = esPedidoBarreras(dicho);
        const pideVelocidad = esPedidoVelocidad(dicho);
        const pideRefuerzos = !pideBarreras && !pideVelocidad && esPedidoRefuerzos(dicho);
        const pideBotiquin = !pideBarreras && !pideVelocidad && !pideRefuerzos && esPedidoBotiquin(dicho);
        this.mostrar('Tú: ' + dicho, { duracion: 4500 });
        // Después de repetir lo que dije, Layla hace lo que le pedí y me contesta
        voz.hablar(dicho, () => {
          if (pideBarreras) e.time.delayedCall(300, () => this.responder(e.barreras.ponerGrupo()));
          else if (pideVelocidad) e.time.delayedCall(300, () => this.responder(e.soldados.acelerar()));
          else if (pideRefuerzos && enBase) e.time.delayedCall(300, () => e.baseEnemiga.llamarRefuerzos()); // con la base a la vista, los refuerzos del asedio
          else if (pideRefuerzos) e.time.delayedCall(300, () => this.responder(e.soldados.traerRefuerzos()));
          else if (enBase && !pideBotiquin) e.baseEnemiga.refuerzoNoEntendido();
        });
        if (pideBotiquin) e.time.delayedCall(1500, () => e.botiquin.pedir());
      },
      onError: (mensaje) => this.mostrar(mensaje),
    });
  }
}
