import * as THREE from 'three';
import { dibujarPista } from '../efectos/aerodromo.js';
import { crearAvionNA50 } from './avionNA50.js';

const ANCHO = 320;
const ALTO = 180;
const LARGO_PISTA = 170;
const ANCHO_PISTA = 22;
const Y_SUELO = -1.5; // altura a la que dejo que las ruedas toquen el suelo
const CLAVE_TEXTURA = 'tres_d';
const { clamp, lerp, smoothstep } = THREE.MathUtils;

export default class DespegueTresD {
  constructor(escena) {
    this.escena = escena;
    this.z = 0;
    this.baliza = null;
    this.manga = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(ANCHO, ALTO, false);
    this.mundo = new THREE.Scene();
    this.mundo.background = new THREE.Color(0xc4d9e8);
    this.mundo.fog = new THREE.Fog(0xc4d9e8, 70, 330);
    this.camara = new THREE.PerspectiveCamera(40, ANCHO / ALTO, 0.1, 600);

    this.crearLuces();
    this.crearSuelo();
    this.crearPista();
    this.crearAerodromo();
    this.crearAvion();
    this.crearPantalla();
  }

  // Pongo el sol bajo y cálido, de atrás a la izquierda del avión, y una luz de cielo para que las sombras no me queden negras
  crearLuces() {
    this.mundo.add(new THREE.HemisphereLight(0xdbe9f5, 0x9a7a4a, 1.15));
    const sol = new THREE.DirectionalLight(0xffdca8, 2.6);
    sol.position.set(-15, 18, -8);
    this.mundo.add(sol);
  }

  // Uso el terreno del Nivel 1, el mismo dibujo de los niveles, repetido y sin suavizar
  crearSuelo() {
    const imagen = this.escena.textures.get('terreno_1').getSourceImage();
    const textura = new THREE.Texture(imagen);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    textura.magFilter = THREE.NearestFilter;
    textura.minFilter = THREE.NearestFilter;
    textura.repeat.set(90, 90);
    textura.needsUpdate = true;
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: textura, roughness: 1, metalness: 0 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(0, Y_SUELO - 0.05, 300);
    this.mundo.add(suelo);
  }

