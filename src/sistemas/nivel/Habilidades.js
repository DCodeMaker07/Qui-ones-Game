import Phaser from 'phaser';
import { playSfx } from '../audio/audio.js';
import { bombaCayendo } from '../efectos/bomba.js';
import { GOTA, prepararGotaDeAgua } from './agua.js';
import { ambiente } from '../efectos/Ambiente.js';
import { prepararIconoTonel } from './iconos.js';
import {
  AGUA_ESPERA, AGUA_RADIO, BALA_ESC, BOMBA_ESPERA, ESCALA_JUGADOR, ESPERA_DISPARO_MS, RADIO_BOMBA, RAFAGA_ABANICO, RAFAGA_CADA_MS, RAFAGA_ESPERA, RAFAGA_TANDAS, TECLAS,
  TONEL_DURACION, TONEL_ESPERA, ULTI_ESPERA,
} from './constantes.js';

// Mis cuatro habilidades, como en League of Legends:
//   Q  bomba (a tierra, enfriamiento de 3 s)      W  disparo (a aviones, mantengo la tecla)
//   E  ráfaga de balas (enfriamiento de 7 s)      R  bombardeo de fuego, que vive en BombardeoEspecial
//   F  agua: una gota que apaga el fuego de la R (enfriamiento de 8 s)
//   X  tonel: una vuelta completa que esquiva y devuelve las balas enemigas (enfriamiento de 6 s)
// Acá están las teclas, los enfriamientos y las armas. La barra que se ve abajo es BarraHabilidades, que me pregunta el estado.
export default class Habilidades {
  constructor(escena) {
    this.escena = escena;
    this.esperaBomba = 0; // segundos que faltan para poder usar cada una
    this.esperaRafaga = 0;
    this.esperaAgua = 0;
    this.esperaTonel = 0;
    this.enTonel = false; // está dando la vuelta
    this.tonelT = 0; // segundos que lleva la vuelta
    this.ultimoDisparo = 0;
    this.disparando = false;
    this.rafagaActiva = false;

    const kb = escena.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    prepararGotaDeAgua(escena);
    prepararIconoTonel(escena);
    this.teclaDisparo = kb.addKey(K[TECLAS.disparo]);
    kb.addKey(K[TECLAS.bomba]).on('down', () => this.bomba());
    kb.addKey(K[TECLAS.rafaga]).on('down', () => this.rafaga());
    kb.addKey(K[TECLAS.especial]).on('down', () => escena.especial.lanzar());
    kb.addKey(K[TECLAS.agua]).on('down', () => this.agua());
    kb.addKey(K[TECLAS.tonel]).on('down', () => this.tonel());
  }

  // Lo que necesita la barra para dibujar cada habilidad, en orden Q, W, E, R
  estado() {
    const { recarga, activa } = this.escena.especial;
    return [
      { tecla: TECLAS.bomba, restante: this.esperaBomba, espera: BOMBA_ESPERA, activa: false },
      { tecla: TECLAS.disparo, restante: 0, espera: 0, activa: this.disparando },
      { tecla: TECLAS.rafaga, restante: this.esperaRafaga, espera: RAFAGA_ESPERA, activa: this.rafagaActiva },
      { tecla: TECLAS.especial, restante: recarga, espera: ULTI_ESPERA, activa },
      { tecla: TECLAS.agua, restante: this.esperaAgua, espera: AGUA_ESPERA, activa: false },
      { tecla: TECLAS.tonel, restante: this.esperaTonel, espera: TONEL_ESPERA, activa: this.enTonel },
    ];
  }

  actualizar(dt, tiempo) {
    this.esperaBomba = Math.max(0, this.esperaBomba - dt);
    this.esperaRafaga = Math.max(0, this.esperaRafaga - dt);
    this.esperaAgua = Math.max(0, this.esperaAgua - dt);
    this.esperaTonel = Math.max(0, this.esperaTonel - dt);
    if (this.enTonel) {
      this.tonelT += dt;
      if (this.tonelT >= TONEL_DURACION) this.enTonel = false;
    }
    this.disparando = this.teclaDisparo.isDown;
    if (this.disparando && tiempo > this.ultimoDisparo + ESPERA_DISPARO_MS) {
      this.ultimoDisparo = tiempo;
      this.dispararBala();
    }
  }

  puedeUsar() {
    return !this.escena.terminado && !this.escena.pausado;
  }

  // ---------- Q: bomba ----------

