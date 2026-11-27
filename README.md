# 1941: Quebrada Seca

Shooter vertical (lienzo 16:9 de 1280x720 que ocupa todo el ancho de la ventana) en Phaser 3 sobre el conflicto de Zarumilla (1941), en homenaje a José Abelardo Quiñones Gonzales.
Proyecto final de *Diseño y Desarrollo de Juegos Interactivos II* (individual).

**Stack:** Phaser 3 · Vite · Tailwind CSS v4 · JavaScript (ES modules)
**Tipografías:** monospace (diálogos), Georgia (títulos), Nunito (HUD, menús, modales y formularios HTML).

## Comandos

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # genera dist/ (listo para Netlify / Vercel / GitHub Pages)
pnpm preview
```

Atajos útiles: `http://localhost:5173/#nivel1` o `#nivel2` saltan directo a un nivel (para grabar el video), `#sinintro` salta la intro;
`?debug` muestra las hitboxes.

## Controles

| Tecla | Acción |
|---|---|
| Flechas | Mover el avión de Quiñones |
| Q | Bomba (daña objetivos terrestres y también a tus aliados si caen cerca). Enfriamiento de 3 s |
| W (mantener) | Disparo de ametralladora (daña aviones) |
| E | Ráfaga: 5 tandas de 3 balas en abanico. Enfriamiento de 7 s |
| R | Bombardeo especial de fuego (ver abajo). Enfriamiento de 25 s |
| F | Agua: apaga el fuego de la R. Enfriamiento de 8 s |
| X | Tonel: una vuelta completa. Esquiva todo el daño, devuelve las balas enemigas y da un salto. Enfriamiento de 6 s |
| Mando | Con el mando se navegan también los menús: en el modo de juego y la sala la cruceta o el stick resaltan un botón y A lo pulsa; en el DNI hay un teclado numérico en pantalla. El juego recuerda con qué juegas (mando o teclado y mouse, lo último que uses) en `localStorage` (`quinones-entrada`). Funciona con cualquier mando estándar (Xbox, PlayStation...): stick izquierdo o cruceta para mover, RT dispara (W), A bomba (Q), B ráfaga (E), X agua (F), Y tonel (X), LT bombardeo de fuego (R), RB sube y LB baja de altura, Select botiquín, R3 radio y Start pausa. En los menús y diálogos, A confirma y B o Start vuelven. Si tu mando de PlayStation entra por un adaptador que lo hace pasar por mando de Xbox, elige "Mando PlayStation" en el panel de Controles del título: los botones salen como cruz, círculo, cuadrado y triángulo, L1, R1, L2 y R2 (se guarda en `localStorage`). El zoom del nivel se hace con el stick derecho (arriba acerca, abajo aleja). Si juegas con mando, el HUD cambia: bajo cada habilidad aparece su botón (A, B, X, Y con su color, y RT, LT...), las flechas pasan a ser una cruceta y los avisos dicen los botones del mando. El navegador solo detecta el mando después de apretar un botón. Está en `sistemas/entrada/Mando.js` |
| ESPACIO / C | Subir / bajar de altura de vuelo (alto, normal, bajo). Espera de 4 s entre un cambio y otro |
| T | Radio: hablas, el juego reconoce tu voz y Layla (torre) la repite con voz H/M |
| B (o decir "botiquín" por radio) | Botiquín con paracaídas que cura a los soldados aliados heridos |

## Mecánicas

