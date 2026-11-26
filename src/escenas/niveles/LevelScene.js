import Phaser from 'phaser';
import { ESCALA, GAME } from '../../config.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { playSfx } from '../../sistemas/audio/audio.js';
import { volMusica } from '../../sistemas/audio/ajustes.js';
import Aliados from '../../sistemas/nivel/Aliados.js';
import Altura from '../../sistemas/nivel/Altura.js';
import Avance from '../../sistemas/nivel/Avance.js';
import Barreras from '../../sistemas/nivel/Barreras.js';
import BaseEnemiga from '../../sistemas/nivel/BaseEnemiga.js';
import BombardeoEspecial from '../../sistemas/nivel/BombardeoEspecial.js';
import Caidos from '../../sistemas/nivel/Caidos.js';
import Botiquines from '../../sistemas/nivel/Botiquines.js';
import Enemigos from '../../sistemas/nivel/Enemigos.js';
import GuiaBomba from '../../sistemas/nivel/GuiaBomba.js';
import Habilidades from '../../sistemas/nivel/Habilidades.js';
import Hud from '../../ui/nivel/Hud.js';
import MenuPausa from '../../ui/nivel/MenuPausa.js';
import Multijugador from '../../sistemas/nivel/Multijugador.js';
import Picada from '../../sistemas/nivel/Picada.js';
import PuntoDeControl from '../../sistemas/nivel/PuntoDeControl.js';
import Puntaje from '../../sistemas/nivel/Puntaje.js';
import Radio from '../../ui/nivel/Radio.js';
import SoldadosEnemigos from '../../sistemas/nivel/SoldadosEnemigos.js';
import { BALA_ESC, ESCALA_JUGADOR, GIRO_JUGADOR, PUNTOS, TECLAS, TONEL_SALTO, VELOCIDAD_JUGADOR, VIDA_JUGADOR } from '../../sistemas/nivel/constantes.js';

// La escena base de los niveles (shooter vertical con scroll). Cada nivel solo pasa su configuración (ver Level1Scene,
// Level2Scene y Level3Scene). Acá dejo lo central: el jugador, los controles, las colisiones, el daño y el bucle principal.
// Todo lo demás lo separé en módulos que viven en src/sistemas/nivel/ (la lógica) y src/ui/nivel/ (lo que se ve), que yo voy llamando desde acá:
//   Hud, Radio, MenuPausa          lo que se ve (marcador, panel de Layla, pausa)
//   Avance, BaseEnemiga, Picada    cómo avanza el mapa, la base del final y la picada
//   Aliados, Botiquines, Enemigos  los que pelean y ayudan
//   Habilidades, Altura, GuiaBomba mis habilidades Q, W, E, R, F, la altura de vuelo y la guía de la bomba
//   BombardeoEspecial              la R, el bombardeo de fuego
//   Multijugador                   mi lado cuando juego con Layla
//
// Controles: las flechas mueven. Q suelta una bomba (a tierra, enfría 3 s), W dispara (a aviones), E es la ráfaga, R el
// bombardeo especial y F el agua. ESPACIO sube de altura y C baja. T habla por radio, B pide botiquín, ENTER se lanza en picada
// (solo en el final) y ESC o P pausan.
export default class LevelScene extends Phaser.Scene {
  constructor(key, cfg) {
    super(key);
    this.cfg = cfg;
  }

  create() {
    const { width, height } = this.scale;
    this.iniciarEstado();
    this.cameras.main.fadeIn(350, 0, 0, 0); // entro desde negro, por ejemplo después del despegue

    this.fondo = this.add.tileSprite(0, 0, width, height, this.cfg.terreno).setOrigin(0).setDepth(0);
    this.enemigos = this.physics.add.group();
    this.balasJugador = this.physics.add.group();
    this.balasEnemigas = this.physics.add.group(); // las de los aviones: solo lastiman a mi avión
    this.balasTierra = this.physics.add.group(); // las de torretas y soldados enemigos: solo lastiman a mis soldados
    this.aliados = this.physics.add.group();

    this.crearJugador();
    this.altura = new Altura(this);
    this.crearModulos();
    this.crearControles();
    this.configurarColisiones();
    this.programarSpawns();
    if (this.scene.settings.data?.probarPicada) this.time.delayedCall(800, () => this.picada.prepararPrueba()); // atajo del menú master

    this.iniciarMusica();
    this.events.once('shutdown', () => this.limpiar());
  }

