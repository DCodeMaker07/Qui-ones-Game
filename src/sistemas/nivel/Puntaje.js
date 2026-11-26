import { CAPA, TXT, estiloHud } from '../../ui/tema.js';
import { PUNTOS } from './constantes.js';

// El puntaje de la partida. Se guarda en el registro del juego para que pase de un nivel al otro ('puntaje'). Cada nivel recuerda
// con cuántos puntos empezó ('puntajeBase_<nivel>'), así si pierdo y reinicio el nivel vuelvo al puntaje con el que había entrado.
// Al empezar una partida nueva hay que llamar a reiniciarPuntaje() (lo hace DniScene).
// Lo que suma y resta está en PUNTOS (constantes.js). Quién desbloquea el final alternativo es Picada.js.
export function reiniciarPuntaje(registro) {
  registro.set('puntaje', 0);
  registro.set('finalMalo', false);
  Object.keys(registro.getAll())
    .filter((clave) => clave.startsWith('puntajeBase_') || clave.startsWith('puntoDeControl_'))
    .forEach((clave) => registro.remove(clave));
}

export default class Puntaje {
  constructor(escena) {
    this.escena = escena;
    const registro = escena.registry;
    const clave = `puntajeBase_${escena.scene.key}`;
    const atajo = escena.scene.settings.data?.puntaje; // el menú master puede arrancar el nivel con un puntaje dado
    const base = atajo ?? registro.get(clave) ?? registro.get('puntaje') ?? 0;
    registro.set(clave, base);
    registro.set('puntaje', base);
  }

  get total() {
    return this.escena.registry.get('puntaje') ?? 0;
  }

  // Suma (o resta, si es negativo) y, si le paso una posición, muestra el número flotando ahí
  sumar(puntos, x, y) {
    this.escena.registry.set('puntaje', Math.max(0, this.total + puntos));
    if (x !== undefined) this.flotar(puntos, x, y);
  }

  // Lo que me llevo al terminar un nivel: un bono fijo y otro por cada vida que me queda
  bonoDeNivel() {
    const e = this.escena;
    const bono = PUNTOS.bonoNivel + PUNTOS.bonoVida * Math.max(0, e.vida);
    this.sumar(bono, e.scale.width / 2, 300);
    return bono;
  }

  flotar(puntos, x, y) {
    const e = this.escena;
    const texto = e.add
      .text(x, y, `${puntos > 0 ? '+' : ''}${puntos}`, estiloHud(22, { color: puntos > 0 ? TXT.dorado : TXT.rojo }))
      .setOrigin(0.5)
      .setDepth(CAPA.hud + 1);
    e.tweens.add({ targets: texto, y: y - 50, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => texto.destroy() });
  }
}