- **Soldados aliados:** entran en escuadras de 3 por abajo durante el avance y, con la base final del Nivel 2 o del 3 a la vista, por los costados de la pantalla (donde hay más espacio). Eligen un lugar sin barreras ni torretas en el camino. Avanzan, se detienen frente a los nidos (que los atacan) y esperan a que los despejes con bombas.
- **Botiquines:** 3 por nivel, 10 s de espera entre uno y otro. Los aliados heridos (tinte rojizo) caminan hacia el botiquín aterrizado.
- **Altura de vuelo (ESPACIO sube, C baja):** hay tres alturas (bajo, normal y alto) y un avión solo puede lastimar a otro, o recibir sus balas, si van a la misma. Si cambio de altura las balas enemigas pasan de largo (se ven transparentes) y mis balas no le pegan a los aviones que quedaron en otro piso. Entre 2,5 y 3,5 s después los enemigos reaccionan y suben o bajan un piso para seguirme; mientras tanto no disparan. Se nota en el tamaño del avión y en su sombra. Entre un cambio y otro hay 4 s de espera, para no esquivar todo el tiempo.
- **Vidas:** Quiñones tiene 5 vidas.
- **Barrera (multijugador):** Layla puede colocar una barrera desde su panel (botón "Barrera…" y clic en el mapa). Frena las balas de las torretas y de los soldados enemigos (aguanta 10 impactos), baja con el terreno y los aviones no la afectan. Son 4 por nivel con 15 s de espera entre una y otra. Usa `barrera_aliada.png`. Es un mensaje nuevo del protocolo, así que el servidor pasó a la versión 4 y hay que reiniciarlo o volver a desplegarlo en Render.
- **Filas de soldados:** cada 28 a 40 s (la primera a los 20 s) sale una fila o una columna de 7 soldados enemigos, que entran marchando desde arriba de la pantalla (no aparecen de golpe) hasta casi el centro, y se quedan ahí cerrándoles el camino a mis soldados. Mientras quede alguno el mapa se frena (con el aviso "ROMPE LA FILA ENEMIGA PARA AVANZAR"), así no los arrastra hacia abajo fuera de mi alcance, y el bombardeo de fuego (R) los barre de una pasada. Cada bomba de la R también les pega a los que caen cerca y el calor de las llamas los quema desde unos 76 px.
- **Fuego que bloquea:** durante el avance (no cuando ya llegó la base, donde mis soldados rodean las llamas y atacan por otro lado), el fuego de la R frena el mapa y a los soldados solo si es grande (8 focos o más, `FUEGO_MIN_BLOQUEO`) **y** hay soldados aliados vivos a menos de unos 175 px de las llamas. Si el fuego está lejos de ellos, o ya no queda ninguno, el mapa sigue y no sale el aviso. Un parche chico tampoco bloquea nada: mis soldados lo rodean.
- **HUD de cabina:** abajo hay un tablero de metal oscuro que ocupa todo el ancho de la pantalla, con la idea del HUD de League of Legends. A la izquierda, el retrato de Quiñones en una pantalla con marco, cuántos aliados quedan y el altímetro con aguja (las tres alturas). En el medio, las habilidades Q, W, E, R y las casillas chicas del agua (F) y del tonel (X), cada una con su tecla debajo, y debajo de todas la barra verde de vida (cinco celdas) y la azul de puntos (más anchas que las habilidades), que se pone dorada al llegar a la meta del final alternativo. A la derecha, el botiquín (con cuántos quedan y su tecla, o "LAYLA" si lo pide ella), la radio (con una luz que parpadea cuando hay un mensaje) y la pausa, y una tira con las flechas para mover. Arriba van el objetivo, la placa de posiciones (a la derecha) y, en los niveles de la base, la barra de distancia, también a la derecha y flotando. No hay vidrio líquido: todo es metal plano. El tablero se dibuja al 88 % (`ESCALA_HUD` en `ui/cabina.js`) y mide unos 116 px de alto; el avión no puede bajar más que su borde de arriba (`topeHud()`), así nunca queda tapado por él.
- **Órdenes por voz a Layla (modo un jugador):** pulso la tecla de la radio (T, o R3 con mando) y hablo; Layla repite lo que dije y responde. Entiende, por palabras clave:
  - *"Layla, coloca barreras"*: salen hasta tres barreras en fila, calculadas así: se toma el grupo de soldados más numeroso, se busca la amenaza más cercana (una torreta o, si no hay, un soldado enemigo) y se ponen a casi la mitad del camino entre los dos, nunca encima de una torreta ni de la base, y separadas entre sí por un hueco de 80 px para que los soldados puedan pasar y salir de detrás (si el lugar ideal no sirve, se busca el libre más cercano; si no hay, esa barrera no se pone). Con barreras en el mapa, lo primero que hacen mis soldados es ir a cubrirse detrás de la más cercana, aunque no haya peligro: se quedan ahí unos 3,5 s y siguen con lo suyo, y una barrera nueva los vuelve a mandar a cubrirse. Mientras hay peligro (un soldado enemigo a tiro, una torreta con alcance o balas cerca) se quedan detrás. Tienen 10 de vida, frenan las balas de las torretas y de los soldados enemigos, bajan con el terreno y, como las nueces de Plants vs Zombies, se les ve una barrita de vida cuando las dañan y se van oscureciendo. Con barreras en el mapa, lo primero que hacen mis soldados es ir a cubrirse detrás de la más cercana (aunque no haya peligro), se quedan ahí unos 3,5 s y siguen; una barrera nueva los vuelve a mandar a cubrirse. Mientras hay peligro se quedan detrás. Se esconden cuando hay peligro (un soldado enemigo a tiro, una torreta con alcance o balas cerca). Son 9 barreras por nivel (3 órdenes), con 15 s de espera entre una y otra.
  - *"Layla, trae refuerzos"*: entran 2 escuadras de 3 soldados (por abajo en el avance y por los costados con la base a la vista) (máximo 15 aliados en el campo, 20 s de espera, 4 pedidos por nivel). Con la base a la vista, el pedido de refuerzos es el del asedio de siempre.
  - *"Layla, que avancen más rápido los soldados"*: durante 8 s todos corren 1,9 veces más rápido (25 s de espera para repetirlo).
  Todos los números están en `GRUPO_BARRERAS`, `REFUERZOS_VOZ` y `TURBO` (`sistemas/nivel/constantes.js`).
