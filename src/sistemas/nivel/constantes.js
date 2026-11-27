import { BOTON_DE_MANDO, nombreBoton } from '../entrada/etiquetas.js';
import { usandoMando } from '../entrada/preferencias.js';
// Los números que ajusto cuando pruebo el nivel. Los junté acá para no andar buscándolos por todos lados.

// Vidas y botiquines
export const VIDA_JUGADOR = 5;
export const VIDA_ALIADO = 3;
export const BOTIQUINES_POR_NIVEL = 3;
export const ESPERA_BOTIQUIN_MS = 10000;
export const CURA_JUGADOR = 1; // vidas que me devuelve un botiquín recogido
export const CURA_ALIADO = 2;
export const RADIO_RECOGER = 48; // distancia a la que el avión recoge un botiquín del suelo

// Teclas. Las habilidades van en Q, W, E y R como en League of Legends, y el movimiento solo con las flechas (la W es mi disparo)
export const TECLAS = { bomba: 'Q', disparo: 'W', rafaga: 'E', especial: 'R', agua: 'F', tonel: 'X', subir: 'SPACE', bajar: 'C', radio: 'T', botiquin: 'B' };
// Cómo se escribe una tecla en pantalla. nombreTeclado es siempre la del teclado; nombreTecla cambia al botón del mando si estoy jugando con
// mando (ver sistemas/entrada/preferencias.js y etiquetas.js), así el HUD y los avisos le sirven a quien juega con cualquiera de los dos
export const nombreTeclado = (tecla) => (tecla === 'SPACE' ? 'ESPACIO' : tecla);
export const nombreTecla = (tecla) => (usandoMando() ? nombreBoton(BOTON_DE_MANDO[tecla] ?? tecla) : nombreTeclado(tecla));

// Altura de vuelo: bajo (-1), normal (0) y alto (1). Un avión solo puede lastimar a otro (y recibir sus balas) si van a la misma altura.
// Cuando cambio de altura los enemigos tardan unos segundos en reaccionar y seguirme. Entre un cambio y otro hay que esperar.
export const ALTURA_CAMBIO_ESPERA = 4; // segundos
export const ENEMIGO_REACCION = [2.5, 3.5]; // segundos que tarda un avión enemigo en seguirme a la nueva altura
export const FACTOR_ALTURA = { '-1': 0.85, 0: 1, 1: 1.18 }; // cuánto se ve de grande un avión según su altura (más alto, más cerca de la cámara)

// Velocidad de mi avión (px/s). Tiene que ser mayor que la de los aviones enemigos, que van entre 150 y 260 (ver Enemigos.js)
export const VELOCIDAD_JUGADOR = 400;

// Qué tan rápido gira mi avión hacia donde me muevo (radianes por segundo). Apunta siempre hacia donde va
export const GIRO_JUGADOR = 9;

// Oleadas de aviones enemigos: llega un grupo y recién cuando lo derroto (o se retira) empieza a correr la espera del siguiente.
// Así puedo ocuparme de las torretas sin que vuelvan a llegar aviones enseguida.
export const AVIONES_OLEADA = [2, 3]; // cuántos vienen en cada oleada
export const ESPERA_OLEADA = 14; // segundos entre que derroto una oleada y llega la siguiente
export const ESPERA_PRIMERA_OLEADA = 3; // lo mismo al empezar el nivel o al llegar a la base

// Cuántos aviones enemigos pueden estar a la vez durante el avance (se quedan en pantalla mientras queden torretas)
export const MAX_AVIONES = 3;

// Tamaño del avión de Quiñones (1 = el tamaño del sprite, 96x96). Lo subí porque se veía chico
export const ESCALA_JUGADOR = 1.3;

// Armas
export const BOMBA_ESPERA = 3; // Q: segundos de enfriamiento de la bomba
export const ESPERA_DISPARO_MS = 140; // W: tiempo entre bala y bala si mantengo la tecla
export const RAFAGA_ESPERA = 7; // E: segundos de enfriamiento de la ráfaga
export const RAFAGA_TANDAS = 5; // cuántas tandas de balas salen en una ráfaga
export const RAFAGA_CADA_MS = 70; // tiempo entre una tanda y la siguiente
export const RAFAGA_ABANICO = 0.11; // ángulo (en radianes) entre las 3 balas de cada tanda
export const RADIO_BOMBA = 80; // radio de la explosión de la bomba Q (antes 50): mata a los soldados enemigos que alcanza y también es el círculo de la guía
export const BALA_ESC = 0.4; // el sprite de la bala mide 19x71, lo dibujo a escala (≈8x28 px)
export const CAIDO_PERMANENCIA_MS = 7000; // cuánto tiempo se queda el cráter de un soldado aliado antes de desvanecerse
export const DANO_ALIADO_SOLDADO = 0.8; // vida por segundo que le quita un soldado aliado a un soldado enemigo al que le dispara (tiene 2 de vida)
export const DANO_ALIADO_NIDO = 0.05; // vida por segundo que le resta cada soldado al nido que tiene enfrente