  // La pista la dibujo igual que la del ending y la del despegue en 2D (aerodromo.js)
  crearPista() {
    const lienzo = document.createElement('canvas');
    lienzo.width = 160;
    lienzo.height = 256;
    dibujarPista(lienzo.getContext('2d'));
    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    textura.magFilter = THREE.NearestFilter;
    textura.minFilter = THREE.NearestFilter;
    textura.repeat.set(1, LARGO_PISTA / ((ANCHO_PISTA * 256) / 160)); // cada mosaico me mide 35 m de largo
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PISTA, LARGO_PISTA), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.9, metalness: 0 }));
    pista.rotation.x = -Math.PI / 2;
    pista.position.set(0, Y_SUELO, LARGO_PISTA / 2 - 30);
    this.mundo.add(pista);
  }

  // Armo la plataforma con la torre de control, el hangar, dos aviones estacionados y la manga de viento
  crearAerodromo() {
    const caja = (ancho, alto, largo, color, x, y, z, extra = {}) => {
      const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, largo), new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra }));
      malla.position.set(x, y, z);
      this.mundo.add(malla);
      return malla;
    };
    caja(48, 0.1, 46, 0xb9b3a2, -30, Y_SUELO + 0.02, 0); // acá va la plataforma de concreto

    // Torre de control: hago el fuste, la cabina de vidrio, el techo y la baliza roja que parpadea
    caja(5, 10, 5, 0xd9d0b8, -17, Y_SUELO + 5, 13);
    caja(6.4, 0.5, 6.4, 0x8a7f66, -17, Y_SUELO + 10.2, 13);
    caja(4.6, 2.6, 4.6, 0x6fb8d8, -17, Y_SUELO + 11.8, 13, { transparent: true, opacity: 0.85, metalness: 0.5 });
    caja(5.4, 0.4, 5.4, 0x8a7f66, -17, Y_SUELO + 13.3, 13);
    caja(0.15, 2.4, 0.15, 0x555555, -17, Y_SUELO + 14.6, 13);
    this.baliza = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    this.baliza.position.set(-17, Y_SUELO + 16, 13);
    this.mundo.add(this.baliza);

    // Hangar: levanto las paredes y le pongo un techo a dos aguas con dos chapas inclinadas
    caja(26, 8, 18, 0x8c97a3, -42, Y_SUELO + 4, -14);
    [-1, 1].forEach((lado) => {
      const chapa = caja(14.5, 0.4, 19, lado < 0 ? 0x9aa5b1 : 0x75808c, -42 + lado * 6.4, Y_SUELO + 9.3, -14);
      chapa.rotation.z = -lado * 0.42;
    });
    caja(10, 5.5, 0.2, 0x2b3138, -42, Y_SUELO + 2.8, -4.9); // el portón

    // Dejo dos aviones estacionados, un poco más chicos que el mío
    [[-33, 7, 0.5], [-24, -2, -0.35]].forEach(([x, z, giro]) => {
      const { avion } = crearAvionNA50(THREE);
      avion.position.set(x, 0, z);
      avion.rotation.y = giro;
      avion.scale.setScalar(0.9);
      this.mundo.add(avion);
    });

    // La manga de viento: un poste y un cono naranja que hago mecer
    caja(0.2, 5, 0.2, 0x555555, 17, Y_SUELO + 2.5, 14);
    this.manga = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.2, 7), new THREE.MeshStandardMaterial({ color: 0xff7a1a, flatShading: true }));
    this.manga.geometry.rotateZ(-Math.PI / 2); // giro el cono para que la punta mire hacia +X, que es hacia donde sopla el viento
    this.manga.position.set(18.8, Y_SUELO + 5, 14);
    this.mundo.add(this.manga);
  }

  crearAvion() {
    const modelo = crearAvionNA50(THREE);
    this.modelo = modelo;
    this.avion = modelo.avion;
    this.mundo.add(this.avion);
    // Para la sombra en el suelo uso un disco oscuro que se aclara y se agranda a medida que el avión sube
    this.sombra = new THREE.Mesh(new THREE.CircleGeometry(3.4, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    this.sombra.rotation.x = -Math.PI / 2;
    this.sombra.position.y = Y_SUELO + 0.03;
    this.mundo.add(this.sombra);
  }

  // Creo el canvas de Phaser donde copio cada fotograma y la imagen que lo muestra, a pantalla completa y por debajo de las bandas y del mensaje
  crearPantalla() {
    const { width, height } = this.escena.scale;
    this.lienzo = this.escena.textures.createCanvas(CLAVE_TEXTURA, ANCHO, ALTO);
    this.imagen = this.escena.add.image(width / 2, height / 2, CLAVE_TEXTURA).setDisplaySize(width, height).setDepth(0);
  }

  // Velocidad del avión en metros por segundo: lo dejo quieto, lo hago acelerar cada vez más rápido y luego lo mantengo
  velocidad(t) {
    if (t < 1.8) return 0;
    if (t < 5.2) return 52 * ((t - 1.8) / 3.4) ** 2;
    return lerp(52, 46, clamp((t - 5.2) / 3, 0, 1));
  }

  // Un fotograma: muevo el avión y la cámara según el tiempo, dibujo y copio al canvas de Phaser
  actualizar(t, dt) {
    this.z += this.velocidad(t) * dt;
    this.modelo.actualizar(dt); // hago girar la hélice

    // Lo hago despegar entre los 4,4 y los 8,2 s: sube suave, levanta la nariz y se la vuelvo a bajar cuando termina de subir
    const altura = 22 * smoothstep(t, 4.4, 8.2);
    const nariz = (13 * Math.PI) / 180 * smoothstep(t, 4.4, 5.6) * (1 - smoothstep(t, 6.8, 8.2));
    const balanceo = altura > 0.5 ? Math.sin(t * 1.3) * 0.04 : 0; // ya en el aire lo hago mecerse un poco
    this.avion.position.set(0, altura, this.z);
    this.modelo.inclinar(balanceo, nariz);

    this.sombra.position.set(0, Y_SUELO + 0.03, this.z);
    this.sombra.scale.setScalar(1 + altura / 30);
    this.sombra.material.opacity = 0.35 * clamp(1 - altura / 45, 0, 1);

    this.moverCamara(t, altura);
    this.baliza.visible = Math.floor(t * 2.2) % 2 === 0;
    this.manga.rotation.y = Math.sin(t * 2.1) * 0.25;

    this.renderer.render(this.mundo, this.camara);
    this.lienzo.getContext().drawImage(this.renderer.domElement, 0, 0, ANCHO, ALTO);
    this.lienzo.refresh();
  }

  // Muevo la cámara: arranca al lado de la torre de control, pasa a ir detrás del avión y al final la dejo encima mirando hacia abajo
  moverCamara(t, altura) {
    const detras = new THREE.Vector3(0, altura + 4.2 + altura * 0.05, this.z - 13.5);
    const mira = new THREE.Vector3(0, altura + 1, this.z + 6);
    const w1 = smoothstep(t, 0.8, 3.6);
    const posicion = new THREE.Vector3(-8, 2.4, 20).lerp(detras, w1);
    const objetivo = new THREE.Vector3(-9, 2.5, 5).lerp(mira, w1);

    const w2 = smoothstep(t, 7.2, 8.4);
    posicion.lerp(new THREE.Vector3(0, altura + 40, this.z - 6), w2);
    objetivo.lerp(new THREE.Vector3(0, altura, this.z + 14), w2);

    this.camara.position.copy(posicion);
    this.camara.lookAt(objetivo);
  }

  destruir() {
    this.renderer.dispose();
    this.imagen?.destroy();
    this.escena.textures.remove(CLAVE_TEXTURA);
  }
}