- **La base no se pisa:** la base tiene una figura invisible a su alrededor (50 px más allá de su muralla) que mis soldados no atraviesan. Marchan hacia el punto más cercano de su borde y atacan al estar a 130 px de él (no del centro), así se quedan afuera, al pie de la muralla. Si alguno quedó adentro, sale solo. Los soldados enemigos que salen de la base no se ven afectados (`BLOQUEO_BASE` y `DISTANCIA_ASALTO_BASE`).
- **Obstáculos:** mis soldados y los soldados enemigos no atraviesan las barreras: las rodean (`sistemas/nivel/Obstaculos.js`). Mis soldados también rodean las torretas que no son su objetivo y la base, no pasan por el fuego grande de la R y, si les ponen una barrera encima, salen de ella.
- **Cámara que sigue:** el avión puede salirse un poco de la pantalla (unos 110 px a los lados, 80 arriba y 40 abajo) y la cámara se corre suavemente hacia donde va. El HUD, la radio y los menús no se mueven. Todo está en `CAMARA` (`sistemas/nivel/constantes.js`); con `seguirX` y `seguirY` en 0 la cámara queda quieta como antes.
- **Zoom con la rueda:** con la rueda del mouse acerco o alejo la cámara, como en League of Legends (entre 0,8 y 1,5 veces, en `ZOOM`). Se hace alrededor del avión, así que no se mueve de lugar. El HUD, la radio y los menús no cambian de tamaño: van en una cámara aparte que no hace zoom.
- **Puntaje máximo:** al llegar a `PUNTAJE_FINAL_BUENO` (cuando la barra de puntos se pone dorada), la bomba (Q), el bombardeo de fuego (R) y el agua (F) se recargan el doble de rápido (`ENFRIAMIENTO_PUNTAJE_MAX`).
- **Daño a las bases:** una bomba de la Q le quita 3 de vida a una base (`DANO_BOMBA_BASE`) y cada bomba de la R, 0,3 (`ULTI_FACTOR_JEFE` en 1). Las bombas cuentan en todo el dibujo de la base, no solo cerca de su centro, y cada una suma su daño. Las bases se dibujan grandes: 528x264 px la del Nivel 2 y 792x396 la del Nivel 3.
- **Radio de las bombas:** la Q explota en un radio de 80 px (`RADIO_BOMBA`) y mata a los soldados enemigos que alcanza. Cada bomba de la R mata de un golpe a los soldados a menos de 75 px.
- **Furia:** cuando destruyo una torreta, los soldados que la cuidaban (a menos de 170 px) se enfurecen: salen corriendo hacia mis soldados, se acercan más y disparan más seguido.
- **Soldados enemigos:** salen a buscar a mis soldados (camina hacia el aliado más cercano, con la animación de lado o hacia abajo) en vez de quedarse parados. El mapa no avanza mientras quede una torreta, una fila o un soldado enemigo en pantalla.
- **Oleadas de la base:** con la base a la vista (Nivel 2 y 3) ya no hay torretas alrededor. En cambio la base suelta cada 9 a 12 s una oleada de 4 a 6 soldados enemigos, que aparecen de a uno dentro de la base y salen a buscar a mis soldados (`OLEADA_BASE` en `sistemas/nivel/constantes.js`).
- **Aviones enemigos:** entran por arriba (lo más común) o por los costados, nunca desde las bases.
- **Oleadas de aviones:** los aviones enemigos vienen en grupos de 2 o 3. Cuando derroto a todos (o se retiran), empieza una espera de 14 s (`ESPERA_OLEADA`) antes de la siguiente, así puedo ocuparme de las torretas sin que lleguen más enseguida. En los niveles de la base los aviones también salen en oleadas.
- **Punto de control:** cada vez que despejo un grupo de torretas, y al llegar a la base, el juego guarda cuánto llevo (torretas destruidas, distancia, puntaje y botiquines). Si me derriban, la pantalla de derrota ofrece "Continuar desde el punto" (con todas las vidas) o "Empezar el nivel de cero". Se guarda mientras el juego está abierto (no en el disco) y se borra al terminar el nivel o empezar una partida nueva.
- **Tonel (X):** mientras dura (0,5 s) el avión no recibe daño, las balas enemigas que lo tocan salen rebotadas (celestes) y pueden pegarles a los aviones, y si choca con un avión lo destruye sin perder vida. Da un empujón de unos 120 px hacia donde me muevo.
- **Puntaje y final:** el puntaje pasa de un nivel a otro y se ve arriba a la izquierda. Suma: torreta 100, depósito o base 500, avión derribado 150, soldado enemigo 25 y, al terminar cada nivel, 300 más 100 por cada vida que queda. Resta 40 por cada soldado aliado que cae. Al lanzarse en picada, si el puntaje llega a `PUNTAJE_FINAL_BUENO` (7000) se desbloquea el **final alternativo**, donde Quiñones sobrevive. Con menos se ve el **final histórico**, donde muere, y Quiñones aparece **en gris** (su retrato en el tributo y su avión en el ending). Los puntos y la meta están en `PUNTOS` y `PUNTAJE_FINAL_BUENO` (`sistemas/nivel/constantes.js`) y hay que ajustarlos jugando.
- **Soldados caídos:** cuando muere un soldado, aliado o enemigo, queda su cráter (`pose-muerte-aliado.png` y `pose-muerte-enemigo.png`), que llega con un golpe y polvo, baja con el terreno y se desvanece a los 7 s (`CAIDO_PERMANENCIA_MS`). El dibujo es opcional.
- **Aviones enemigos:** entran por arriba y se quedan patrullando en la mitad de arriba de la pantalla (máximo 3 a la vez durante el avance) mientras queden torretas o la base. Cuando destruyes todas las defensas se retiran por arriba.
- **Rumbo del avión:** el avión de Quiñones apunta hacia donde se mueve, en las ocho direcciones (a los lados mira de lado, hacia abajo mira hacia atrás y en las diagonales va a 45°). Gira rápido pero no de golpe y, si se queda quieto, conserva el último rumbo. **Las balas (W y E) salen hacia donde apunta la nariz.** La velocidad de giro se ajusta con `GIRO_JUGADOR`.
- **Quién pelea con quién:** avión contra avión (los aviones enemigos le disparan a mi avión y mis balas W/E les pegan a ellos) y soldados contra torretas y soldados (las torretas y los soldados enemigos solo le disparan a mis soldados aliados, no a mi avión). Cada nido tiene dos soldados enemigos de guardia y la base tiene una guarnición de cinco. Mis soldados se paran a dispararles (0,8 de vida por segundo) y también los matan mis bombas (Q) y el fuego de la R.
- **Guía de puntería:** desde el avión sale una línea punteada con marcas de distancia y un círculo (35 % de opacidad, animada: guiones que corren, una gota-bomba que cae y un anillo que se cierra) que muestra dónde explotará la bomba. Verde = alcanza un objetivo, rojo = lastimaría a tus soldados.
- **Nivel 1:** destruir 6 nidos.
- **Nivel 2:** un indicador arriba muestra los **km** que faltan hasta la base. A los 25 s aparece la base enemiga y, al llegar al centro, **la pantalla se fija**. Aviones enemigos entran por arriba y los costados y hay nidos de defensa. Con **R** hay que decir por radio *"Encontré la ubicación, necesito refuerzos"* (tras 3 intentos fallidos, o sin micrófono, llegan solos). Entran tres escuadras aliadas por abajo, marchan a la base y la desgastan; con bombas y soldados se destruye la base y termina la misión.

## Flujo del juego

`Boot → Preload → Intro → Title → Dni → Modo (1 jugador / multijugador) → Cutscene (palacio) → Cutscene (torre) → Level1 → Cutscene (fin nivel 1) → Level2 → Cutscene (tributo) → End`

## Menú principal

