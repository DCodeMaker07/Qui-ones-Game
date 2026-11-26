// El NA-50 de Quiñones modelado en código, de pocos polígonos y con caras planas, para verlo en Three.js. Recibo THREE por parámetro
// en vez de importarlo, así este archivo sirve igual en el juego (donde three viene de node_modules) y en la página de vista
// previa (public/vista-avion.html, donde viene de un CDN). Las medidas están en metros: unos 8,5 de largo y 11,4 de envergadura.
// La nariz apunta hacia +Z, el ala hacia ±X y arriba es +Y.
const PLATA = 0xaeb7c4;
const PLATA_CLARA = 0xc2cad4;
const ROJO = 0xc8202a;
const BLANCO = 0xf2f2f2;
const OSCURO = 0x2e3238;

export function crearAvionNA50(THREE) {
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.55, metalness: 0.25, ...extra });
  const avion = new THREE.Group();
  const agregar = (geometria, mat, x = 0, y = 0, z = 0) => {
    const malla = new THREE.Mesh(geometria, mat);
    malla.position.set(x, y, z);
    avion.add(malla);
    return malla;
  };

  // ---------- fuselaje: un torno con el perfil (radio, posición) desde la cola hasta la nariz ----------
  const perfil = [
    [0.05, -4.3], [0.18, -3.8], [0.3, -3.0], [0.46, -1.9], [0.62, -0.7], [0.68, 0.4], [0.66, 1.5],
    [0.75, 2.1], [0.78, 2.7], [0.68, 3.2], [0.5, 3.5], [0.28, 3.62], [0.0, 3.64],
  ].map(([radio, z]) => new THREE.Vector2(radio, z));
  const fuselaje = new THREE.LatheGeometry(perfil, 10);
  fuselaje.rotateX(Math.PI / 2); // el eje del torno (Y) pasa a ser Z, con la nariz hacia +Z
  agregar(fuselaje, material(PLATA));

  // La franja oscura del capó, donde empieza el motor
  agregar(new THREE.CylinderGeometry(0.8, 0.8, 0.14, 10).rotateX(Math.PI / 2), material(OSCURO), 0, 0, 2.05);

  // ---------- hélice: cono rojo, tres palas y un disco transparente que hace de movimiento borroso ----------
  agregar(new THREE.ConeGeometry(0.22, 0.55, 10).rotateX(Math.PI / 2), material(ROJO), 0, 0, 3.9);
  const helice = new THREE.Group();
  helice.position.set(0, 0, 3.7);
  for (let i = 0; i < 3; i++) {
    const pala = new THREE.Mesh(new THREE.BoxGeometry(0.17, 2.5, 0.04), material(OSCURO));
    pala.position.y = 0;
    const brazo = new THREE.Group();
    brazo.rotation.z = (i * Math.PI * 2) / 3;
    pala.position.y = 1.0;
    brazo.add(pala);
    helice.add(brazo);
  }
  avion.add(helice);
  const borrosa = agregar(new THREE.CircleGeometry(1.3, 20), material(0xdddddd, { transparent: true, opacity: 0.13, side: THREE.DoubleSide }), 0, 0, 3.72);
  borrosa.userData.borrosa = true;

  // ---------- alas: ala baja, más angosta hacia la punta y con un poco de diedro ----------
  const forma = new THREE.Shape([new THREE.Vector2(0.4, 1.3), new THREE.Vector2(5.7, 0.5), new THREE.Vector2(5.7, -0.5), new THREE.Vector2(0.4, -0.95)]);
  const geoAla = new THREE.ExtrudeGeometry(forma, { depth: 0.16, bevelEnabled: false });
  geoAla.rotateX(Math.PI / 2); // lo que dibujé en Y pasa a ser la cuerda (Z) y el grosor queda vertical
  geoAla.translate(0, 0.08, 0);
  const marcaAla = (mallaAla) => {
    // La escarapela del ala: rojo, blanco y rojo, pegada encima cerca de la punta
    const disco = (radio, color, y) => {
      const d = new THREE.Mesh(new THREE.CircleGeometry(radio, 14).rotateX(-Math.PI / 2), material(color, { metalness: 0 }));
      d.position.set(4.1, y, 0.05);
      mallaAla.add(d);
    };
    disco(0.4, ROJO, 0.172);
    disco(0.27, BLANCO, 0.176);
    disco(0.14, ROJO, 0.18);
  };
  const alaDerecha = new THREE.Mesh(geoAla, material(PLATA_CLARA));
  alaDerecha.position.set(0, -0.35, 0.15);
  alaDerecha.rotation.z = 0.05;
  marcaAla(alaDerecha);
  const alaIzquierda = new THREE.Mesh(geoAla, material(PLATA_CLARA));
  alaIzquierda.position.set(0, -0.35, 0.15);
  alaIzquierda.scale.x = -1; // la espejo
  alaIzquierda.rotation.z = -0.05;
  marcaAla(alaIzquierda);
  avion.add(alaDerecha, alaIzquierda);

  // ---------- cola: estabilizador horizontal y deriva vertical ----------
  const formaCola = new THREE.Shape([new THREE.Vector2(0.3, 0.7), new THREE.Vector2(2.1, 0.2), new THREE.Vector2(2.1, -0.35), new THREE.Vector2(0.3, -0.5)]);
  const geoCola = new THREE.ExtrudeGeometry(formaCola, { depth: 0.1, bevelEnabled: false });
  geoCola.rotateX(Math.PI / 2);
  geoCola.translate(0, 0.05, 0);
  const colaDerecha = new THREE.Mesh(geoCola, material(PLATA_CLARA));
  colaDerecha.position.set(0, 0.08, -3.45);
  const colaIzquierda = colaDerecha.clone();
  colaIzquierda.scale.x = -1;
  avion.add(colaDerecha, colaIzquierda);

  const formaDeriva = new THREE.Shape([new THREE.Vector2(0.7, 0), new THREE.Vector2(-0.9, 0), new THREE.Vector2(-0.85, 1.55), new THREE.Vector2(-0.15, 1.55)]);
  const geoDeriva = new THREE.ExtrudeGeometry(formaDeriva, { depth: 0.1, bevelEnabled: false });
  geoDeriva.rotateY(-Math.PI / 2); // el dibujo (Z hacia adelante, Y hacia arriba) se pone de canto, a lo largo del avión
  geoDeriva.translate(0.05, 0, 0);
  agregar(geoDeriva, material(PLATA_CLARA), 0, 0.3, -3.3);
  // La franja roja del timón
  agregar(new THREE.BoxGeometry(0.12, 0.9, 0.5), material(ROJO), 0, 1.05, -4.0);

  // ---------- cabina: una burbuja de vidrio azulado ----------
  const cabina = agregar(new THREE.SphereGeometry(0.55, 10, 8), material(0x7fb8e6, { transparent: true, opacity: 0.8, metalness: 0.5, roughness: 0.15 }), 0, 0.55, 0.55);
  cabina.scale.set(0.82, 0.78, 1.9);

  // ---------- tren de aterrizaje fijo, con las ruedas dentro de unas carenas ----------
  [-1, 1].forEach((lado) => {
    const carena = agregar(new THREE.SphereGeometry(0.34, 8, 6), material(PLATA), lado * 1.35, -1.15, 0.5);
    carena.scale.set(0.45, 1, 1.5);
    agregar(new THREE.BoxGeometry(0.09, 0.9, 0.12), material(OSCURO), lado * 1.3, -0.72, 0.5);
  });
  agregar(new THREE.SphereGeometry(0.14, 6, 5), material(OSCURO), 0, -0.25, -4.05); // la rueda de cola

  // ---------- escarapelas en los costados del fuselaje, cerca de la cola ----------
  [-1, 1].forEach((lado) => {
    const disco = (radio, color, x) => {
      const d = new THREE.Mesh(new THREE.CircleGeometry(radio, 14).rotateY((lado * Math.PI) / 2), material(color, { metalness: 0 }));
      d.position.set(lado * x, 0.15, -2.1);
      avion.add(d);
    };
    disco(0.26, ROJO, 0.43);
    disco(0.17, BLANCO, 0.44);
    disco(0.09, ROJO, 0.45);
  });

  // ---------- movimiento ----------
  // La hélice gira rápido. dt en segundos
  const actualizar = (dt) => {
    helice.rotation.z += dt * 38;
  };
  // Inclina el avión: rollo (hacia los lados) y cabeceo (nariz arriba o abajo), en radianes
  const inclinar = (rollo, cabeceo = 0) => {
    avion.rotation.z = rollo;
    avion.rotation.x = -cabeceo;
  };
  return { avion, helice, actualizar, inclinar };
}
