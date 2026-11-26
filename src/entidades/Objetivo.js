import Phaser from 'phaser';
import { ARMA_ORIGEN } from '../config.js';

// Objetivo terrestre: nido de ametralladora (base + arma que gira y dispara)
// o depósito de suministros (jefe del Nivel 2, sin arma).
// Se mueve con el scroll del terreno para verse "pegado" al suelo.
// La quemadura de una torreta es permanente (no se apaga) y progresiva: empieza suave y cada segundo quema más, hasta un máximo
const QUEMA_DPS_INICIAL = 0.15; // vida por segundo al prenderse
const QUEMA_RAMPA = 0.06; // cuánto sube ese daño cada segundo que lleva quemándose
const QUEMA_DPS_MAX = 0.6;

export default class Objetivo {
  static siguienteId = 1; // identificador de red: Layla elige a cuál atacan los soldados

  constructor(scene, x, y, opts = {}) {
    this.id = Objetivo.siguienteId++;
    const { base = 'nido_base', arma = 'nido_arma', vida = 3, radio = 34, jefe = false, escala = 1, vidaMinima = 0 } = opts;
    this.scene = scene;
    this.vida = vida;
    this.vidaMax = vida;
    this.vidaMinima = vidaMinima; // si es > 0, la vida no baja de ahí: el objetivo no se puede destruir por daño normal
    this.quemando = false; // a mitad de vida (o al tocar el fuego de la R) la torreta se incendia y sigue perdiendo vida
    this.tiempoQuema = 0; // segundos que lleva quemándose
    this.radio = radio; // radio de impacto de las bombas, en píxeles de pantalla
    this.jefe = jefe;
    this.activo = true;
    this.alcance = 420;
    this.cooldown = Phaser.Math.Between(600, 1500);

    this.base = scene.add.image(x, y, base).setDepth(1).setScale(escala);
    this.arma = arma
      ? scene.add.image(x, y, arma).setDepth(1.1).setScale(escala).setOrigin(ARMA_ORIGEN.x, ARMA_ORIGEN.y)
      : null;
    // Barra de vida sobre el objetivo. Se dibuja solo en la pantalla del piloto (Layla no la ve en su mapa).
    this.barra = scene.add.graphics().setDepth(4);
    this.fuego = scene.add.graphics().setDepth(4.2);
    this.anchoBarra = jefe ? 110 : 56;
    this.altoBarra = jefe ? 9 : 7;
    this.alturaBarra = this.base.displayHeight / 2 + 12;
    // Distancia del pivote a la punta del cañón: de ahí salen las balas.
    this.largoCanon = this.arma ? this.arma.height * ARMA_ORIGEN.y * escala : 0;
  }

  get x() {
    return this.base.x;
  }

  get y() {
    return this.base.y;
  }

  // blancos: jugador y soldados aliados; dispara al más cercano dentro del alcance.
  update(delta, blancos) {
    if (!this.activo) return;

    const dy = (this.scene.velTerreno * delta) / 1000; // 0 cuando la pantalla está fija (base del Nivel 2)
    this.base.y += dy;
    if (this.arma) this.arma.y += dy;

    if (this.base.y > this.scene.scale.height + 150) {
      this.retirar();
      this.scene.alPerderObjetivo(this);
      return;
    }

    this.dibujarBarra();
    this.dibujarFuego();
    if (this.quemando) {
      this.tiempoQuema += delta / 1000;
      const dps = Math.min(QUEMA_DPS_MAX, QUEMA_DPS_INICIAL + QUEMA_RAMPA * this.tiempoQuema);
      if (this.danoSuave((dps * delta) / 1000)) return; // se consumió
    }

    if (!this.arma || this.base.y < 0) return;

    let blanco = null;
    let mejor = this.alcance;
    for (const b of blancos) {
      if (!b.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y);
      if (d < mejor) {
        mejor = d;
        blanco = b;
      }
    }
    if (!blanco) return;

    const ang = Phaser.Math.Angle.Between(this.x, this.y, blanco.x, blanco.y);
    this.arma.rotation = ang + Math.PI / 2; // el sprite del arma apunta hacia arriba
    this.cooldown -= delta;
    if (this.cooldown <= 0) {
      this.cooldown = 1400;
      this.scene.dispararEnemigo(this.x + Math.cos(ang) * this.largoCanon, this.y + Math.sin(ang) * this.largoCanon, ang);
    }
  }

