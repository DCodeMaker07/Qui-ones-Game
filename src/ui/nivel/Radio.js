import { FUENTE_UI, MARGEN, CAPA, TXT } from '../tema.js';
import { crearVidrio } from '../vidrio.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';

// La radio como un chat a la izquierda de la pantalla: solo el nombre y el mensaje, dentro de un recuadro de vidrio transparente.
// Cada mensaje nuevo aparece abajo y el recuadro crece hacia arriba. Al llegar al alto máximo se hace scroll solo: lo viejo
// sube y se recorta por arriba, así siempre se ve lo último. Cada mensaje se apaga a los pocos segundos.
// Acá también están los comandos por voz del modo un jugador. En multijugador la radio la maneja Multijugador.js, que usa
// mostrar() para escribir en este mismo chat.

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function esPedidoBotiquin(texto) {
  return /botiqu|suministro|medic|curar|ayuda/i.test(sinAcentos(texto));
}

// Para pedir refuerzos hay que decir "refuerzo" y además la ubicación o la base: "Encontré la ubicación, necesito refuerzos"
export function esPedidoRefuerzos(texto) {
  const limpio = sinAcentos(texto).toLowerCase();
  return /refuerzo/.test(limpio) && /ubicaci|encontr|localiz|base|posicion/.test(limpio);
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

    this.vidrio = crearVidrio(escena, this.x, this.abajo - 40, ANCHO, 40).setVisible(false); // el recuadro de vidrio, que crece con los mensajes
    this.contenido = escena.add.container(this.x + RELLENO, 0);
    // La máscara recorta lo que sube por arriba del recuadro cuando hay scroll
    this.mascara = escena.make.graphics({ add: false });
    this.contenido.setMask(this.mascara.createGeometryMask());
    this.cont = escena.add.container(0, 0, [this.vidrio, this.contenido]).setDepth(CAPA.radio);
  }

  // texto: lo que se dice. "Layla: ..." y "Torre: ..." son de Layla y "Tú: ..." es mío; todo lo demás también lo dice la torre.
  // duracion: cuánto tiempo se queda el mensaje (por defecto según su largo)
  mostrar(texto, { duracion } = {}) {
    const e = this.escena;
    const { autor, cuerpo } = this.separarAutor(texto);
    const nombre = e.add.text(0, 0, AUTORES[autor].nombre, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '13px', color: AUTORES[autor].color });
    const mensaje = e.add.text(0, 0, cuerpo, { fontFamily: FUENTE_UI, fontSize: '16px', color: TXT.blanco, lineSpacing: 2, wordWrap: { width: ANCHO - RELLENO * 2 } });
    this.contenido.add([nombre, mensaje]);
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
    this.vidrio.setVisible(this.mensajes.length > 0);
    if (this.mensajes.length) {
      this.vidrio.setPosition(this.x, arriba).setSize(ANCHO, alto);
      this.mascara.fillStyle(0xffffff, 1).fillRect(this.x, arriba + 4, ANCHO, alto - 8);
    }
    this.escena.tweens.killTweensOf(this.contenido);
    this.escena.tweens.add({ targets: this.contenido, y: arriba + RELLENO - scroll, duration: 200, ease: 'Cubic.easeOut' });
  }

  ocultar() {
    this.cont.setVisible(false);
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
        const pideRefuerzos = enBase && esPedidoRefuerzos(dicho);
        const pideBotiquin = esPedidoBotiquin(dicho);
        this.mostrar('Tú: ' + dicho, { duracion: 4500 });
        voz.hablar(dicho, () => {
          if (pideRefuerzos) e.time.delayedCall(300, () => e.baseEnemiga.llamarRefuerzos());
          else if (enBase && !pideBotiquin) e.baseEnemiga.refuerzoNoEntendido();
        });
        if (pideBotiquin) e.time.delayedCall(1500, () => e.botiquin.pedir());
      },
      onError: (mensaje) => this.mostrar(mensaje),
    });
  }
}
