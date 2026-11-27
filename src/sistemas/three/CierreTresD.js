import * as THREE from 'three';
import { dibujarPista } from '../efectos/aerodromo.js';
import { crearAvionNA50 } from './avionNA50.js';

// El cierre del ending en 3D con Three.js. Es de noche: cielo oscuro con estrellas, un resto de luz anaranjada en el horizonte, las
// luces de la pista encendidas y la torre y el hangar con luz adentro. Lo dibujo igual que el despegue (DespegueTresD.js): en un canvas
// de 320x180 que copio a una textura de Phaser y estiro sin suavizar. Las medidas están en metros.
//
// Como en el último nivel Quiñones estrella su avión, el cierre depende del final que salió (registro 'finalMalo'):
//   final histórico     la pista vacía con las luces encendidas. Su avión, en gris y transparente, pasa por encima, sube hacia el cielo
//                       y se pierde entre las estrellas
//   final alternativo   Quiñones llega caminando al aeródromo y lo reciben Layla y los soldados, que lo festejan cuando suena el golpe
//                       de la música (toqueEn)
const ANCHO = 320;
const ALTO = 180;
const Y_SUELO = -1.5;
const ANCHO_PISTA = 22;
const Z_INICIO = -250;
const Z_FIN = 190;
const CLAVE_TEXTURA = 'tres_d_cierre';
const { clamp, lerp, smoothstep } = THREE.MathUtils;

export default class CierreTresD {
  constructor(escena, { toqueEn }, historico) {
    this.escena = escena;
    this.clave = CLAVE_TEXTURA;
    this.toque = toqueEn; // el segundo en que suena el golpe de la música
    this.destruido = false;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(ANCHO, ALTO, false);
    this.mundo = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(40, ANCHO / ALTO, 0.1, 700);

    this.crearCielo();
    this.crearLuces();
    this.crearSuelo();
    this.crearPista();
    this.crearLucesDePista();
    this.crearAerodromo();
    this.mover = historico ? this.armarHistorico() : this.armarAlternativo(); // cada final deja su propia función de movimiento
    this.crearPantalla();
  }