Inspirado en el de GTA IV: Quiñones a la izquierda, el título a la derecha y una barra negra con **Iniciar / Controles / Audio / Créditos** (flechas ← → o A/D + ENTER, o mouse). De fondo, el campo de batalla en vivo (`src/entidades/FondoBatalla.js`) con un overlay negro al 50 %; la pantalla del DNI usa el mismo fondo.

## Audio

La opción **Audio** del menú ajusta por separado el volumen de **música, efectos y voces** (de 10 % en 10 %; con flechas o con el mouse) y se guarda en el navegador (`src/sistemas/audio/ajustes.js`). Los integrantes siguen a la vista en la barra del menú.

## Cierre del ending

Como en el último nivel Quiñones estrella su avión, el cierre del ending (la dedicatoria y el "FIN") ya no muestra un aterrizaje. Es de noche, con estrellas, las luces de la pista encendidas y la torre y el hangar con luz adentro, y depende del final que salió (`finalMalo` en el registro). Está hecho **en 3D con Three.js** (`sistemas/three/CierreTresD.js`):
- **Final histórico:** la pista vacía. Su avión, en gris y transparente, pasa por encima, sube hacia el cielo y se pierde entre las estrellas. La dedicatoria dice "En memoria de".
- **Final alternativo:** Quiñones llega caminando al aeródromo y lo reciben Layla y los soldados, que lo festejan cuando suena el golpe de la música. La dedicatoria dice "En homenaje a".

Se precarga al empezar el ending. Si no se puede cargar Three.js o el navegador no tiene WebGL, se ve una versión en 2D más simple (pista de atardecer con el avión gris que se va subiendo en el histórico, y sin avión en el alternativo).

## Despegue (antes del Nivel 1)

Hay dos versiones. La principal es **en 3D con Three.js** (`sistemas/three/DespegueTresD.js`): la cámara pasa de la torre de control a ir detrás del avión, que acelera por la pista, despega y sube hasta que la cámara queda encima, mirando hacia abajo, como se ve el Nivel 1. Se dibuja a 320x180 y se estira sin suavizar para que quede pixelado. Para usarla hay que instalar la dependencia con `pnpm add three`; si no está instalada (o el navegador no tiene WebGL) se usa la versión en 2D que se describe a continuación, sin errores.

Después de la escena de la torre (o de la sala, en multijugador) viene `DespegueScene`: el avión espera en una pista de aterrizaje vista desde arriba, con la torre de control, el hangar y dos aviones estacionados a un costado, y la manga de viento al otro. Layla (la torre) autoriza el despegue, el avión acelera, levanta polvo y despega: crece y su sombra se separa. La escena termina con el avión en el mismo lugar donde empieza el Nivel 1 y con la velocidad del terreno del nivel. ENTER, ESPACIO o ESC la saltan. La pista, la torre y el hangar se dibujan por código en `src/sistemas/efectos/aerodromo.js` (la pista también la usa el ending). Atajo: menú master, "Despegue (antes del Nivel 1)".

## Ending (créditos)

Después del tributo (o del epílogo del final alternativo) viene un **ending al estilo de los endings de anime** (`EndingScene`): bandas negras de cine y la canción `musica_ending`. Primero los vuelos del avión (hasta el segundo 12,5), después la simulación del juego (bombardeos, combate aéreo, infantería y asedio a la base) con los créditos en paneles que se alternan de costado, 5 s con el título y los aviones en V, y por último el cierre en 3D con la dedicatoria y "FIN". Ahí termina el ending (unos 52 s) y la canción sigue sonando en la línea de tiempo. ENTER, ESPACIO o ESC lo saltan. El guion (qué se ve y en qué segundo) está en `src/sistemas/ending/guion.js`. Atajo: menú master, "Ending (créditos)".

## Línea de tiempo de juegos (final)

Al terminar el ending (la canción sigue sonando) y antes de volver al inicio se muestra una **línea de tiempo estilo Marvel** con los juegos en orden cronológico y en zigzag: *Combate Naval de Angamos* (Grau), *1941: Quebrada Seca* (con la etiqueta "ACABAS DE JUGAR"), un hueco "PRÓXIMAMENTE" y un signo de interrogación. Banda central "FASE UNO". Los textos y las fechas están en `LINEA_TIEMPO` (`config.js`); por defecto las fechas son las de los hechos históricos de cada juego. Logos propios opcionales en `public/assets/ui/`: `logo_grau.png` y `logo_quinones.png` (≈280x120). Atajo: `#linea`.

## Nivel 3 y finales

Historia: Nivel 1 (frontera) → Nivel 2 (Quebrada Seca, depósito) → escena compartida → **Nivel 3 (la base)** → picada → final.

- **Nivel 3:** terreno verdoso, río a la derecha, base grande (sin torretas alrededor: suelta oleadas de soldados enemigos). Funciona como el Nivel 2, pero la base **no se destruye con bombas**: se queda al 25 % de su vida (`baseVidaMinima`) y aparece el aviso **"PULSA ENTER PARA LANZARTE EN PICADA"**. Ese ENTER lanza una escena automática: el avión gira hacia la base, se achica al perder altura dejando humo y estalla en una cadena de explosiones.
- **Final histórico (siempre):** después de la picada viene el tributo del narrador (Quiñones no sobrevivió: dirigió su avión contra la posición antiaérea).
- **Final alternativo (se desbloquea):** si el jugador perdió como máximo 2 soldados (`finalAltMaxBajas`), antes del tributo se ve a Quiñones lanzarse en **paracaídas**, con el cartel **"FINAL ALTERNATIVO"** y la aclaración "Esto NO ocurrió así: es un final inventado por el juego", y un epílogo que aclara que la historia real fue otra.
- Atajos para probarlo: `#nivel3`, `#picada` (base lista para la picada) o el Panel Admin (entradas "Nivel 3: picada (final histórico / alternativo)").
- Arte propio opcional, en `public/assets/`: `sprites/objetivos/base_enemiga.png` (264x132, la base grande; si falta se usa el depósito agrandado; el tamaño se ajusta con `escalaSpriteBase` en `Level3Scene.js`), `sprites/armas/llama.png` (tira de 6 cuadros de 132x132, base de la llama abajo: se usa en las torretas incendiadas, en el fuego del bombardeo especial y en la base en llamas del final alternativo; si falta se dibujan llamas por código), `fondos/terreno_base.png` (256x256, se repite; terreno verdoso), `fondos/rio.png` (200x256, se repite en vertical; la orilla va en el borde izquierdo) y `sprites/aviones/paracaidas.png` (120x120). Mientras no existan se usan un terreno verde y un río dibujados por código.