  iniciarEstado() {
    this.vida = VIDA_JUGADOR;
    this.destruidos = 0;
    this.terminado = false;
    this.pausado = false;
    this.invulnerableHasta = 0;
    this.depositoCreado = false;
    this.objetivos = [];
    this.idRed = 0;
    this.velTerreno = GAME.scrollSpeed; // baja a 0 cuando el mapa se frena
    this.fase = 'avance'; // 'avance', luego 'base' (pantalla fija) y por último 'refuerzos' (llegan los aliados)
    this.baseObj = null;
    // Multijugador: yo soy el piloto. Con Layla de estratega las torretas y la base aparecen mucho más arriba, así ella las ve venir
    const red = this.game.red;
    this.multi = this.registry.get('multi') === true && !!red?.activa && red.rol === 'piloto';
    this.yNido = this.multi ? -480 : -80;
    this.baseY0 = this.multi ? -480 : -130;
  }

  // El orden importa: el HUD va al final porque al crearse lee el estado de los demás módulos
  crearModulos() {
    this.radio = new Radio(this);
    this.avance = new Avance(this);
    this.baseEnemiga = new BaseEnemiga(this);
    this.botiquin = new Botiquines(this);
    this.soldados = new Aliados(this);
    this.soldadosEnemigos = new SoldadosEnemigos(this);
    this.caidos = new Caidos(this);
    this.barreras = new Barreras(this);
    this.aviones = new Enemigos(this);
    this.especial = new BombardeoEspecial(this);
    this.habilidades = new Habilidades(this);
    this.guiaBomba = new GuiaBomba(this);
    this.picada = new Picada(this);
    this.multijugador = new Multijugador(this);
    this.menuPausa = new MenuPausa(this);
    this.puntaje = new Puntaje(this);
    this.puntoDeControl = new PuntoDeControl(this);
    this.puntoDeControl.restaurar(); // si vengo de "Continuar desde el punto", retomo el avance guardado
    this.hud = new Hud(this);
    if (this.registry.get('invencible')) this.hud.etiquetaPrueba('MODO PRUEBA: AVIÓN INVENCIBLE');
  }

  crearJugador() {
    const { width, height } = this.scale;
    this.jugador = this.physics.add.sprite(width / 2, height - 120, 'avion_jugador').setDepth(5);
    this.jugador.play('nave_vuelo'); // la hélice ya viene animada en la hoja
    this.jugador.setScale(ESCALA_JUGADOR);
    this.jugador.setCollideWorldBounds(true);
    // El cuerpo de choque es un círculo más chico que el dibujo, así que el avión es justo con las balas. Va en píxeles del sprite
    // sin escalar y Phaser lo escala solo
    const r = 22;
    this.jugador.body.setCircle(r, this.jugador.width / 2 - r, this.jugador.height / 2 - r);
  }

  crearControles() {
    const kb = this.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.cursores = kb.createCursorKeys(); // las letras Q, W, E y R las maneja Habilidades
    kb.addKey(K[TECLAS.radio]).on('down', () => this.usarRadio());
    kb.addKey(K.ENTER).on('down', () => this.picada.iniciar());
    kb.addKey(K[TECLAS.botiquin]).on('down', () => this.botiquin.pedir());
  }

  // Con Layla humana hablo con ella; si no, la radio es la asistente automática
  usarRadio() {
    if (this.terminado || this.pausado) return;
    if (this.multijugador.hayLayla()) this.multijugador.hablarPorRadio();
    else this.radio.hablarPorVoz();
  }

  configurarColisiones() {
    // Los aviones solo se tocan si van a la misma altura (ver Altura.js): el cuarto argumento decide si el choque cuenta
    this.physics.add.overlap(
      this.balasJugador, this.enemigos,
      (bala, avion) => {
        bala.destroy();
        this.aviones.recibirDano(avion, 1);
      },
      (bala, avion) => bala.nivel === avion.nivel
    );
    this.physics.add.overlap(
      this.jugador, this.balasEnemigas,
      (_j, bala) => {
        if (this.habilidades.enTonel) return this.devolverBala(bala); // durante el tonel las balas rebotan
        bala.destroy();
        this.danoJugador();
      },
      (_j, bala) => bala.nivel === this.altura.nivel
    );
    this.physics.add.overlap(this.aliados, this.balasTierra, (soldado, bala) => {
      bala.destroy();
      this.soldados.recibirDano(soldado);
    });
    this.physics.add.overlap(
      this.jugador, this.enemigos,
      (_j, avion) => {
        this.explosion(avion.x, avion.y);
        if (this.habilidades.enTonel) this.puntaje.sumar(PUNTOS.avion, avion.x, avion.y); // girando no me hace daño y el choque lo destruye
        avion.destroy();
        this.danoJugador();
      },
      (_j, avion) => avion.nivel === this.altura.nivel
    );
  }