// Bombardeo especial (R). Mientras dura, el avión deja fuego donde caerían sus bombas. El fuego NO se apaga solo: lo apaga el agua (F)
export const ULTI_ESPERA = 25; // segundos de recarga
export const ULTI_DURACION = 1.5;
export const ULTI_CADA = 0.06; // un foco de fuego cada 0,06 s
export const FUEGO_RADIO = 46;
export const FUEGO_DANO_ALIADO = 0.5; // vidas por segundo que le quita el fuego a un soldado aliado que está dentro
export const FUEGO_BLOQUEO = 70; // a esta distancia del fuego mis soldados dejan de avanzar y esperan
export const FUEGO_DPS = 0.8; // vida por segundo que le quita el fuego en el suelo al depósito o la base (las torretas no: a ellas las prende)
export const ULTI_DANO_BOMBA = 0.3; // daño propio de cada bomba de la R a lo que cae cerca (una torreta tiene 3 de vida)
export const ULTI_RADIO_BOMBA = 50; // radio de cada bomba de la R (antes 30), sumado a un 60 % del radio de la torreta
export const FUEGO_APILA_RADIO = 18; // si una bomba cae a menos de esto de un foco, el fuego se apila
export const FUEGO_APILA_MAX = 5; // cuántas bombas se apilan como máximo (más llama y más humo)
export const ULTI_DANO_SOLDADO = 2; // cada bomba de la R mata de un golpe a los soldados enemigos que caen cerca (tienen 2 de vida)
export const ULTI_RADIO_SOLDADO = 75; // hasta dónde llega eso desde donde cae la bomba
export const FUEGO_RADIO_SOLDADO = 76; // a esta distancia de una llama un soldado enemigo ya se quema (más que el radio de la llama: el calor se siente)
export const ULTI_FACTOR_JEFE = 1; // el depósito y la base reciben este porcentaje del daño de cada bomba de la R (1 = todo: cada bomba suma 0,3)
export const DANO_BOMBA_BASE = 3; // lo que le quita una bomba de la Q a una base (antes 1,5)

// Avance del mapa. La bomba cae unos 240 px por DEBAJO del avión, así que las torretas tienen que quedar cerca del
// centro: si se frenaran pegadas al borde de arriba, el avión no podría subir lo suficiente para bombardearlas.
export const LINEA_PARADA = 280;

// Distancias
export const PX_POR_KM = 430; // 430 px de terreno = 1 km en el indicador

// Agua (F): una bomba de agua que cae desde el avión y apaga el fuego de la R. Es lo único que lo apaga
export const AGUA_ESPERA = 8; // segundos de enfriamiento
export const AGUA_RADIO = 56; // radio de cada gota (el fuego de la R mide unos 46 de radio, así que se apaga bien con mi vuelo encima)
export const AGUA_DURACION = 1.5; // el agua sale igual que la R: durante este tiempo voy soltando gotas donde pasa mi avión
export const AGUA_CADA = 0.06; // una gota cada este tiempo

// Tonel (X): mi avión da una vuelta completa sobre su eje. Mientras gira no recibe daño, devuelve las balas enemigas que lo tocan
// (salen de vuelta y pueden pegarles a los aviones) y da un pequeño salto hacia donde me muevo.
export const TONEL_ESPERA = 6; // segundos de enfriamiento
export const TONEL_DURACION = 0.5; // segundos que dura la vuelta
export const TONEL_SALTO = 240; // velocidad extra (px/s) hacia donde me muevo: en 0,5 s son unos 120 px

// Puntaje. Pasar de PUNTAJE_FINAL_BUENO sumando los tres niveles desbloquea el final alternativo, donde Quiñones sobrevive.
// Con menos puntos se ve el final histórico y Quiñones aparece en gris. Estos números los puse estimando, hay que ajustarlos jugando.
export const PUNTAJE_FINAL_BUENO = 7000;
export const PUNTOS = {
  nido: 100, // cada torreta destruida
  base: 500, // el depósito, o la base del Nivel 3 al lanzarme en picada
  avion: 150, // cada avión enemigo derribado
  soldado: 25, // cada soldado enemigo
  baja: 40, // lo que resta cada soldado aliado que cae
  bonoNivel: 300, // al terminar un nivel...
  bonoVida: 100, // ...más esto por cada vida que me queda
};

