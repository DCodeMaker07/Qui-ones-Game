import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { crearHangar, crearMangaDeViento, crearPlataforma, crearTorre, crearUmbral, PISTA, prepararPista } from '../../sistemas/efectos/aerodromo.js';
import { detenerPista } from '../../sistemas/audio/pistas.js';
import { marcoRedondeado } from '../../ui/dibujo.js';
import { ESCALA_JUGADOR } from '../../sistemas/nivel/constantes.js';
import { COLOR, FUENTE, TXT, estiloHud } from '../../ui/tema.js';

// La escena de antes del Nivel 1: el avión de Quiñones despega de la pista del aeródromo, con la torre de control a un costado, y sale
// hacia la batalla. Primero lo dejo esperando con el motor encendido, después lo hago acelerar mientras la pista y el terreno se mueven
// cada vez más rápido, y por último despega. Al terminar dejo la velocidad del terreno igual a la del nivel, así el corte al Nivel 1
// casi no se nota (el avión empieza en el mismo lugar, abajo al centro).
//
// Hice dos versiones. La principal es en 3D con Three.js (sistemas/three/DespegueTresD.js), que cargo recién acá. Si Three.js no está
// instalado (pnpm add three) o el navegador no puede crear el contexto 3D, uso la versión en 2D que viene más abajo, que se ve desde
// arriba, igual que el juego. Las dos comparten la línea de tiempo, el mensaje de la torre, la música y las bandas negras.
const AVION = { x: 640, y: 600 }; // donde empieza el avión en el Nivel 1
const LARGO_PISTA = 1500;
const ESCALA_SUELO = ESCALA_JUGADOR * 0.75; // en tierra lo dibujo más chico y al volar llega a su tamaño del juego
const BANDA = 56; // bandas negras de cine
const DURACION = 8.4;
const TEXTO_TORRE = 'Torre a Quiñones: pista libre. Autorizado para despegar.';

export default class DespegueScene extends Phaser.Scene {
  constructor() {
    super('DespegueScene');
  }

  create() {
    this.t = 0;
    this.distancia = 0;
    this.polvo = 0;
    this.saliendo = false;
    this.modo = 'cargando'; // pasa a '3d' o '2d' en cuanto sé cuál usar; mientras tanto el tiempo no corre
    this.tres = null;
    this.bloqueoHasta = performance.now() + 1200; // el ENTER con el que terminé la escena anterior no debe saltar esto

    this.crearBandas();
    ['ENTER', 'SPACE', 'ESC'].forEach((tecla) => this.input.keyboard.on(`keydown-${tecla}`, () => performance.now() > this.bloqueoHasta && this.salir()));
    this.events.once('shutdown', () => this.tres?.destruir());
    this.elegirVersion();
  }

  // Intento cargar la versión en 3D. Si falla (Three.js no instalado, sin WebGL...) uso la de 2D
  elegirVersion() {
    import('../../sistemas/three/DespegueTresD.js')
      .then(({ default: DespegueTresD }) => {
        if (this.saliendo) return;
        this.tres = new DespegueTresD(this);
        this.empezar('3d');
      })
      .catch((error) => {
        console.warn('No pude usar Three.js, uso el despegue en 2D:', error);
        if (this.saliendo) return;
        this.crear2D();
        this.empezar('2d');
      });
  }

  // Ya sé qué versión se ve: de acá en adelante corre el tiempo y salen el mensaje de la torre y el cambio de música
  empezar(modo) {
    this.modo = modo;
    this.time.delayedCall(600, () => this.mostrarRadio(TEXTO_TORRE, 3400));
    this.time.delayedCall(5000, () => detenerPista(this, 'musica_dialogo', 3000)); // el nivel pone su propia música
  }

  // La versión en 2D: armo el terreno, la pista, la torre y el avión, todo visto desde arriba
  crear2D() {
    const { width, height } = this.scale;
    prepararPista(this);
    this.terreno = this.add.tileSprite(0, 0, width, height, 'terreno_1').setOrigin(0).setDepth(0);
    this.suelo = this.add.container(0, 0).setDepth(1); // acá meto todo lo que baja con el terreno cuando el avión acelera
    this.crearAerodromo();
    this.crearAvion();
  }

  // Armo la pista con su umbral, la plataforma con la torre de control, el hangar y los aviones estacionados, y la manga de viento
  crearAerodromo() {
    const pista = this.add.tileSprite(640, 720 - LARGO_PISTA / 2, 240, LARGO_PISTA, PISTA).setTileScale(1.5);
    const estacionado = (x, y, angulo) => {
      const sombra = this.add.sprite(x + 9, y + 13, 'avion_jugador', 0).setScale(0.7).setAngle(angulo).setTint(0x000000).setAlpha(0.25);
      const avion = this.add.sprite(x, y, 'avion_jugador', 0).setScale(0.7).setAngle(angulo).setTint(0xcfd4dc);
      return [sombra, avion];
    };
    this.suelo.add([
      pista,
      crearUmbral(this, 640, 650, 200),
      crearPlataforma(this, 330, 500, 360, 300),
      crearHangar(this, 270, 410),
      ...estacionado(300, 535, 12),
      ...estacionado(205, 560, -8),
      crearTorre(this, 445, 585).setScale(1.25),
      crearMangaDeViento(this, 850, 520).setScale(1.6),
    ]);
  }

