import Phaser from 'phaser';
import { CAMARA, ZOOM } from './constantes.js';
import { ejeDerecho } from '../entrada/Mando.js';

// Las cámaras del nivel. Uso dos:
//   - la del mundo (cameras.main): sigue un poco al avión y hace zoom con la rueda del mouse, como en League of Legends
//   - la de la interfaz: nunca se mueve ni hace zoom, y solo dibuja el HUD, la radio y los menús
// Phaser dibuja todo lo que hay en la escena con todas las cámaras, así que cada objeto nuevo que se agrega lo ignora la cámara de la
// interfaz (en cuanto se agrega a la escena). Lo que sea interfaz lo marco con interfaz(), que hace lo contrario: lo ve la cámara de la
// interfaz y la del mundo lo ignora. Si alguna vez me olvido de marcar algo, solo se verá con el zoom, pero no se rompe nada.
export default class Camara {
  constructor(escena) {
    const { width, height } = escena.scale;
    this.escena = escena;
    this.mundo = escena.cameras.main;
    this.ui = escena.cameras.add(0, 0, width, height);
    this.zoom = 1;
    this.zoomObjetivo = 1;
    this.baseX = 0; // cuánto se corrió la cámara por seguirme, con el zoom en 1
    this.baseY = 0;
    escena.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (objeto) => (objeto.cameraFilter |= this.ui.id));
    escena.input.on('wheel', (_puntero, _objetos, _dx, dy) => this.girarRueda(dy));
  }

  // Un paso de la rueda: hacia abajo aleja la cámara y hacia arriba la acerca, entre ZOOM.min y ZOOM.max
  girarRueda(dy) {
    if (this.escena.pausado || this.escena.terminado) return;
    this.zoomObjetivo = Phaser.Math.Clamp(this.zoomObjetivo * (dy > 0 ? ZOOM.paso : 1 / ZOOM.paso), ZOOM.min, ZOOM.max);
  }

  // Marca objetos (y todo lo que tengan adentro, si son contenedores) como interfaz
  interfaz(...objetos) {
    objetos.flat().forEach((objeto) => {
      if (!objeto) return;
      objeto.cameraFilter &= ~this.ui.id;
      objeto.cameraFilter |= this.mundo.id;
      if (objeto.list) this.interfaz(objeto.list);
    });
  }

  // El oscurecido de entrada y de salida tiene que cubrir las dos cámaras
  fundirEntrada(ms) {
    this.mundo.fadeIn(ms, 0, 0, 0);
    this.ui.fadeIn(ms, 0, 0, 0);
  }

  fundirSalida(ms) {
    this.mundo.fadeOut(ms, 0, 0, 0);
    this.ui.fadeOut(ms, 0, 0, 0);
  }

  // Cada fotograma: la cámara se corre un poco hacia donde me alejo del centro (ver CAMARA) y el zoom se acerca suavemente a su objetivo.
  // El zoom se hace alrededor de mi avión: así queda en el mismo lugar de la pantalla mientras acerco o alejo
  actualizar(dt, jugador) {
    const { width, height } = this.escena.scale;
    const k = Math.min(1, dt * CAMARA.suavizado);
    const objetivoX = Phaser.Math.Clamp((jugador.x - width / 2) * CAMARA.seguirX, -CAMARA.margenX * 1.4, CAMARA.margenX * 1.4);
    const objetivoY = Phaser.Math.Clamp((jugador.y - height / 2) * CAMARA.seguirY, -CAMARA.margenArriba * 1.2, CAMARA.margenAbajo * 2.2);
    this.baseX += (objetivoX - this.baseX) * k;
    this.baseY += (objetivoY - this.baseY) * k;
    // Con mando, el stick derecho hace el zoom: hacia arriba acerca y hacia abajo aleja, más rápido mientras más lo inclino
    const { y: stick } = ejeDerecho();
    if (stick) this.zoomObjetivo = Phaser.Math.Clamp(this.zoomObjetivo * Math.exp(-stick * dt * ZOOM.mando), ZOOM.min, ZOOM.max);
    this.zoom += (this.zoomObjetivo - this.zoom) * Math.min(1, dt * ZOOM.suavizado);
    this.mundo.setZoom(this.zoom);

    // Dónde estaría mi avión en la pantalla con el zoom en 1, y el punto del mundo que tiene que quedar en el centro para que siga ahí
    const pantallaX = jugador.x - this.baseX;
    const pantallaY = jugador.y - this.baseY;
    this.mundo.centerOn(jugador.x - (pantallaX - width / 2) / this.zoom, jugador.y - (pantallaY - height / 2) / this.zoom);
  }
}