// Barreras de los aliados (las coloca Layla en el multijugador)
export const BARRERAS_POR_NIVEL = 9; // tres grupos de la orden por voz (o nueve de Layla, de a una)
export const BARRERA_ESPERA_MS = 15000; // entre una barrera y la siguiente
export const BARRERA_VIDA = 10; // balas que aguanta antes de romperse

// Filas de soldados enemigos: de vez en cuando sale una fila (o una columna) de soldados, ideal para barrerla con el bombardeo de fuego (R)
export const FILA_CADA = [28, 40]; // segundos entre una fila y la siguiente
export const SEGUNDOS_SIN_TORRETAS = 8; // desde esos segundos antes de que llegue la base ya no salen grupos nuevos de torretas
export const FILA_PRIMERA = 20; // segundos hasta la primera
export const FILA_SOLDADOS = 7;
export const FILA_SEPARACION = 56; // píxeles entre un soldado y el siguiente
export const FILA_CENTRO_Y = 340; // hasta dónde bajan las filas: casi al centro de la pantalla, porque arriba de todo es difícil llegar con el avión
export const MAX_SOLDADOS_ENEMIGOS = 14; // si ya hay tantos, no sale otra fila

// Con menos focos que estos el fuego de la R es un parche chico: no frena el mapa y mis soldados lo rodean en vez de esperar
export const FUEGO_MIN_BLOQUEO = 8;

// Cámara: puedo salirme un poco de la pantalla (hasta margenX a los lados, margenArriba arriba y margenAbajo abajo) y la cámara me sigue
// suavemente: se corre seguirX / seguirY veces lo que me alejo del centro. Con seguirX y seguirY en 0 la cámara queda quieta como antes.
export const CAMARA = { margenX: 110, margenArriba: 80, margenAbajo: 40, seguirX: 0.18, seguirY: 0.2, suavizado: 8 };
// Con la cámara corrida y el zoom alejado se ve hasta unos 300 px más allá de la pantalla: lo que sale lo borro más lejos que eso
export const MARGEN_FONDO = 520; // lo que sobresale el terreno de fondo por cada lado, para que con el zoom alejado no se vea el borde
export const MARGEN_BORRADO = 320;

// Si llego al puntaje del final alternativo, Q, R y F se recargan en este porcentaje del tiempo (0,5 = a la mitad)
export const ENFRIAMIENTO_PUNTAJE_MAX = 0.5;
// Con el fuego de la R solo se frena el mapa si hay soldados aliados a menos de FUEGO_RADIO más esto de una llama
export const FUEGO_DISTANCIA_ALIADOS = 130;

// Zoom con la rueda del mouse: cada paso multiplica el acercamiento por 1 / paso (o por paso al alejar), entre min (más lejos) y max (más cerca)
export const ZOOM = { min: 0.8, max: 1.5, paso: 0.92, suavizado: 10, mando: 1.1 }; // mando: cuánto cambia por segundo con el stick derecho a fondo

// Cuando destruyo una torreta, los soldados que la cuidaban se enfurecen: salen corriendo a atacar a mis soldados, más rápido, de más cerca y
// disparando más seguido
export const FURIA_RADIO = 170; // a qué distancia de la torreta destruida se enfurecen

// Órdenes por voz a Layla en el modo un jugador (ver Radio.js). En multijugador esas cosas las hace Layla de verdad con su panel.
export const GRUPO_BARRERAS = 3; // "Layla, coloca barreras": salen tres juntas delante de mis soldados
export const HUECO_BARRERAS = 80; // el espacio libre entre una barrera y la siguiente: un soldado (con su margen) mide unos 56 px, así que pasa y puede salir
export const GRUPO_SEPARACION = 92 + HUECO_BARRERAS; // entre centros: el ancho de una barrera (92 px) más el hueco
export const REFUERZOS_VOZ = { max: 15, escuadras: 2, espera: 20, usos: 4 }; // "trae refuerzos": máximo de aliados, escuadras de 3, segundos entre pedidos y pedidos por nivel
export const TURBO = { factor: 1.9, duracion: 8, espera: 25 }; // "que avancen más rápido": factor de velocidad, segundos que dura y segundos hasta poder repetirlo

// Con la base a la vista ya no hay torretas alrededor: en cambio la base va soltando oleadas de soldados enemigos que salen a buscar a los míos
export const OLEADA_BASE = { primera: 3, cada: [9, 12], soldados: [4, 6] }; // segundos hasta la primera, segundos entre oleadas y cuántos soldados salen

// La base enemiga tiene una "figura invisible" a su alrededor que mis soldados no pueden pisar (BLOQUEO_BASE px más allá de su borde), y atacan
// cuando están a DISTANCIA_ASALTO_BASE px de su borde, no de su centro: así se paran afuera, al pie de la muralla, y no se meten adentro.
export const BLOQUEO_BASE = 50;
export const DISTANCIA_ASALTO_BASE = 130;