## Torre de control de Layla (arte)

La pantalla de Layla es una **torre de control**: arriba un ventanal con cielo, nubes y aviones que pasan o despegan; abajo el escritorio con el mapa y la consola (pantalla verde de estado, pantalla ámbar de radio, botones con LED y un radar). Todo se dibuja por código (`src/escenas/estratega/TorreControl.js` y `EstrategaScene.js`), pero se puede reemplazar con arte propio en `public/assets/ui/`:

| Archivo | Qué es | Efecto |
|---|---|---|
| `torre_ventana.png` | Tira horizontal de **cuadros de 1280x150** (por defecto 8 cuadros; si tienes otro número, cambia `frames` en `config.js`) | Reemplaza cielo, nubes y aviones del ventanal con tu animación en bucle (8 cuadros/s). Se conservan el marco, la viga y el escritorio |
| `torre_fondo.png` | Una imagen de **1280x720** | Reemplaza todo el decorado. El mapa (x 26-558, y 166-698) y la consola (x 580-1244, y 172-700) se dibujan encima: ahí no pongas nada importante |

## Combate: bombas, fuego y habilidad especial

- **Bomba (Q):** una cada 3 s. A una torreta le quitan **la mitad de su vida**: se necesitan dos. Con la mitad de vida, la torreta **se incendia** (llamas y humo) y sigue perdiendo vida hasta consumirse: la quemadura es permanente y cada segundo hace más daño (de 0,15 a 0,6 por segundo).
- **Habilidad especial (R), bombardeo de fuego:** durante 1,5 s el avión suelta bombas donde caerían las normales; el jugador "dibuja" la línea con su vuelo (como la ultimate de Rumble). Cada bomba pega con su propio daño (0,3 a una torreta, que tiene 3 de vida; el depósito y la base reciben el 40 %) y deja un foco de fuego. Una torreta que toca el fuego **se prende para siempre**: su quemadura no se apaga y hace más daño cada segundo. Si varias bombas caen en el mismo lugar el fuego se apila (llama más grande y humo). Recarga de 25 s. Layla ve el rastro de fuego en su mapa.
- **El fuego no se apaga solo (F, agua):** se queda donde cayó hasta que Quiñones lo apaga con la bomba de agua (F, recarga de 8 s, radio de 140 px). Mientras haya fuego **el mapa no avanza**, porque los soldados aliados no pasan por las llamas (se detienen antes) y si están dentro se queman (0,5 vidas por segundo) y huyen. Al apagarlo todo, los aliados siguen y el mapa se mueve otra vez.
- Ajustes en `src/sistemas/nivel/constantes.js` (`ESPERA_BOMBA_MS`, `ULTI_*`, `FUEGO_*`, `LINEA_PARADA`, vidas, botiquines) y en `Objetivo.js` (`QUEMA_DPS`).

## Dinámica de avance (torretas)

El mapa **solo avanza mientras no haya torretas por destruir a la vista**. Cuando aparece un grupo y llega cerca del centro de la pantalla (así el avión puede ponerse encima y bombardear), el mapa se detiene (aviso "DESTRUYE TODAS LAS TORRETAS PARA AVANZAR") y no continúa hasta destruirlas todas, con bombas o con la ayuda de los soldados. En el Nivel 2 el progreso hacia la base también depende del terreno recorrido. Mientras el mapa está detenido llega infantería aliada por abajo y marcha hacia la torreta más cercana (con la orden *Mantener* de Layla se queda quieta; con *Atacar…* va a la torreta elegida y la desgasta más rápido). Los botiquines del suelo los puede recoger el piloto volando sobre ellos si le falta vida (+1).

## Multijugador (WebSockets): Quiñones y Layla

Dos personas, dos roles. El modo de un jugador sigue existiendo (Layla es la asistente automática).

| | **Quiñones (piloto)** | **Layla (estratega)** |
|---|---|---|
| Quién | Crea la sala y comparte el código de 4 caracteres | Se une con ese código |
| Pantalla | El juego de siempre: vuela, dispara, bombardea | Una **mesa de mando**: mapa en tiempo real sobre una mesa de madera |
| Información | Ve lo que hay en su pantalla | Ve también lo que **todavía no aparece** (nidos y base llegan 4 s antes) y los km a la base |
| Acciones | Habla por radio (R), pilota | Marca objetivos (bombardear / peligro / aliados), da órdenes a los soldados (avanzar / mantener / atacar un nido), suelta **botiquines** donde quiera y **envía refuerzos** |