  crearAvion() {
    this.sombra = this.add.sprite(AVION.x, AVION.y, 'avion_jugador').setTint(0x000000).setAlpha(0.3).setDepth(3);
    this.avion = this.add.sprite(AVION.x, AVION.y, 'avion_jugador').setDepth(4);
    [this.sombra, this.avion].forEach((s) => s.play('nave_vuelo'));
    this.ponerAltura(0);
  }

  // altura: 0 en tierra y 1 en el aire. Con la altura cambio el tamaño del avión y la distancia de su sombra
  ponerAltura(altura) {
    const escala = ESCALA_SUELO + (ESCALA_JUGADOR - ESCALA_SUELO) * altura;
    this.avion.setScale(escala);
    this.sombra.setScale(escala * 1.02).setPosition(this.avion.x + 3 + altura * 16, this.avion.y + 4 + altura * 24);
  }

  crearBandas() {
    const { width, height } = this.scale;
    const arriba = this.add.rectangle(0, 0, width, 0, 0x000000).setOrigin(0).setDepth(40);
    const abajo = this.add.rectangle(0, height, width, 0, 0x000000).setOrigin(0, 1).setDepth(40);
    this.tweens.add({ targets: [arriba, abajo], height: BANDA, duration: 600, ease: 'Cubic.easeOut' });
    const aviso = this.add.text(width - 24, BANDA / 2, 'ENTER: SALTAR', estiloHud(12, { color: TXT.grisOscuro, fontStyle: 'bold', letterSpacing: 3 })).setOrigin(1, 0.5).setDepth(41).setAlpha(0);
    this.tweens.add({ targets: aviso, alpha: 0.6, duration: 600, delay: 2000 });
  }

  // Muestro el mensaje de la torre con el retrato de Layla, igual que la radio del juego. Layla es un personaje de ficción, así que
  // la frase la escribo yo; además la hago leer en voz alta
  mostrarRadio(texto, ms) {
    const { width } = this.scale;
    const w = 720;
    const h = 96;
    const x0 = (width - w) / 2;
    const y0 = BANDA + 18; // lo pongo arriba, para no tapar el avión ni la torre
    const fondo = this.add.graphics();
    marcoRedondeado(fondo, x0, y0, w, h, 18, { relleno: COLOR.fondo, alfaRelleno: 0.93, borde: COLOR.naranja });
    const retrato = this.add.image(x0 + 56, y0 + h / 2, 'retrato_protagonista').setDisplaySize(72, 72);
    const etiqueta = this.add.text(x0 + 112, y0 + 14, 'TORRE · LAYLA', { fontFamily: FUENTE, fontSize: '12px', color: TXT.naranja });
    const cuerpo = this.add.text(x0 + 112, y0 + 38, texto, { fontFamily: FUENTE, fontSize: '17px', color: TXT.blanco, wordWrap: { width: w - 140 } });
    const panel = this.add.container(0, 0, [fondo, retrato, etiqueta, cuerpo]).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 300 });
    this.time.delayedCall(ms, () => this.tweens.add({ targets: panel, alpha: 0, duration: 400 }));
    this.game.voice?.hablar(texto, undefined, 'M');
  }

  // Velocidad del terreno en cada instante (px/s): quieto, acelera cada vez más rápido y luego la bajo hasta la del nivel
  velocidad(t) {
    if (t < 1.8) return 0;
    if (t < 5.2) return 600 * ((t - 1.8) / 3.4) ** 2;
    return Phaser.Math.Linear(600, GAME.scrollSpeed, Math.min(1, (t - 5.2) / 3));
  }

  update(_, delta) {
    if (this.saliendo || this.modo === 'cargando') return;
    const dt = delta / 1000;
    this.t += dt;
    if (this.modo === '3d') {
      this.tres.actualizar(this.t, dt);
      if (this.t >= DURACION) this.salir();
      return;
    }
    const v = this.velocidad(this.t);
    this.distancia += v * dt;
    this.terreno.tilePositionY = -this.distancia;
    this.suelo.y = this.distancia;

    // Hago despegar el avión entre los segundos 4,2 y 6,2: sube suave
    const altura = Phaser.Math.Clamp((this.t - 4.2) / 2, 0, 1);
    // En tierra, a toda velocidad, lo hago temblar un poco
    const tiembla = v > 0 && altura < 1 ? Math.min(1, v / 300) : 0;
    this.avion.setPosition(AVION.x + Phaser.Math.FloatBetween(-0.8, 0.8) * tiembla, AVION.y + Phaser.Math.FloatBetween(-0.8, 0.8) * tiembla);
    this.ponerAltura(Phaser.Math.Easing.Sine.InOut(altura));

    this.levantarPolvo(dt, v, altura);
    if (this.t >= DURACION) this.salir();
  }

  // Mientras rueda por la pista le hago levantar polvo atrás, que se queda y baja con el terreno
  levantarPolvo(dt, v, altura) {
    this.polvo += dt;
    if (v < 40 || altura > 0.6 || this.polvo < 0.06) return;
    this.polvo = 0;
    const nube = this.add.circle(this.avion.x + Phaser.Math.Between(-16, 16), this.avion.y + 36, Phaser.Math.Between(4, 9), 0xe8d8b0, 0.6).setDepth(2);
    this.tweens.add({ targets: nube, y: nube.y + 170, scale: 3, alpha: 0, duration: 700, onComplete: () => nube.destroy() });
  }

  salir() {
    if (this.saliendo) return;
    this.saliendo = true;
    window.speechSynthesis?.cancel();
    detenerPista(this, 'musica_dialogo', 500);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => this.scene.start('Level1Scene'));
  }
}