  bomba() {
    if (!this.puedeUsar() || this.esperaBomba > 0) return;
    const e = this.escena;
    this.esperaBomba = BOMBA_ESPERA;
    playSfx(e, 'sfx_bomba');
    // La bomba sale grande e inclinada, se pone de punta hacia abajo y se achica al caer. Explota al llegar al suelo
    bombaCayendo(e, e.jugador.x, e.jugador.y + 20 * ESCALA_JUGADOR, { alAterrizar: (x, y) => this.explotarBomba(x, y) });
  }

  explotarBomba(x, y) {
    const e = this.escena;
    e.explosion(x, y, 0.7);
    e.multijugador.quitarMarcasDeBomba(x, y);
    e.objetivos.forEach((o) => {
      if (o.activo && Phaser.Math.Distance.Between(x, y, o.x, o.y) < RADIO_BOMBA + o.radio) {
        o.recibirDano(o.arma ? o.vidaMax / 2 : 1.5); // a una torreta una bomba le quita la mitad de la vida
      }
    });
    e.soldadosEnemigos.explotar(x, y, RADIO_BOMBA); // la bomba mata a los soldados enemigos que alcanza
    // Fuego amigo: las bombas también lastiman a mis soldados cercanos
    [...e.aliados.getChildren()].forEach((a) => {
      if (Phaser.Math.Distance.Between(x, y, a.x, a.y) < 45) e.soldados.recibirDano(a);
    });
  }

  // ---------- W: disparo ----------

  // angulo: en radianes, respecto a donde apunta la nariz (0 sale derecho; los positivos se abren a la derecha de la nariz)
  dispararBala(angulo = 0, conSonido = true) {
    const e = this.escena;
    const j = e.jugador;
    const nariz = 40 * ESCALA_JUGADOR;
    const dir = j.rotation + angulo; // 0 es hacia arriba y crece hacia la derecha
    const bala = e.balasJugador.create(j.x + Math.sin(j.rotation) * nariz, j.y - Math.cos(j.rotation) * nariz, 'bala').setDepth(4).setScale(BALA_ESC).setRotation(dir);
    bala.nivel = e.altura.nivel; // solo le pega a aviones de mi misma altura
    bala.setVelocity(Math.sin(dir) * 520, -Math.cos(dir) * 520);
    if (conSonido) playSfx(e, 'sfx_disparo', { volume: 0.4 });
  }

  // ---------- E: ráfaga ----------

  // Cinco tandas seguidas de tres balas en abanico. Las balas salen de donde esté el avión en cada tanda
  rafaga() {
    if (!this.puedeUsar() || this.esperaRafaga > 0) return;
    const e = this.escena;
    this.esperaRafaga = RAFAGA_ESPERA;
    this.rafagaActiva = true;
    const tanda = () => {
      if (e.terminado) return;
      [-RAFAGA_ABANICO, 0, RAFAGA_ABANICO].forEach((angulo) => this.dispararBala(angulo, angulo === 0));
    };
    e.time.addEvent({ delay: RAFAGA_CADA_MS, repeat: RAFAGA_TANDAS - 1, callback: tanda });
    e.time.delayedCall(RAFAGA_CADA_MS * RAFAGA_TANDAS, () => (this.rafagaActiva = false));
  }

  // ---------- F: agua ----------

  // La gota cae igual que la bomba (0,7 s) y al llegar apaga el fuego que haya dentro del radio del chapuzón
  agua() {
    if (!this.puedeUsar() || this.esperaAgua > 0) return;
    const e = this.escena;
    this.esperaAgua = AGUA_ESPERA;
    bombaCayendo(e, e.jugador.x, e.jugador.y + 20 * ESCALA_JUGADOR, { textura: GOTA, alAterrizar: (x, y) => e.especial.apagar(x, y, AGUA_RADIO) });
  }

  // ---------- X: tonel ----------

  // El avión da una vuelta sobre su eje en TONEL_DURACION s. Mientras gira no recibe daño (le pongo la invulnerabilidad),
  // LevelScene le devuelve las balas enemigas que lo tocan y le suma un salto hacia donde me muevo
  tonel() {
    if (!this.puedeUsar() || this.esperaTonel > 0 || this.enTonel) return;
    const e = this.escena;
    this.esperaTonel = TONEL_ESPERA;
    this.enTonel = true;
    this.tonelT = 0;
    e.invulnerableHasta = Math.max(e.invulnerableHasta, e.time.now + TONEL_DURACION * 1000 + 100);
    ambiente.pulso('#7fe8ff', 500, 1);
  }

  // Qué tan ancho se ve el avión durante la vuelta: 1 normal, 0 de canto y -1 de espaldas (de lado a lado, como vuelta vista desde arriba)
  get escalaTonel() {
    return this.enTonel ? Math.cos((this.tonelT / TONEL_DURACION) * Math.PI * 2) : 1;
  }
}