  // Las torretas y la base no salen por tiempo sino por distancia recorrida (ver Avance y BaseEnemiga) y los aviones enemigos vienen
  // en oleadas (ver Enemigos). Acá solo programo los soldados aliados
  programarSpawns() {
    this.time.addEvent({ delay: this.cfg.cadaEscuadra * 1000, loop: true, callback: () => this.soldados.crearEscuadra() });
  }

  iniciarMusica() {
    const { musica, musicaInicio = 0, ganancia = 1 } = this.cfg;
    if (!musica || !this.cache.audio.exists(musica)) return;
    // Que haya una sola música de nivel: si quedó algún sonido viejo con la misma clave (reinicio, salto desde el menú master) lo borro
    this.sound.getAll(musica).forEach((m) => m.destroy());
    const volumen = volMusica() * ganancia;
    if (!musicaInicio) return void this.sound.play(musica, { loop: true, volume: volumen });
    // Empiezo en el segundo musicaInicio y, al repetirse, vuelvo a ese punto y no al 0: uso un marcador que va de ahí hasta el final
    const pista = this.sound.add(musica);
    pista.addMarker({ name: 'nivel', start: musicaInicio, duration: pista.duration - musicaInicio, config: { loop: true, volume: volumen } });
    pista.play('nivel');
  }