- **Radio:** voz → texto → voz sintetizada. Layla **no usa micrófono**: escribe en el chat de su panel (y da clic en el mapa y los botones), y Quiñones la oye con **voz de mujer** sea quien sea quien escriba. Cuando Quiñones habla con T, Layla lo recibe como texto y lo oye con la voz según el género de su DNI. Así no importa el género de la persona que hace de Layla.
- En el Nivel 2 el piloto dice *"Encontré la ubicación, necesito refuerzos"* y Layla pulsa **Enviar refuerzos** (si no responde en 45 s llegan solos).
- Si Layla se desconecta, la asistente automática retoma la radio. En el piloto, B ya no suelta botiquines: se piden a Layla.
- **Historias en paralelo:** al comenzar, Quiñones habla con Prado en el palacio mientras Layla habla con un **general** en el puesto de mando (el general parte al frente con las tropas). Cada uno avanza a su ritmo; quien termina antes ve "Esperando a…", y cuando los dos terminan empieza el Nivel 1 (el piloto despega, Layla pasa a la mesa). Lo mismo entre el Nivel 1 y el Nivel 2. Quiñones lee en voz alta las líneas de su personaje (micrófono); Layla no usa micrófono: sus líneas salen con voz sintetizada de mujer y las avanza con un clic. Los diálogos están en `src/datos/historia.js` (`comando`, `comando_fin1`). El general es un personaje de ficción: falta su sprite (`ui/retratos/retrato_general.png` y `ui/retratos/general_hablar.png`, 132x132; mientras tanto usa un recuadro).
- **Dirección del servidor:** el jugador no la escribe. En producción va dentro del juego: se define `VITE_WS_URL` (por ejemplo `wss://quinones-servidor.onrender.com`) en el build del hosting (Netlify, Vercel o GitHub Actions) y el juego sale apuntando a ese servidor. El campo "Servidor" solo aparece al desarrollar o si la página se abre con `?ws=...` (túneles, pruebas). Al entrar a "Modo de juego" el juego le avisa al servidor para que despierte (Render gratis duerme tras 15 min sin uso y tarda hasta 1 minuto), y la conexión reintenta sola ese tiempo. El `render.yaml` crea las dos partes en Render: el juego como sitio estático (`quinones-juego`, no se duerme) y el servidor de salas (`quinones-servidor`). Después del primer despliegue se completan a mano `VITE_WS_URL` en el juego (la dirección del servidor con `wss://`) y `ORIGENES_PERMITIDOS` en el servidor (la dirección del juego, sin barra final).
- **Diálogos sincronizados:** en las escenas compartidas la línea se muestra y se oye a la vez en los dos dispositivos. Quien la dice avisa justo cuando empieza a repetirla (mensaje `dialogo` con `a: 'fin'`), no cuando termina; la línea de Layla la oye el piloto con voz de mujer desde que empieza; y el piloto no pasa a la siguiente hasta que Layla avisa que terminó de oírla (`a: 'listo'`) o pasan 6 s.
- **Marcas de Layla que guían a los soldados:** *Bombardear* sobre una torreta o la base manda a los soldados a atacarla (si la marca está en el suelo, van hasta ahí y combaten); *Aliados aquí* los reúne en la marca, cada uno en un lugar distinto alrededor; *Peligro* es una zona de unos 95 px que no pisan (y si quedaron dentro, salen). Una orden de atacar manda sobre las marcas, y *Avanzar* o *Mantener* las borran como guía. Las marcas duran 40 s.
- **Barreras de Layla con rotación:** al elegir *Barrera…* aparece una vista previa que sigue al mouse; se gira de 15 en 15 grados con la rueda del mouse o con Q y E, y el clic la coloca con ese ángulo (`barrera` con `a`). Las balas, los soldados y la cobertura respetan el ángulo; en el mapa de Layla cada barrera se ve girada.
- **Final sincronizado:** el piloto avisa qué final fue (`evento` de tipo `final`) y Layla ve el mismo: la animación del paracaídas (final alternativo) o el tributo (final histórico, una escena compartida). El ending empieza en los dos a la vez (esperan al otro con `sync: 'ending'`), nadie puede saltarlo en multijugador y, al terminar, el piloto sigue a la línea de tiempo y Layla vuelve a la torre de control con el cartel de misión terminada (`src/red/espejoFinal.js`).
- **Escena compartida entre niveles:** al terminar el Nivel 1, Quiñones y Layla están en la **misma** escena y se turnan las líneas: Quiñones lee las suyas con el micrófono y las de Layla salen con voz sintetizada de mujer (ella solo da clic para avanzar). El piloto es el líder: la escena pasa a la siguiente línea solo cuando la persona a quien le toca termina de decirla. Al acabar, ambos esperan al otro y empieza el Nivel 2. (En `historia.js`, `compartida: true`.)
- Cómo funciona: el navegador del piloto ejecuta todo el juego y manda una foto del campo de batalla 10 veces por segundo; Layla manda sus órdenes. El servidor (`server/`) solo reparte mensajes entre los dos de cada sala.

### Probarlo en tu computador
```bash
pnpm servidor      # terminal 1: servidor en ws://localhost:8080 (sin dependencias, necesita Node 18+)
pnpm dev           # terminal 2: el juego
```
Abre el juego en **dos ventanas** (solo Quiñones usa el micrófono; Layla solo da clic y escribe en el chat, así que pueden ser dos pestañas del mismo computador). En una: DNI → *Multijugador* → *Crear sala*. En la otra: DNI → *Multijugador* → escribe el código → *Unirme*. El piloto pulsa **Comenzar**.
Si juegan desde dos computadores en la misma red, abre el juego con `?ws=ws://IP-DEL-COMPUTADOR-DEL-SERVIDOR:8080` (o cámbialo en el campo "Servidor").
Prueba automática del servidor: `pnpm servidor:prueba`.

