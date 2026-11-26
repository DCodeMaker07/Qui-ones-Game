// El punto de control de un nivel. Cada vez que despejo un grupo de torretas, y al llegar a la base, guardo cuánto llevo avanzado:
// torretas destruidas, distancia recorrida, puntaje, botiquines y fase. Si me derriban y elijo "Continuar desde el punto", el nivel
// arranca desde ahí (con todas las vidas) en vez de empezar de cero. Se guarda en el registro del juego (no en el disco) y se borra
// al terminar el nivel, al reiniciarlo desde el principio o al empezar una partida nueva (ver reiniciarPuntaje en Puntaje.js).
export const clavePuntoDeControl = (nivel) => `puntoDeControl_${nivel}`;

export default class PuntoDeControl {
  constructor(escena) {
    this.escena = escena;
    this.clave = clavePuntoDeControl(escena.scene.key);
  }

  guardar() {
    const e = this.escena;
    e.registry.set(this.clave, {
      destruidos: e.destruidos,
      tNivel: e.avance.tNivel,
      puntaje: e.puntaje.total,
      botiquines: e.botiquin.restantes,
      fase: e.fase,
    });
  }

  borrar() {
    this.escena.registry.remove(this.clave);
  }

  // Si el nivel se pidió "reanudar" y hay un punto guardado, lo aplica. Si estaba en la base, la hago aparecer enseguida
  restaurar() {
    const e = this.escena;
    const punto = e.registry.get(this.clave);
    if (!e.scene.settings.data?.reanudar || !punto) return;
    e.destruidos = punto.destruidos;
    e.avance.tNivel = punto.fase === 'avance' ? punto.tNivel : e.cfg.jefeEn ?? punto.tNivel;
    e.registry.set('puntaje', punto.puntaje);
    e.botiquin.restantes = punto.botiquines;
    e.radio.mostrar('Continúas desde el punto de control.', { duracion: 4000 });
  }
}