  // Barra de vida: verde, amarilla (menos del 60 %) y roja (menos del 30 %). No se muestra hasta que entra en pantalla.
  dibujarBarra() {
    const g = this.barra;
    g.clear();
    if (this.base.y < 10) return;
    const w = this.anchoBarra;
    const h = this.altoBarra;
    const x = this.x - w / 2;
    const y = this.y - this.alturaBarra - h;
    const p = Phaser.Math.Clamp(this.vida / this.vidaMax, 0, 1);
    g.fillStyle(0x000000, 0.65).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
    if (p <= 0) return;
    g.fillStyle(p > 0.6 ? 0x5cff7a : p > 0.3 ? 0xffc83d : 0xff4a3d, 1).fillRoundedRect(x, y, w * p, h, Math.min(3, (w * p) / 2));
  }

  // Con el sprite de llama (assets/sprites/armas/llama.png) se colocan 3 llamas animadas sobre la torreta; si no existe, se dibujan
  // llamas por código en dibujarFuego. El humo siempre se dibuja por código.
  crearLlamas() {
    const s = this.scene;
    if (!s.textures.exists('llama')) return;
    if (!s.anims.exists('llama')) s.anims.create({ key: 'llama', frames: s.anims.generateFrameNumbers('llama'), frameRate: 12, repeat: -1 });
    const n = s.anims.get('llama').frames.length;
    this.llamas = [[-14, 4, 0.29], [11, 0, 0.36], [-1, -10, 0.33]].map(([dx, dy, k]) => {
      const l = s.add.sprite(this.x + dx, this.y + dy, 'llama').setOrigin(0.5, 1).setScale(k).setDepth(4.3);
      l.dx = dx;
      l.dy = dy;
      l.escalaBase = k;
      l.play({ key: 'llama', startFrame: Phaser.Math.Between(0, n - 1) });
      return l;
    });
  }

  // Llamas y humo sobre la torreta incendiada
  dibujarFuego() {
    const g = this.fuego;
    g.clear();
    const visible = this.quemando && this.base.y >= 0;
    const crece = 1 + Math.min(0.6, this.tiempoQuema / 10); // las llamas crecen a medida que la quemadura se hace más fuerte
    this.llamas?.forEach((l) => l.setVisible(visible).setPosition(this.x + l.dx, this.y + l.dy).setScale(l.escalaBase * crece));
    if (!visible) return;
    const t = this.scene.time.now / 1000;
    for (let k = 0; k < (this.llamas ? 0 : 5); k++) {
      const fase = t * 5 + k * 1.9 + this.id;
      const ciclo = (fase % 1.6) / 1.6; // 0 → 1: la llama nace, sube y se apaga
      const r = (1 - ciclo) * 9 + 2;
      g.fillStyle(ciclo < 0.35 ? 0xffd35a : ciclo < 0.7 ? 0xff7a1a : 0xcc2a10, 0.9 * (1 - ciclo * 0.6));
      g.fillCircle(this.x + Math.sin(fase * 1.7 + k) * 16, this.y - 6 - ciclo * 40, r);
    }
    for (let k = 0; k < 3; k++) {
      const ciclo = (t * 0.7 + k / 3 + this.id * 0.13) % 1;
      g.fillStyle(0x222222, 0.35 * (1 - ciclo)).fillCircle(this.x + Math.sin(t + k * 2) * 10, this.y - 24 - ciclo * 60, 7 + ciclo * 10);
    }
  }

  // Solo las torretas se incendian, no el depósito. Una vez prendida ya no se apaga
  incendiar() {
    if (this.quemando || !this.arma || !this.activo) return;
    this.quemando = true;
    this.crearLlamas();
  }

  // A mitad de vida la torreta se incendia sola
  revisarFuego() {
    if (this.vida <= this.vidaMax / 2) this.incendiar();
  }

  // Devuelve true si el objetivo fue destruido.
  recibirDano(n) {
    this.vida -= n;
    if (this.vidaMinima > 0 && this.vida < this.vidaMinima) this.vida = this.vidaMinima;
    if (this.vida <= 0) {
      this.retirar();
      this.scene.alDestruirObjetivo(this);
      return true;
    }
    this.revisarFuego();
    this.base.setTint(0xff9999);
    this.scene.time.delayedCall(120, () => this.activo && this.base.clearTint());
    return false;
  }

  // Daño continuo (por ejemplo, de los soldados aliados): sin destello ni redondeo.
  danoSuave(n) {
    if (!this.activo) return false;
    this.vida -= n;
    if (this.vidaMinima > 0 && this.vida < this.vidaMinima) this.vida = this.vidaMinima;
    if (this.vida <= 0) {
      this.retirar();
      this.scene.alDestruirObjetivo(this);
      return true;
    }
    this.revisarFuego();
    return false;
  }

  retirar() {
    this.activo = false;
    this.base.destroy();
    this.arma?.destroy();
    this.barra.destroy();
    this.fuego.destroy();
    this.llamas?.forEach((l) => l.destroy());
  }
}