### Publicarlo (Render)
1. Sube el proyecto a GitHub.
2. En [Render](https://render.com): **New → Blueprint** y elige el repositorio (usa `render.yaml`), o **New → Web Service** con *Root Directory* `server`, *Build Command* vacío o `echo ok`, *Start Command* `node index.js`, *Health Check Path* `/health` y el plan gratuito.
3. Copia la dirección que te da Render (`https://xxxx.onrender.com`) y compila el juego con `VITE_WS_URL=wss://xxxx.onrender.com` (en Netlify/Vercel: *Environment variables*; en local: copia `.env.example` a `.env.production`).
4. El plan gratuito **duerme el servicio tras 15 min sin uso** y tarda hasta ~1 min en despertar: el juego lo despierta solo (muestra "Conectando…"). **Antes de la sustentación, crea una sala de prueba** para que esté despierto.
5. Opcional: define `ORIGENES_PERMITIDOS=https://tu-sitio.netlify.app` en Render para aceptar conexiones solo desde tu juego.
> Un sitio `https://` solo puede conectarse a un servidor `wss://` (Render ya lo da).

## Escenas con personajes

`CutsceneScene` muestra dos retratos grandes frente a frente (como en el juego de Grau): el que habla se ilumina y mueve la boca, el otro se atenúa y parpadea.
Los diálogos viven en `src/datos/historia.js` (`PERSONAJES` y `ESCENAS`). Los diálogos de personas reales son **dramatizados** y la escena lo avisa en pantalla; Layla es ficticia.
Opcional: `public/assets/audio/efectos/sfx_texto.mp3` suena mientras se escribe el texto.

## Voces en las escenas

- **Líneas de Quiñones:** el jugador las **lee en voz alta** (micrófono). El texto sale en negrita y atenuado, y cada palabra se ilumina (karaoke) al reconocerse, en orden. **La escena no avanza hasta decir la frase completa**; entonces el juego repite lo dicho con la voz H/M del DNI. Solo se puede continuar con ESPACIO si no hay micrófono (o con `VOCES.permitirSaltar = true`). Para una emergencia en la sustentación, el Panel Admin (Ctrl + Shift + A) permite saltar de escena. Se desactiva con `VOCES.jugadorLeeAQuinones = false` en `src/config.js`.
- **Demás personajes:** audios grabados por tus amigos en `public/assets/audio/voces/<escena>_<nn>.mp3`. Si falta un audio, esa línea la lee la voz del navegador (respaldo), así que se pueden ir agregando de a poco.
- La escena avanza sola al terminar la voz; ESPACIO o clic salta la línea.
- `pnpm guion` genera `docs/GUION-VOCES.md` con las líneas de cada personaje y el nombre exacto de cada archivo (vuélvelo a correr si cambias los diálogos).

## Menú master y fondo animado

- **Panel Admin** (como el del juego de Grau, sin botón visible): **Ctrl + Shift + A** o Ctrl + Alt + M o L3 + R3 (mando), o `#master` al final de la dirección, o 5 clics seguidos en la insignia "D" del título. Panel lateral con la lista de escenas; el juego se congela mientras está abierto. Flechas o D-pad navegan, Enter o Cross entran, Esc o Circle cierran.
- Cuando el juego no puede ocupar toda la ventana, el espacio sobrante muestra un fondo mesh gradient animado (`src/sistemas/efectos/Ambiente.js` + `src/style.css`) que cambia con la escena y reacciona al daño, explosiones, botiquines y radio.

## Estructura

El código está agrupado por tipo de archivo y todo en español. Las carpetas de `src/`:

```
index.html                 contenedor del juego + formulario del DNI (clases .modal-gta de style.css)
src/
  main.js                  configuración de Phaser y registro de escenas
  config.js                tamaños, escalas, textos, MANIFEST de assets y animaciones
  style.css                estilos del contenedor, del fondo animado y de los modales en HTML
  escenas/                 las escenas de Phaser, por parte del juego
    arranque/              Boot, Preload, Intro
    menu/                  Title, Dni, Modo
    historia/              Cutscene, Despegue, FinalAlternativo, LineaTiempo, Ending (créditos), End (derrota)
    niveles/               LevelScene (coordinador), Level1, Level2, Level3
    estratega/             EstrategaScene (la mesa de Layla) y TorreControl (su pantalla)
  sistemas/                lógica sin pantalla propia
    nivel/                 módulos de LevelScene (cada uno se encarga de una sola cosa)
      Aliados, SoldadosEnemigos, Enemigos, Botiquines     quién pelea y ayuda
      Habilidades, Altura, BombardeoEspecial, GuiaBomba   mis habilidades Q, W, E, R, F y la altura de vuelo
      Avance, BaseEnemiga, Picada, Multijugador           cómo avanza el mapa, la base, el final y el modo con Layla
      agua.js, iconos.js, Puntaje.js, constantes.js       la gota de agua, el ícono del tonel, el puntaje y los números de ajuste
    audio/                 audio.js, ajustes.js, pistas.js, musicaMenu.js, VoiceSystem.js
    efectos/               Ambiente (fondo animado), BaseEnLlamas, bomba, aerodromo (pista, torre, hangar)
    ending/                guion.js (qué y cuándo), planos.js (cada plano), efectos.js
    herramientas/          MasterMenu (Ctrl + Shift + A) y placeholders
    three/                 avionNA50.js, el avión en 3D (vista previa en public/vista-avion.html)
  ui/                      kit de interfaz
    nivel/                 Hud, BarraHabilidades, Radio (chat de Layla), MenuPausa
    tema.js, dibujo.js, cabina.js (placas de metal, remaches y teclas del HUD), Modal.js
  entidades/               Objetivo (nido, depósito, base) y FondoBatalla (fondo del menú)
  datos/                   historia.js (personajes y diálogos) y dni.js
  red/                     Red.js, cliente WebSocket del modo multijugador
server/                    servidor de salas (Node, sin dependencias). index.js solo arma las piezas
  src/                     config.js (valores y entorno), websocket.js (el protocolo), Conexion.js (una persona y el protocolo del
                           juego), salas.js, http.js (/health) y mantenimiento.js (pings y limpieza)
  prueba.mjs               prueba con dos clientes reales; prueba-protocolo.mjs, con un socket falso (pnpm prueba, dentro de server/)
scripts/                   herramientas de arte y guion de voces
docs/                      documentos de apoyo (guion de voces)
render.yaml                despliegue del servidor en Render
public/assets/             solo lo que el juego carga (ver abajo)
fuentes/                   lo que no se publica: arte original, archivos .pyxel y audios sin usar
```

## Assets

Todo lo que carga el juego está en `public/assets/`, agrupado por tipo. Lo que no se usa en el juego (originales ampliados,
`.pyxel`, audios viejos) está en `fuentes/` para que no se publique.

```
public/assets/
  audio/
    musica/              musica_*.mp3
    efectos/             sfx_*.mp3
    voces/               <escena>_<nn>.mp3 (grabaciones de tus amigos)
  fondos/                terrenos de los niveles y fondo del palacio
  sprites/
    aviones/             avion_jugador, avion_jugador_danado, avion_enemigo (paracaidas.png opcional)
    armas/               bomba, bala, explosion, llama
    soldados/            soldado_aliado_*, soldado_enemigo_*, pose-muerte-aliado y pose-muerte-enemigo (los cráteres)
    objetivos/           nido_base, nido_arma, deposito, base_suministros (Nivel 2), base_enemiga (Nivel 3), barrera_aliada, botiquin_aire, botiquin_suelo
  ui/
    retratos/            retrato_*, quinones_hablar/parpadeo, layla_hablar/parpadeo, presidente_hablar, yo-pixel
    torre/               torre_fondo, torre_ventana (opcionales, pantalla de Layla)
    logos/               logo_grau, logo_quinones (opcionales, línea de tiempo)
    pantalla_carga.png
  intro/                 logo.png y logo_variante.png (opcionales)
fuentes/
  arte/pyxel/            los .pyxel
  arte/originales/       exportaciones grandes y arte que ya no se usa
  audio/                 audios originales y sin usar
```

Cuando agregues un archivo nuevo, ponlo en la carpeta de su tipo y revisa que la ruta coincida con la del `MANIFEST` de `src/config.js`.

Los PNG del juego están en **tamaño nativo de Pyxel Edit** (sin ampliar) y con fondo transparente.

Si un archivo del manifiesto no existe, el juego usa un placeholder del mismo tamaño.

| Archivo | Tamaño | Estado |
|---|---|---|
| `sprites/aviones/avion_jugador.png`, `avion_jugador_danado.png` | 5 frames de 96x96 (hélice incluida) | listo |
| `sprites/aviones/avion_enemigo.png` | 5 frames de 172x172 (se muestra a 0.55x) | listo |
| `sprites/armas/explosion.png` | 6 frames de 132x132 | listo |
| `sprites/objetivos/nido_base.png`, `nido_arma.png` | 132x132 y 40x69 | listo |
| `sprites/objetivos/base_suministros.png` | 264x132 | listo (la base del Nivel 2) |
| `sprites/objetivos/deposito.png` | 132x132 | respaldo si falta la base del Nivel 2 |
| `sprites/objetivos/botiquin_aire.png`, `botiquin_suelo.png` | 4 frames de 132 y 132x132 | listo |
| `sprites/soldado_aliado_*.png` | frames de 72x72 (arriba 5, abajo 6, derecha 7, disparo 4) | listo |
| `sprites/soldados/soldado_enemigo_dispara_*.png` | 4 frames de 72x72 | listo |
| `sprites/soldados/soldado_enemigo_derecha.png` | 7 frames de 72x72 (caminata, a la izquierda se espeja) | listo |
| `sprites/soldados/pose-muerte-enemigo.png` | 132x132 | listo |
| `sprites/soldados/soldado_enemigo_abajo.png` | 6 frames de 72x72 (caminata hacia abajo) | listo |
| `ui/retratos/yo-pixel.png` | retrato del autor (Créditos), 1086x1448 | listo |
| `sprites/armas/bomba.png`, `bala.png` | 16x24 y 8x8 | **falta** |
| `ui/retrato_*.png` + `quinones_*`, `layla_*`, `presidente_hablar` | 132x132 (hojas de 4 a 7 frames) | listo |
| `fondos/terreno_zarumilla.png`, `terreno_quebrada.png` | 256x256, tile | listo (revisar costura del Nivel 1) |
| `fondos/palacio_fondo.png` | 852x462 | listo |
| `ui/pantalla_carga.png` | 16:9 | **falta** |
| `intro/logo.png`, `logo_variante.png` | logo y variante de la intro (opcionales; si faltan se dibuja uno con texto) | opcional |
| `audio/*.mp3` (`sfx_bomba` (generado), `sfx_disparo`, `sfx_explosion`, `sfx_intro`, `musica_intro`, `musica_menu`, `musica_dialogo`, `sfx_menu_mover`, `sfx_menu_ok`, `sfx_menu_volver`, `musica_level_1`, `musica_level_2`, `musica_nivel_3`, `musica_final`, `musica_ending`) | opcionales | **falta** |

## Voz y DNI

- El DNI se valida (8 dígitos) y se busca en `src/datos/dni.js`. Es una **simulación**: no hay API pública de RENIEC para obtener el género. Agrega ahí tu DNI de prueba. Si el DNI no está, se permite elegir H/M.
- El DNI no se guarda; solo se conserva el género.
- Demuéstralo en **Chrome o Edge de escritorio**, con micrófono permitido e internet (el reconocimiento de voz de Chrome usa un servicio en línea).

## Efectos de sonido propios

`sfx_disparo`, `sfx_bomba` y `sfx_explosion` (y los del menú) están sintetizados desde cero (ruido, tonos y barridos de frecuencia), así que no usan material con derechos de autor.

## Pendiente

- [ ] Hoja de caminata del soldado enemigo, bomba, bala, pantalla de carga y audio
- [ ] Soldados enemigos a pie (cuando exista la hoja de caminata)
- [ ] Revisar la costura de `terreno_zarumilla.png` (se nota al repetirse)
- [ ] Verificar los datos históricos de `src/datos/historia.js` con tus fuentes
- [ ] Aplicar los principios de calidad total del autor elegido (checklist de pruebas por nivel)
- [ ] Publicar en Netlify / Vercel / GitHub Pages, subir archivos a Drive, video y PPT
