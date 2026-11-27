# Estructura del proyecto

**1941: Quebrada Seca** es un shooter vertical hecho con Phaser 3 (el juego), Three.js (las partes en 3D), Vite y Tailwind CSS, sobre la guerra de Zarumilla y el piloto José Abelardo Quiñones. Este archivo es el mapa del proyecto: al lado de cada carpeta y archivo va, en una línea, para qué sirve. Cómo se juega y cómo funciona cada mecánica está en `README.md`.

Cómo está organizado:
- `src/` es el código del juego, separado por tipo y en español: `escenas/` (las pantallas de Phaser), `sistemas/` (la lógica, agrupada por tema), `entidades/` (objetos con lógica propia), `ui/` (la interfaz) y `datos/` (textos y diálogos).
- `public/assets/` es lo único que el juego carga: sprites, fondos, música, efectos y voces. Lo que no se publica (arte original, archivos `.pyxel`, audios sin usar) vive en `fuentes/`.
- `server/` es el servidor de salas del multijugador, en Node y sin dependencias. `scripts/` son herramientas de apoyo y `docs/`, documentos.

```
└── 📁quiñones-game  # el juego: un shooter vertical (Phaser 3 + Three.js + Vite) sobre la guerra de Zarumilla y José Abelardo Quiñones
    └── 📁docs  # documentos de apoyo
        ├── GUION-VOCES.md  # lista de líneas por personaje con el nombre exacto de cada grabación (la genera `pnpm guion`)
    └── 📁fuentes  # lo que NO se publica con el juego: arte original, archivos de Pyxel y audios sin usar
        └── 📁arte  # todo el arte fuente
            └── 📁originales  # exportaciones ampliadas (xN) y arte que el juego ya no carga
                └── 📁fondos  # fondos viejos (Arena)
                    ├── Arena-nivel-2.png
                    ├── Arena.png
                └── 📁grau  # arte del juego anterior (Combate Naval de Angamos)
                    ├── grau_chileno.png
                    ├── grau_cuerpo.png
                    ├── grau_esmeralda.png
                    ├── grau_huascar.png
                    ├── grau_menu.png
                    ├── grau_prat.png
                    ├── grau_retrato.png
                    ├── Menu-grau.png
                └── 📁sprites  # sprites ampliados antes de reducirlos a su tamaño nativo (xN = veces que se ampliaron)
                    ├── Bala-Avion-sprite.png
                    ├── Barrera-aliada-x6.png
                    ├── Base_nivel_2_suministros-x10.png
                    ├── Base-final.png
                    ├── Bomba-sprite.png
                    ├── llama-sprite-sheet.png
                    ├── pose-muerte-aliado-sin-borde-x9.png
                    ├── pose-muerte-aliado-x10.png
                    ├── pose-muerte-enemigo-x9.png
                    ├── Soldado_enemigo_abajo-x7.png
                    ├── Soldado_enemigo_caminar_derecha-x7.png
                    ├── soldado_enemigo_dispara_arriba-x10.png
                    ├── Terreno-3-fondo.png
                └── 📁ui  # hojas de retratos y sprites tal como salieron de Pyxel Edit
                    ├── 1c86af85-fb05-4b33-a46b-a1020e513cc6.png
                    ├── Base_Suministros.png
                    ├── Botiquin_paracaidas_sprite_sheet.png
                    ├── botiquin_solo.png
                    ├── Comandante-sprite_sheet-x7.png
                    ├── explosion-sprite-sheet.png
                    ├── Layla_Hablando.png
                    ├── Layla_Pestañar.png
                    ├── Layla.png
                    ├── Metralladora.png
                    ├── Nave_enemiga_movimiento.png
                    ├── Nave_prota_Movimiento_dañada_sprite_sheet.png
                    ├── Nave_prota_Movimiento_sprite_sheet.png
                    ├── Nido_base.png
                    ├── Quiñones-hablar-spritesheet.png
                    ├── Quiñones-parpadeo-spritesheet.png
                    ├── Quiñones.png
                    ├── Soldado_aliado_abajo_sprite_sheet.png
                    ├── Soldado_aliado_apunta_abajo_sprite_sheet.png
                    ├── Soldado_aliado_Apunte_arriba_sprite_sheet.png
                    ├── Soldado_aliado_caminar_derecha_sprite_sheet.png
                    ├── Soldado_aliado_delante_sprite_sheet-2.png
                    ├── Soldado_Enemigo_Apunte_Abajo_sprite_sheet.png
                    ├── Soldado_Enemigo_Apunte_arriba_Sprite_Sheet.png
                    ├── Ugarteche_hablando.png
                    ├── Ugarteche.png
                ├── Palacio-original.png  # el fondo del palacio sin recortar
                ├── pantalla_carga_poster.png  # el póster de donde sale la pantalla de carga (lo usa scripts/pantalla-carga.py)
            └── 📁pyxel  # los dibujos editables de Pyxel Edit (.pyxel): de aquí salen los sprites del juego
                ├── Bala-Avion-sprite.pyxel
                ├── Barrera-aliada.pyxel
                ├── Base_nivel_2_suministros.pyxel
                ├── Base_Suministros.pyxel
                ├── Base-final.pyxel
                ├── Bomba-sprite.pyxel
                ├── Botiquin_paracaidas_sprite_sheet.pyxel
                ├── botiquin_solo.pyxel
                ├── Botiquin-paracaidas.pyxel
                ├── Comandante-sprite_sheet.pyxel
                ├── explosion-sprite-sheet.pyxel
                ├── Layla_Hablando.pyxel
                ├── Layla_Pestañar.pyxel
                ├── Layla.pyxel
                ├── llama-sprite-sheet.pyxel
                ├── Manuel Prado Ugarteche.pyxel
                ├── metralleta.pyxel
                ├── Nave_enemiga_movimiento.pyxel
                ├── Nave_enemiga.pyxel
                ├── pose-muerte-aliado-respaldo.pyxel
                ├── pose-muerte-aliado.pyxel
                ├── Quiñones-hablar.pyxel
                ├── Quiñones-parpadeo.pyxel
                ├── Quiñones-pixel.pyxel
                ├── Soldado_apunta_abajo.pyxel
                ├── Soldado_Apunte_arriba_3.pyxel
                ├── Soldado_Apunte_arriba.pyxel
                ├── Soldado_caminar_derecha.pyxel
                ├── Soldado_delante_sprite_sheet-2.pyxel
                ├── Soldado_enemigo_abajo.pyxel
                ├── Soldado_Enemigo_Apunte_Abajo.pyxel
                ├── Soldado_Enemigo_Apunte_Arriba.pyxel
                ├── Soldado_enemigo_caminar_derecha.pyxel
                ├── Soldado_enemigo.pyxel
                ├── Soldado-abajo.pyxel
                ├── sprite-nave.pyxel
                ├── sprite-sheet-nave-dañada.pyxel
                ├── Ugarteche_hablando.pyxel
        └── 📁audio  # audios fuente
            └── 📁sin-usar  # música que el juego ya no carga
                ├── musica_creditos_finales.mp3
                ├── musica_level_1_old.mp3
                ├── musica_nivel_2_old.mp3
            ├── musica_intro-original.m4a  # la música de la intro sin convertir
    └── 📁public  # lo que se publica tal cual con el juego
        └── 📁assets  # todo lo que el juego carga (el manifiesto está en src/config.js)
            └── 📁audio  # audio del juego
                └── 📁efectos  # efectos de sonido (sfx_*)
                    ├── sfx_bomba.mp3  # bomba y bombardeo de fuego
                    ├── sfx_disparo.mp3  # disparo del avión
                    ├── sfx_explosion.mp3  # explosiones
                    ├── sfx_menu_mover.mp3  # cambiar de opción en los menús
                    ├── sfx_menu_ok.mp3  # confirmar en los menús
                    ├── sfx_menu_volver.mp3  # cerrar un panel o volver
                    ├── sfx_moneda.mp3  # efecto de moneda (por ahora sin uso)
                └── 📁musica  # música (musica_*)
                    ├── musica_dialogo.mp3  # las escenas de diálogo
                    ├── musica_ending.mp3  # el ending con los créditos (y sigue en la línea de tiempo)
                    ├── musica_final.mp3  # el tributo y el epílogo del final alternativo
                    ├── musica_intro.mp3  # la intro
                    ├── musica_level_1.mp3  # Nivel 1
                    ├── musica_level_2_old.mp3  # versión vieja del Nivel 2 (no se usa)
                    ├── musica_level_2.mp3  # Nivel 2
                    ├── musica_menu.mp3  # el menú del título
                    ├── musica_nivel_3.mp3  # Nivel 3
                └── 📁voces  # grabaciones de voz de los personajes: <escena>_<nn>.mp3 (ver docs/GUION-VOCES.md)
                    ├── .gitkeep  # para que Git guarde la carpeta aunque esté vacía
                ├── .gitkeep  # para que Git guarde la carpeta aunque esté vacía
            └── 📁fondos  # terrenos de los niveles y fondo del palacio
                ├── .gitkeep  # para que Git guarde la carpeta aunque esté vacía
                ├── palacio_fondo.png  # el palacio (escenas de diálogo)
                ├── terreno_base.png  # terreno del Nivel 3 (la base)
                ├── terreno_quebrada.png  # terreno del Nivel 2 (Quebrada Seca)
                ├── terreno_zarumilla.png  # terreno del Nivel 1 (Zarumilla), y de fondo del menú y el despegue
            └── 📁intro  # logos opcionales de la intro
            └── 📁sprites  # sprites del juego, a tamaño nativo de Pyxel Edit
                └── 📁armas  # bala, bomba, explosión y llama
                    ├── bala.png
                    ├── bomba.png
                    ├── explosion.png
                    ├── llama.png
                └── 📁aviones  # el avión de Quiñones (normal y dañado) y el enemigo
                    ├── avion_enemigo.png
                    ├── avion_jugador_danado.png
                    ├── avion_jugador.png
                └── 📁objetivos  # torretas, bases, depósito, barrera y botiquines
                    ├── barrera_aliada.png
                    ├── base_enemiga.png
                    ├── base_suministros.png
                    ├── botiquin_aire.png
                    ├── botiquin_suelo.png
                    ├── deposito.png
                    ├── nido_arma.png
                    ├── nido_base.png
                └── 📁soldados  # soldados aliados y enemigos (caminar, disparar) y sus poses de muerte
                    ├── pose-muerte-aliado.png
                    ├── pose-muerte-enemigo.png
                    ├── soldado_aliado_abajo.png
                    ├── soldado_aliado_arriba.png
                    ├── soldado_aliado_derecha.png
                    ├── soldado_aliado_dispara_abajo.png
                    ├── soldado_aliado_dispara_arriba.png
                    ├── soldado_enemigo_abajo.png
                    ├── soldado_enemigo_derecha.png
                    ├── soldado_enemigo_dispara_abajo.png
                    ├── soldado_enemigo_dispara_arriba.png
                ├── .gitkeep  # para que Git guarde la carpeta aunque esté vacía
            └── 📁ui  # imágenes de la interfaz
                └── 📁retratos  # retratos y hojas de "hablar" y "parpadear" de los personajes (y la foto del autor para los créditos)
                    ├── general_hablar.png
                    ├── layla_hablar.png
                    ├── layla_parpadeo.png
                    ├── presidente_hablar.png
                    ├── quinones_hablar.png
                    ├── quinones_parpadeo.png
                    ├── retrato_general.png
                    ├── retrato_presidente.png
                    ├── retrato_protagonista.png
                    ├── retrato_quinones.png
                    ├── yo-pixel.png
                ├── .gitkeep  # para que Git guarde la carpeta aunque esté vacía
                ├── pantalla_carga.png  # la pantalla de carga
        ├── favicon.png  # ícono de la pestaña
        ├── favicon.svg  # ícono de la pestaña (vectorial)
        ├── vista-avion.html  # página para ver el modelo 3D del NA-50 y descargarlo como .glb
    └── 📁scripts  # herramientas de apoyo, fuera del juego
        ├── guion-voces.mjs  # genera docs/GUION-VOCES.md a partir de los diálogos (`pnpm guion`)
        ├── hoja-general.py  # arma los sprites del comandante (hoja de hablar y retrato) a partir de una imagen
        ├── pantalla-carga.py  # arma la pantalla de carga a partir del póster
    └── 📁server  # servidor de salas del modo multijugador (Node, sin dependencias)
        └── 📁src  # las piezas del servidor
            ├── Conexion.js  # una persona conectada y el protocolo del juego (crear sala, unirse, reenviar mensajes)
            ├── config.js  # valores fijos: puerto, versión del protocolo, límites y mensajes permitidos por rol
            ├── http.js  # la ruta /health para saber si el servidor está vivo
            ├── mantenimiento.js  # pings periódicos y limpieza de salas abandonadas
            ├── salas.js  # las salas y sus códigos de 4 letras
            ├── websocket.js  # el protocolo WebSocket hecho a mano (aceptar conexión, leer y armar tramas)
        ├── index.js  # arranque del servidor: arma las piezas de server/src
        ├── package.json  # cómo arrancar el servidor
        ├── prueba-protocolo.mjs  # pruebas del protocolo con un socket falso (sin red)
        ├── prueba.mjs  # prueba con dos clientes reales: salas, mensajes y límites
    └── 📁src  # el código del juego
        └── 📁datos  # datos fijos
            ├── dni.js  # DNIs de prueba y cómo se saca el género (H/M) del DNI
            ├── historia.js  # personajes y diálogos de todas las escenas de historia
        └── 📁entidades  # objetos del juego con su propia lógica
            ├── FondoBatalla.js  # el campo de batalla animado de fondo del menú, el DNI y el modo de juego
            ├── Objetivo.js  # torretas y bases enemigas: vida, daño, fuego, hitbox y barra de vida
        └── 📁escenas  # las escenas de Phaser, agrupadas por parte del juego
            └── 📁arranque  # lo primero que se ve al abrir el juego
                ├── BootScene.js  # carga lo mínimo para mostrar la pantalla de carga
                ├── IntroScene.js  # la intro (cualquier tecla o botón la salta)
                ├── PreloadScene.js  # carga todos los assets, pide "cualquier tecla" y tiene los atajos por URL (#nivel3, #despegue...)
            └── 📁estratega  # la mesa de mando de Layla (multijugador)
                ├── EstrategaScene.js  # el panel táctico de Layla: mapa, marcas, órdenes, botiquines, barreras, chat y refuerzos
                ├── TorreControl.js  # el dibujo de la pantalla de la torre de control de Layla
            └── 📁historia  # escenas de historia y finales
                ├── CutsceneScene.js  # escenas de diálogo con retratos, subtítulos y voz (palacio, torre, tributo...)
                ├── DespegueScene.js  # el despegue antes del Nivel 1 (en 3D con respaldo en 2D)
                ├── EndingScene.js  # el ending al estilo anime: simulación, créditos y cierre en 3D
                ├── EndScene.js  # la pantalla de derrota: continuar desde el punto de control, empezar de cero o salir
                ├── FinalAlternativoScene.js  # el final alternativo (puntaje alto): Quiñones salta en paracaídas
                ├── LineaTiempoScene.js  # la línea de tiempo de juegos y proyectos futuros que cierra el ending
            └── 📁menu  # menú del título y lo que viene antes de jugar
                ├── DniScene.js  # pide el DNI (con teclado numérico para el mando) y saca el género
                ├── ModoScene.js  # elegir un jugador o multijugador y crear o unirse a una sala
                ├── TitleScene.js  # el menú del título: Iniciar, Controles (teclado, Xbox, PlayStation), Audio y Créditos
            └── 📁niveles  # los tres niveles
                ├── Level1Scene.js  # Nivel 1: Zarumilla (destruir 6 posiciones antiaéreas)
                ├── Level2Scene.js  # Nivel 2: Quebrada Seca (aparece el depósito de suministros)
                ├── Level3Scene.js  # Nivel 3: la base final (se acaba con la picada)
                ├── LevelScene.js  # el coordinador de cualquier nivel: crea los módulos de sistemas/nivel y los actualiza
        └── 📁red  # comunicación en red
            ├── Red.js  # cliente WebSocket del modo multijugador
        └── 📁sistemas  # lógica que no es una escena, agrupada por tema
            └── 📁audio  # sonido, música y voz
                ├── ajustes.js  # volúmenes guardados en localStorage
                ├── audio.js  # efectos de sonido (playSfx)
                ├── musicaMenu.js  # la música del menú, que sigue sonando entre pantallas
                ├── pistas.js  # qué pista suena en cada escena, desde qué segundo y con qué ganancia
                ├── VoiceSystem.js  # voz del juego: hablar (síntesis) y escuchar (reconocimiento)
            └── 📁efectos  # efectos visuales
                ├── aerodromo.js  # pista, torre, hangar y manga de viento dibujados por código
                ├── Ambiente.js  # el fondo animado de la página y los pulsos de color
                ├── BaseEnLlamas.js  # la base calcinada y en llamas del final
                ├── bomba.js  # la animación de una bomba (o gota) que cae
            └── 📁ending  # lo que arma el ending
                ├── efectos.js  # animaciones sueltas (deslizar, golpe, volar...)
                ├── guion.js  # el guion del ending: qué plano se ve y en qué segundo
                ├── planos.js  # cada plano del ending (vuelos, bombardeo, créditos, título, cierre)
            └── 📁entrada  # teclado, mando y preferencias de entrada
                ├── etiquetas.js  # los nombres de los botones del mando (Xbox y PlayStation) y cómo se dibujan
                ├── Mando.js  # el mando: lo convierte en teclas virtuales, "cualquier tecla" y zoom con el stick
                ├── navegacionDom.js  # moverse con el mando por los menús hechos con HTML
                ├── preferencias.js  # con qué se juega (mando o teclado) y qué estilo de botones, guardado en localStorage
            └── 📁herramientas  # herramientas de desarrollo
                ├── MasterMenu.js  # el menú de desarrollo (F2) para saltar a cualquier escena
                ├── placeholders.js  # dibuja imágenes temporales cuando falta un asset
            └── 📁nivel  # los módulos de un nivel (cada uno se encarga de una cosa)
                ├── agua.js  # la textura de la gota de agua
                ├── Aliados.js  # mis soldados: entrada, marcha, cobertura, obstáculos, refuerzos y velocidad
                ├── Altura.js  # la altura de vuelo (bajo, normal, alto)
                ├── Avance.js  # cómo avanza el mapa, las oleadas de torretas, las filas de soldados y el freno
                ├── Barreras.js  # las barreras de los aliados: colocación inteligente, vida y cobertura
                ├── BaseEnemiga.js  # la base final: aparición, asedio, oleadas de soldados y refuerzos
                ├── BombardeoEspecial.js  # el bombardeo de fuego (R): bombas, fuego persistente y agua
                ├── Botiquines.js  # los botiquines que caen en paracaídas y curan
                ├── Caidos.js  # los soldados caídos que quedan en el suelo
                ├── Camara.js  # las dos cámaras: la del mundo (sigue y hace zoom) y la de la interfaz
                ├── constantes.js  # todos los números de ajuste del nivel (tiempos, daños, radios, puntajes)
                ├── Enemigos.js  # los aviones enemigos: oleadas, vuelo, altura y disparo
                ├── GuiaBomba.js  # el círculo que muestra dónde cae la bomba
                ├── Habilidades.js  # mis habilidades Q, W, E, F y X: bomba, disparo, ráfaga, agua y tonel
                ├── iconos.js  # el ícono del tonel
                ├── Multijugador.js  # lo que habla con Layla: manda el estado y recibe órdenes, marcas y refuerzos
                ├── Obstaculos.js  # lo que los soldados no atraviesan (barreras, torretas, base) y cómo lo rodean
                ├── Picada.js  # el final del Nivel 3: la picada, la explosión y el final que sigue
                ├── Puntaje.js  # el puntaje, que decide el final alternativo
                ├── PuntoDeControl.js  # el punto de control para continuar un nivel tras perder
                ├── SoldadosEnemigos.js  # los soldados enemigos: guardias, filas, búsqueda, furia y oleadas
            └── 📁three  # las partes en 3D con Three.js
                ├── avionNA50.js  # el modelo 3D del avión NA-50 armado por código
                ├── CierreTresD.js  # el cierre del ending en 3D (distinto según el final)
                ├── DespegueTresD.js  # el despegue en 3D
        └── 📁ui  # la interfaz
            └── 📁nivel  # la interfaz dentro de un nivel
                ├── BarraHabilidades.js  # las casillas de las habilidades con su tecla o botón y su recarga
                ├── Hud.js  # el HUD de cabina: retrato, altímetro, barras, equipo y placas de arriba
                ├── MenuPausa.js  # el menú de pausa
                ├── Radio.js  # el chat de la radio con Layla y las órdenes por voz del modo un jugador
            ├── cabina.js  # el kit de dibujo del HUD: placas de metal, remaches, teclas y rejillas
            ├── dibujo.js  # formas y efectos de dibujo comunes (marcos, barridos, escala de grises)
            ├── iconosControles.js  # los íconos de teclado, mando Xbox y mando PlayStation en pixel art
            ├── Modal.js  # el modal con título y opciones (pausa y derrota)
            ├── tema.js  # colores, fuentes y capas de la interfaz
        ├── config.js  # tamaños, escalas, textos, el MANIFEST de assets y las animaciones
        ├── main.js  # el arranque: configuración de Phaser, registro de escenas, mando y menú de desarrollo
        ├── style.css  # estilos: Tailwind, fondo animado, modales HTML y teclado numérico
    ├── .env.example  # ejemplo de variables de entorno (la dirección del servidor WebSocket)
    ├── .gitignore  # lo que Git no sube (node_modules, música, _to_delete...)
    ├── index.html  # la página: contenedor del juego y formulario del DNI
    ├── package.json  # dependencias (Phaser, Three.js, Vite, Tailwind) y comandos (`pnpm dev`, `pnpm servidor`...)
    ├── pnpm-lock.yaml  # versiones exactas de las dependencias
    ├── pnpm-workspace.yaml  # configuración de pnpm
    ├── README.md  # la documentación del juego: cómo se juega, mecánicas y estructura
    ├── render.yaml  # cómo se despliega el servidor en Render
    └── vite.config.js  # configuración de Vite (Tailwind y manejo de assets que faltan)
```
