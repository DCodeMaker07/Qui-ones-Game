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
export const TECLAS = { bomba: 'Q', disparo: 'W', rafaga: 'E', especial: 'R', agua: 'F', subir: 'SPACE', bajar: 'C', radio: 'T', botiquin: 'B' };
export const nombreTecla = (tecla) => (tecla === 'SPACE' ? 'ESPACIO' : tecla); // cómo se escribe en pantalla

// Altura de vuelo: bajo (-1), normal (0) y alto (1). Un avión solo puede lastimar a otro (y recibir sus balas) si van a la misma altura.
// Cuando cambio de altura los enemigos tardan unos segundos en reaccionar y seguirme. Entre un cambio y otro hay que esperar.
export const ALTURA_CAMBIO_ESPERA = 4; // segundos
export const ENEMIGO_REACCION = [2.5, 3.5]; // segundos que tarda un avión enemigo en seguirme a la nueva altura
export const FACTOR_ALTURA = { '-1': 0.85, 0: 1, 1: 1.18 }; // cuánto se ve de grande un avión según su altura (más alto, más cerca de la cámara)

// Velocidad de mi avión (px/s). Tiene que ser mayor que la de los aviones enemigos, que van entre 150 y 260 (ver Enemigos.js)
export const VELOCIDAD_JUGADOR = 400;

// Qué tan rápido gira mi avión hacia donde me muevo (radianes por segundo). Apunta siempre hacia donde va
export const GIRO_JUGADOR = 9;

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
export const RADIO_BOMBA = 50; // radio de la explosión de una bomba
export const BALA_ESC = 0.4; // el sprite de la bala mide 19x71, lo dibujo a escala (≈8x28 px)
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
export const ULTI_RADIO_BOMBA = 30; // radio de cada bomba de la R, sumado a un 60 % del radio del objetivo
export const FUEGO_APILA_RADIO = 18; // si una bomba cae a menos de esto de un foco, el fuego se apila
export const FUEGO_APILA_MAX = 5; // cuántas bombas se apilan como máximo (más llama y más humo)
export const ULTI_FACTOR_JEFE = 0.4; // el depósito y la base reciben solo este porcentaje del daño de la R

// Avance del mapa. La bomba cae unos 240 px por DEBAJO del avión, así que las torretas tienen que quedar cerca del
// centro: si se frenaran pegadas al borde de arriba, el avión no podría subir lo suficiente para bombardearlas.
export const LINEA_PARADA = 280;

// Distancias
export const PX_POR_KM = 430; // 430 px de terreno = 1 km en el indicador

// Agua (F): una bomba de agua que cae desde el avión y apaga el fuego de la R. Es lo único que lo apaga
export const AGUA_ESPERA = 8; // segundos de enfriamiento
export const AGUA_RADIO = 140; // radio del chapuzón