  // Armo el cielo de noche: fondo azul muy oscuro, niebla del mismo azul, estrellas y una franja anaranjada que queda del atardecer
  crearCielo() {
    this.mundo.background = new THREE.Color(0x070d22);
    this.mundo.fog = new THREE.Fog(0x111b3d, 90, 430);

    const cantidad = 260;
    const posiciones = new Float32Array(cantidad * 3);
    for (let i = 0; i < cantidad; i++) {
      const giro = Math.random() * Math.PI * 2;
      const subida = 0.12 + Math.random() * 1.2; // siempre por encima del horizonte
      posiciones[i * 3] = 380 * Math.cos(subida) * Math.cos(giro);
      posiciones[i * 3 + 1] = 380 * Math.sin(subida) + 10;
      posiciones[i * 3 + 2] = 380 * Math.cos(subida) * Math.sin(giro);
    }
    const geoEstrellas = new THREE.BufferGeometry();
    geoEstrellas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    this.mundo.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));

    const lienzo = document.createElement('canvas');
    lienzo.width = 4;
    lienzo.height = 128;
    const ctx = lienzo.getContext('2d');
    const degradado = ctx.createLinearGradient(0, 0, 0, 128);
    degradado.addColorStop(0, 'rgba(255,140,60,0)');
    degradado.addColorStop(1, 'rgba(255,140,60,0.55)');
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, 4, 128);
    const resplandor = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 120),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzo), transparent: true, fog: false, depthWrite: false })
    );
    resplandor.position.set(0, 18, 420);
    resplandor.rotation.y = Math.PI; // mira hacia la cámara, que va hacia +Z
    this.mundo.add(resplandor);
  }

  // Pongo una luz de cielo azulada y la luna, que apenas ilumina
  crearLuces() {
    this.mundo.add(new THREE.HemisphereLight(0x4a5b96, 0x1a1c28, 1.0));
    const luna = new THREE.DirectionalLight(0xa9bcff, 0.9);
    luna.position.set(-20, 40, 10);
    this.mundo.add(luna);
  }

  // Uso el mismo terreno del Nivel 1, con un tinte azul para que se vea de noche
  crearSuelo() {
    const textura = new THREE.Texture(this.escena.textures.get('terreno_1').getSourceImage());
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
    textura.magFilter = THREE.NearestFilter;
    textura.minFilter = THREE.NearestFilter;
    textura.repeat.set(90, 90);
    textura.needsUpdate = true;
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: textura, color: 0x7a86b8, roughness: 1, metalness: 0 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(0, Y_SUELO - 0.05, 100);
    this.mundo.add(suelo);
  }

  // Dibujo la pista igual que en el despegue y en el ending en 2D (aerodromo.js)
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
    const largo = Z_FIN - Z_INICIO;
    textura.repeat.set(1, largo / ((ANCHO_PISTA * 256) / 160));
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_PISTA, largo), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.9, metalness: 0 }));
    pista.rotation.x = -Math.PI / 2;
    pista.position.set(0, Y_SUELO, (Z_INICIO + Z_FIN) / 2);
    this.mundo.add(pista);
  }

  // Armo un grupo de luces del mismo color: un núcleo chico y brillante y, alrededor, una esfera grande, transparente y aditiva que hace de resplandor
  grupoDeLuces(puntos, colorNucleo, colorBrillo, radio) {
    const nucleo = new THREE.InstancedMesh(new THREE.SphereGeometry(radio, 6, 4), new THREE.MeshBasicMaterial({ color: colorNucleo }), puntos.length);
    const brillo = new THREE.InstancedMesh(
      new THREE.SphereGeometry(radio * 3.4, 6, 4),
      new THREE.MeshBasicMaterial({ color: colorBrillo, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
      puntos.length
    );
    const guia = new THREE.Object3D();
    puntos.forEach(([x, y, z], i) => {
      guia.position.set(x, y, z);
      guia.updateMatrix();
      nucleo.setMatrixAt(i, guia.matrix);
      brillo.setMatrixAt(i, guia.matrix);
    });
    nucleo.instanceMatrix.needsUpdate = true;
    brillo.instanceMatrix.needsUpdate = true;
    this.mundo.add(nucleo, brillo);
  }

  // Pongo las luces de la pista: amarillas en los bordes, blancas en el eje, verdes en el umbral y rojas en el final
  crearLucesDePista() {
    const y = Y_SUELO + 0.3;
    const bordes = [];
    const eje = [];
    for (let z = Z_INICIO; z <= Z_FIN; z += 12) bordes.push([-ANCHO_PISTA / 2 - 0.6, y, z], [ANCHO_PISTA / 2 + 0.6, y, z]);
    for (let z = Z_INICIO; z <= Z_FIN; z += 20) eje.push([0, Y_SUELO + 0.12, z]);
    const fila = (z) => Array.from({ length: 9 }, (_, i) => [-10 + i * 2.5, y, z]);
    this.grupoDeLuces(bordes, 0xffd070, 0xffb040, 0.3);
    this.grupoDeLuces(eje, 0xffffff, 0xcfe0ff, 0.22);
    this.grupoDeLuces(fila(-24), 0x40ff70, 0x20c050, 0.3); // umbral
    this.grupoDeLuces(fila(Z_FIN), 0xff4040, 0xc02020, 0.3); // final de la pista
  }

  // Armo la torre de control con la cabina encendida, el hangar con el portón iluminado y dos aviones estacionados
  crearAerodromo() {
    const caja = (ancho, alto, largo, color, x, y, z, extra = {}) => {
      const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, largo), new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...extra }));
      malla.position.set(x, y, z);
      this.mundo.add(malla);
      return malla;
    };
    caja(48, 0.1, 46, 0x9a9588, -30, Y_SUELO + 0.02, 0); // la plataforma

    caja(5, 10, 5, 0xc9c0a8, -17, Y_SUELO + 5, 13);
    caja(6.4, 0.5, 6.4, 0x7a705a, -17, Y_SUELO + 10.2, 13);
    caja(4.6, 2.6, 4.6, 0xffd27a, -17, Y_SUELO + 11.8, 13, { emissive: 0xffb84d, emissiveIntensity: 1.6 }); // la cabina, con luz adentro
    caja(5.4, 0.4, 5.4, 0x7a705a, -17, Y_SUELO + 13.3, 13);
    caja(0.15, 2.4, 0.15, 0x555555, -17, Y_SUELO + 14.6, 13);
    this.baliza = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
    this.baliza.position.set(-17, Y_SUELO + 16, 13);
    this.mundo.add(this.baliza);
    const luzTorre = new THREE.PointLight(0xffc880, 500, 60, 2);
    luzTorre.position.set(-17, Y_SUELO + 9, 10);
    this.mundo.add(luzTorre);

    caja(26, 8, 18, 0x7a8591, -42, Y_SUELO + 4, -14);
    [-1, 1].forEach((lado) => {
      const chapa = caja(14.5, 0.4, 19, lado < 0 ? 0x8893a0 : 0x67717d, -42 + lado * 6.4, Y_SUELO + 9.3, -14);
      chapa.rotation.z = -lado * 0.42;
    });
    caja(10, 5.5, 0.2, 0xffe2a0, -42, Y_SUELO + 2.8, -4.9, { emissive: 0xffc070, emissiveIntensity: 1.3 }); // el portón, con luz
    const luzHangar = new THREE.PointLight(0xffc070, 300, 45, 2);
    luzHangar.position.set(-42, Y_SUELO + 4, -2);
    this.mundo.add(luzHangar);

    [[-33, 7, 0.5], [-24, -2, -0.35]].forEach(([x, z, giro]) => {
      const { avion } = crearAvionNA50(THREE);
      avion.position.set(x, 0, z);
      avion.rotation.y = giro;
      avion.scale.setScalar(0.9);
      this.mundo.add(avion);
    });
  }

  // ---------- final histórico: el avión de Quiñones, ya como un fantasma, se va hacia las estrellas ----------

  armarHistorico() {
    const { avion, actualizar } = crearAvionNA50(THREE);
    // Lo vuelvo gris y transparente: cada material pasa a escala de grises y guardo su opacidad para poder desvanecerlo
    const materiales = [];
    avion.traverse((malla) => {
      if (!malla.material) return;
      malla.material = malla.material.clone();
      const c = malla.material.color;
      const gris = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      c.setRGB(gris, gris, gris * 1.08);
      malla.material.transparent = true;
      malla.material.depthWrite = false;
      materiales.push([malla.material, malla.material.opacity * 0.75]);
    });
    avion.position.set(3.2, 2.5, -90);
    this.mundo.add(avion);

    return (lt, dt) => {
      const s = Math.max(0, lt - 0.8); // el avión sale 0,8 s después de empezar, desde atrás de la cámara
      avion.position.set(3.2, 2.5 + 0.9 * s * s, -90 + 42 * s);
      avion.rotation.set(-(0.03 + 0.07 * Math.min(s, 6)), 0, 0);
      actualizar(dt);
      const visible = 1 - smoothstep(lt, 3.5, 6.0); // se va desvaneciendo entre los 3,5 y los 6 s
      materiales.forEach(([material, base]) => (material.opacity = base * visible));

      // La cámara avanza despacio por la pista mirando hacia el fondo, sigue al avión cuando pasa y al final mira las estrellas
      const posicion = new THREE.Vector3(0, 2.1, -45 + lt * 2.2);
      const fondo = new THREE.Vector3(0, 3.5, 90);
      const seguirAvion = lerp(0, 1, smoothstep(lt, 1.2, 5.0));
      const objetivo = fondo.lerp(avion.position, seguirAvion).lerp(new THREE.Vector3(0, 60, 160), smoothstep(lt, 5, 8));
      this.camara.position.copy(posicion);
      this.camara.lookAt(objetivo);
    };
  }

  // ---------- final alternativo: Quiñones llega a pie y lo reciben Layla y los soldados ----------

  // Una persona hecha con cajas. Para Quiñones y Layla copio sus retratos: gorra blanca con la franja azul oscuro, visera y escudo dorado,
  // chaqueta gris azulada con hombreras, botones dorados, corbata azul oscuro y bufanda blanca. Quiñones lleva el pelo corto oscuro y bigote;
  // Layla, el pelo castaño suelto con flequillo. Los soldados llevan casco y uniforme verde oliva. Las piernas y los brazos son grupos con
  // el pivote en la cadera y en el hombro, para poder balancearlos al caminar y levantarlos al festejar
  crearPersona({ tipo, piel, pelo }) {
    const oficial = tipo !== 'soldado';
    const chaqueta = oficial ? 0x8090b0 : 0x4b5a2a;
    const pantalon = oficial ? 0x102050 : 0x3b3f2a;
    const persona = new THREE.Group();
    const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
    const pieza = (geometria, color, x, y, z, padre = persona) => {
      const malla = new THREE.Mesh(geometria, material(color));
      malla.position.set(x, y, z);
      padre.add(malla);
      return malla;
    };
    const caja = (ancho, alto, largo, color, x, y, z, padre) => pieza(new THREE.BoxGeometry(ancho, alto, largo), color, x, y, z, padre);

    // El torso, con el cinturón y la hebilla
    caja(0.58, 0.72, 0.32, chaqueta, 0, 1.15, 0);
    caja(0.6, 0.07, 0.34, 0x1a1a1f, 0, 0.8, 0);
    caja(0.07, 0.05, 0.02, 0xe0b030, 0, 0.8, 0.18);
    if (oficial) {
      caja(0.12, 0.5, 0.02, 0x102050, 0, 1.2, 0.17); // la corbata
      [1.0, 1.15, 1.3].forEach((y) => [-0.17, 0.17].forEach((x) => caja(0.04, 0.04, 0.02, 0xe0b030, x, y, 0.17))); // los botones dorados
      [-0.3, 0.3].forEach((x) => caja(0.2, 0.05, 0.3, 0x102050, x, 1.53, 0)); // las hombreras
      caja(0.52, 0.1, 0.36, 0xf4f4f4, 0, 1.55, 0); // la bufanda blanca
      caja(0.1, 0.34, 0.03, 0xf4f4f4, 0.12, 1.36, 0.19); // y su punta que cuelga
    }

    // La cabeza, con ojos, cejas, nariz y boca
    pieza(new THREE.SphereGeometry(0.2, 10, 8), piel, 0, 1.78, 0);
    [-0.07, 0.07].forEach((x) => {
      caja(0.045, 0.045, 0.02, 0x14100c, x, 1.79, 0.185);
      caja(0.07, 0.015, 0.02, 0x201810, x, 1.84, 0.185);
    });
    caja(0.04, 0.06, 0.05, 0xb97a4a, 0, 1.74, 0.2);
    caja(0.08, 0.015, 0.02, 0x8a3a30, 0, 1.68, 0.185);

    if (tipo === 'quinones') {
      caja(0.42, 0.14, 0.4, 0x15110d, 0, 1.9, 0); // el pelo corto, que asoma debajo de la gorra
      [-0.2, 0.2].forEach((x) => caja(0.05, 0.14, 0.12, 0x15110d, x, 1.78, 0)); // las patillas
      caja(0.13, 0.025, 0.03, 0x15110d, 0, 1.705, 0.2); // el bigote
    }
    if (tipo === 'layla') {
      caja(0.44, 0.55, 0.16, pelo, 0, 1.64, -0.16); // el pelo suelto, por detrás
      [-0.21, 0.21].forEach((x) => caja(0.06, 0.42, 0.22, pelo, x, 1.7, 0)); // los mechones a los lados de la cara
      caja(0.4, 0.07, 0.06, pelo, 0, 1.92, 0.17); // el flequillo
    }

    // La gorra blanca (copa, franja azul, visera y escudo dorado) o el casco del soldado
    if (oficial) {
      pieza(new THREE.CylinderGeometry(0.23, 0.25, 0.16, 10), 0xf4f4f4, 0, 1.99, 0);
      pieza(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), 0xf4f4f4, 0, 2.08, 0);
      pieza(new THREE.CylinderGeometry(0.255, 0.255, 0.05, 10), 0x102050, 0, 1.92, 0);
      caja(0.3, 0.03, 0.14, 0x14181f, 0, 1.91, 0.25);
      caja(0.07, 0.07, 0.02, 0xe0b030, 0, 1.99, 0.25);
    } else {
      pieza(new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0x4a5530, 0, 1.93, 0);
    }

    // Piernas y brazos: cada uno es un grupo que gira desde la cadera o el hombro
    const extremidad = (x, y, partes) => {
      const pivote = new THREE.Group();
      pivote.position.set(x, y, 0);
      partes(pivote);
      persona.add(pivote);
      return pivote;
    };
    const pierna = (x) =>
      extremidad(x, 0.8, (g) => {
        caja(0.2, 0.55, 0.22, pantalon, 0, -0.28, 0, g);
        caja(0.22, 0.3, 0.3, 0x14110e, 0, -0.65, 0.03, g); // la bota
      });
    const brazo = (x) =>
      extremidad(x, 1.5, (g) => {
        caja(0.15, 0.5, 0.17, chaqueta, 0, -0.26, 0, g);
        caja(0.16, 0.07, 0.18, oficial ? 0x102050 : 0x3b3f2a, 0, -0.54, 0, g); // el puño
        caja(0.12, 0.12, 0.12, piel, 0, -0.64, 0, g); // la mano
      });
    persona.userData = { piernas: [pierna(-0.14), pierna(0.14)], brazos: [brazo(-0.37), brazo(0.37)] };
    this.mundo.add(persona);
    return persona;
  }

  armarAlternativo() {
    const quinones = this.crearPersona({ tipo: 'quinones', piel: 0xdca06a });
    const layla = this.crearPersona({ tipo: 'layla', piel: 0xe3c0a0, pelo: 0x5a3a2a });
    const soldados = [[-1.2, 2.6], [-1.6, 1.0], [-1.8, -0.8], [-1.4, -2.2]].map(([x, z]) => {
      const soldado = this.crearPersona({ tipo: 'soldado', piel: 0xd9a47a });
      soldado.position.set(-8 + x, Y_SUELO, 3.5 + z);
      soldado.rotation.y = Math.PI / 2; // todos miran hacia +X, de donde viene Quiñones
      return soldado;
    });
    layla.position.set(-7.4, Y_SUELO, 3.5);
    layla.rotation.y = Math.PI / 2;
    const luzGrupo = new THREE.PointLight(0xffc880, 260, 30, 2); // una luz cálida sobre el grupo, para que se vea con claridad
    luzGrupo.position.set(-6, 5, -2);
    this.mundo.add(luzGrupo);

    // Quiñones camina desde la oscuridad hasta donde lo esperan, a unos 3 m/s, y llega justo cuando suena el golpe
    const desde = new THREE.Vector3(9, Y_SUELO, 12);
    const hasta = new THREE.Vector3(-5.2, Y_SUELO, 3.5);

    const caminar = (persona, fase, fuerza) => {
      const [pi, pd] = persona.userData.piernas;
      const [bi, bd] = persona.userData.brazos;
      pi.rotation.x = Math.sin(fase) * 0.7 * fuerza;
      pd.rotation.x = -Math.sin(fase) * 0.7 * fuerza;
      bi.rotation.x = -Math.sin(fase) * 0.5 * fuerza;
      bd.rotation.x = Math.sin(fase) * 0.5 * fuerza;
    };

    return (lt) => {
      const w = smoothstep(lt, 0, this.toque);
      quinones.position.lerpVectors(desde, hasta, w);
      quinones.rotation.y = Math.atan2(hasta.x - desde.x, hasta.z - desde.z);
      caminar(quinones, lt * 7, w < 1 ? 1 : 0);
      quinones.position.y = Y_SUELO + (w < 1 ? Math.abs(Math.sin(lt * 7)) * 0.05 : 0);

      // Layla da un paso hacia él un poco antes de que llegue
      layla.position.x = lerp(-7.4, -6.3, smoothstep(lt, this.toque - 1, this.toque));

      // Al llegar, Quiñones se lleva la mano a la gorra y los soldados festejan con los brazos arriba y saltitos
      const festejo = lt >= this.toque ? 1 : 0;
      if (festejo) {
        quinones.userData.brazos[1].rotation.x = -2.5;
        quinones.rotation.y = Math.atan2(-1, 0); // gira hacia el grupo, que queda del lado -X
        layla.userData.brazos[0].rotation.x = -2.8 + Math.sin(lt * 10) * 0.25;
        soldados.forEach((soldado, i) => {
          const fase = lt * 9 + i * 1.3;
          soldado.userData.brazos.forEach((brazo) => (brazo.rotation.x = -2.9 + Math.sin(fase) * 0.3));
          soldado.position.y = Y_SUELO + Math.abs(Math.sin(fase)) * 0.22;
        });
      }

      // La cámara arranca lejos, mirando al grupo desde la pista, y da la vuelta hasta quedar de lado, cerca de Quiñones y Layla, que se miran
      // de frente: así se ven los dos de perfil, con todos los detalles de la gorra, el uniforme y la cara
      const acercar = smoothstep(lt, 2.5, this.toque + 1);
      this.camara.position.set(lerp(4.5, -5.8, acercar), lerp(2.3, 1.55, acercar), lerp(-9, -3.6, acercar));
      this.camara.lookAt(lerp(-6.5, -5.8, acercar), lerp(1.2, 1.4, acercar), lerp(4.5, 3.5, acercar));
    };
  }

  crearPantalla() {
    this.lienzo = this.escena.textures.createCanvas(CLAVE_TEXTURA, ANCHO, ALTO);
    this.lienzo2d = this.lienzo.getContext();
  }

  // Un fotograma. lt: segundos desde que empezó el plano
  actualizar(lt, dt) {
    if (this.destruido) return;
    this.baliza.visible = Math.floor(lt * 2.2) % 2 === 0;
    this.mover(lt, dt);
    this.renderer.render(this.mundo, this.camara);
    this.lienzo2d.drawImage(this.renderer.domElement, 0, 0, ANCHO, ALTO);
    this.lienzo.refresh();
  }

  destruir() {
    if (this.destruido) return;
    this.destruido = true;
    this.renderer.dispose();
    this.escena.textures.remove(CLAVE_TEXTURA);
  }
}