  // Al salir deshago todo lo que dejé pausado, porque esos sistemas siguen vivos entre escenas
  limpiar() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    ambiente.peligro(false);
    this.multijugador.avisarPausa(false);
    this.sound.stopAll();
    window.speechSynthesis?.cancel();
  }

  // ---------- utilidades que usan varios módulos ----------

  nuevoId() {
    return ++this.idRed;
  }

  // Una X al azar dentro de una franja central de 900 px como máximo, para que no queden muy dispersos en pantallas anchas
  xAleatorio(margen) {
    const { width } = this.scale;
    const zona = Math.min(width - margen * 2, 900);
    return Phaser.Math.Between(width / 2 - zona / 2, width / 2 + zona / 2);
  }

  explosion(x, y, k = 1) {
    const e = this.add.sprite(x, y, 'explosion').setDepth(8).setScale(ESCALA.explosion * k);
    e.play('explotar');
    e.once('animationcomplete', () => e.destroy());
    this.tweens.add({ targets: e, y: y + this.velTerreno * 0.6, duration: 700 }); // el humo se queda en el terreno y baja con él
    playSfx(this, 'sfx_explosion');
    ambiente.pulso('#ffa23a', 260, 0);
  }

  // Las torretas (Objetivo.js) y los soldados enemigos me piden esto cuando quieren disparar: son balas de tierra
  dispararEnemigo(x, y, angulo) {
    this.aviones.disparar(x, y, angulo, 'tierra');
  }

  // ---------- daño y final del nivel ----------

  danoJugador() {
    if (this.terminado || this.time.now < this.invulnerableHasta) return;
    if (this.registry.get('invencible')) return; // casilla de prueba de la sala
    this.vida--;
    this.hud.flashDano();
    ambiente.pulso('#ff2a2a', 450, 1);
    this.invulnerableHasta = this.time.now + 1500;

    if (this.vida <= 0) return this.derrota();
    if (this.vida === 1) {
      this.jugador.play('nave_danada'); // sprite dañado con la última vida
      ambiente.peligro(true);
    }
    this.tweens.add({ targets: this.jugador, alpha: 0.3, duration: 100, yoyo: true, repeat: 6, onComplete: () => this.jugador.setAlpha(1) });
  }

  alDestruirObjetivo(o) {
    this.explosion(o.x, o.y, o.jefe ? 1.8 : 1.2);
    this.destruidos++;
    this.puntaje.sumar(o.jefe ? PUNTOS.base : PUNTOS.nido, o.x, o.y);
    ambiente.pulso('#ffd35a', 700, 0);
    const gana = o.jefe || (this.cfg.meta && this.destruidos >= this.cfg.meta);
    if (gana) this.terminarNivel();
  }

  // Si el depósito se me escapa sin destruirlo, vuelve a aparecer
  alPerderObjetivo(o) {
    if (o.jefe && !this.terminado) {
      this.depositoCreado = false;
      this.time.delayedCall(3000, () => this.baseEnemiga.crearDeposito());
    }
  }

  terminarNivel() {
    this.puntaje.bonoDeNivel(); // antes de marcar el nivel como terminado, para que cuente las vidas que me quedan
    this.puntoDeControl.borrar();
    this.terminado = true;
    this.physics.pause();
    this.time.delayedCall(1500, () => this.scene.start('CutsceneScene', { id: this.cfg.escenaFinal }));
  }

  derrota() {
    this.terminado = true;
    this.physics.pause();
    this.explosion(this.jugador.x, this.jugador.y, 1.5);
    this.jugador.setVisible(false);
    this.time.delayedCall(1500, () => this.scene.start('EndScene', { victoria: false, nivel: this.scene.key }));
  }

  // ---------- bucle principal ----------

  update(time, delta) {
    const dt = delta / 1000;
    if (this.picada.activa && !this.pausado) this.guiaBomba.dibujarPicada(dt); // la picada congela el nivel pero la guía sigue al avión
    if (this.terminado || this.pausado) return;

    this.avance.actualizar(dt);
    this.baseEnemiga.actualizar(dt);
    this.picada.vigilar();
    this.moverJugador(dt);
    this.altura.actualizar(dt);
    this.guiaBomba.dibujar(dt);
    this.multijugador.actualizarMarcas(dt);
    this.especial.actualizar(dt);
    this.multijugador.enviarEstado(dt);
    this.habilidades.actualizar(dt, time);

    // Las torretas les disparan a mis soldados, no a mi avión (avión contra avión, soldados contra torretas y soldados)
    const blancos = this.aliados.getChildren();
    this.objetivos.forEach((o) => o.update(delta, blancos));
    this.objetivos = this.objetivos.filter((o) => o.activo);

    this.soldados.actualizar(dt);
    this.soldadosEnemigos.actualizar(dt);
    this.caidos.actualizar(dt);
    this.barreras.actualizar(dt);
    this.botiquin.actualizar(dt);
    this.aviones.actualizar(delta);
    this.limpiarBalas();
    this.hud.actualizar();
  }

  moverJugador(dt) {
    const v = VELOCIDAD_JUGADOR;
    const izq = this.cursores.left.isDown;
    const der = this.cursores.right.isDown;
    const arr = this.cursores.up.isDown;
    const aba = this.cursores.down.isDown;
    this.jugador.setVelocity((der - izq) * v, (aba - arr) * v);
    if (this.jugador.body.velocity.lengthSq() > v * v) this.jugador.body.velocity.normalize().scale(v); // en diagonal no voy más rápido
    if (this.habilidades.enTonel) this.saltoDelTonel();
    this.orientarJugador(dt);
  }

  // El tonel da un empujón extra hacia donde me muevo (o hacia donde apunta la nariz si estoy quieto)
  saltoDelTonel() {
    const cuerpo = this.jugador.body;
    let dx = cuerpo.velocity.x;
    let dy = cuerpo.velocity.y;
    if (dx === 0 && dy === 0) {
      dx = Math.sin(this.jugador.rotation);
      dy = -Math.cos(this.jugador.rotation);
    }
    const largo = Math.hypot(dx, dy);
    cuerpo.velocity.x += (dx / largo) * TONEL_SALTO;
    cuerpo.velocity.y += (dy / largo) * TONEL_SALTO;
  }

  // Una bala enemiga que me toca durante el tonel sale rebotada con la velocidad invertida, y ahora es mía: puede pegarles a los aviones
  devolverBala(bala) {
    const vx = -bala.body.velocity.x * 1.5;
    const vy = -bala.body.velocity.y * 1.5;
    const devuelta = this.balasJugador.create(bala.x, bala.y, 'bala').setDepth(4).setScale(BALA_ESC).setTint(0x7fe8ff).setRotation(Math.atan2(vx, -vy));
    devuelta.nivel = bala.nivel; // la altura del avión que la disparó: así le puede pegar a él
    devuelta.setVelocity(vx, vy);
    bala.destroy();
  }

  // El avión apunta hacia donde me muevo, en las ocho direcciones: a la derecha o a la izquierda mira de lado, hacia abajo mira
  // hacia atrás y en las diagonales (noreste, noroeste, sureste y suroeste) a 45°. Gira rápido pero no de golpe. Si me quedo
  // quieto conserva el último rumbo. Las balas salen hacia donde apunta la nariz (ver Habilidades.js)
  orientarJugador(dt) {
    const { x: vx, y: vy } = this.jugador.body.velocity;
    if (vx === 0 && vy === 0) return;
    const rumbo = Math.atan2(vx, -vy); // 0 es hacia arriba y crece hacia la derecha
    this.jugador.rotation = Phaser.Math.Angle.RotateTo(this.jugador.rotation, rumbo, GIRO_JUGADOR * dt);
  }

  // Borro las balas que ya salieron de la pantalla
  limpiarBalas() {
    const { width, height } = this.scale;
    [...this.balasJugador.getChildren()].forEach((b) => (b.y < -20 || b.y > height + 20 || b.x < -20 || b.x > width + 20) && b.destroy()); // ahora disparan hacia donde apunta el avión
    [...this.balasEnemigas.getChildren(), ...this.balasTierra.getChildren()].forEach((b) => {
      if (b.y > height + 20 || b.y < -20 || b.x < -20 || b.x > width + 20) b.destroy();
    });
  }
}
