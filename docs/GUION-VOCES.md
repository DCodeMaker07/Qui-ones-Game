# Guion de voces

Cada persona graba **solo las líneas de su personaje**. Cada línea es un archivo independiente.
Los archivos van en `public/assets/audio/voces/` con el nombre exacto de la tabla.

## Cómo grabar
- Un lugar silencioso, el celular a unos 20 cm de la boca, sin música de fondo.
- Una línea por audio, con la emoción del personaje. Deja casi sin silencio al inicio y al final.
- Formato **mp3** (mono, 44.1 kHz o 22 kHz). Si grabas en m4a o wav, conviértelo (Audacity, ffmpeg o un convertidor en línea).
- Si falta un archivo, el juego lee esa línea con la voz del navegador, así que se puede ir sumando de a poco.

> Escenas con `ESCENA DRAMATIZADA`: los diálogos de personas reales son ficción para el juego, no citas históricas.

## PRESIDENTE PRADO (voz masculina)


| Archivo | Escena | Texto |
|---|---|---|
| `palacio_02.mp3` | palacio | Piloto, la frontera norte necesita apoyo desde el aire. |
| `palacio_05.mp3` | palacio | Que la Fuerza Aérea cumpla su misión. El país cuenta con ustedes. |

## QUIÑONES (voz masculina)

_Estas líneas las lee el jugador por micrófono (`jugadorLeeAQuinones` = true en `src/config.js`); solo se graban si ese valor pasa a `false`._

| Archivo | Escena | Texto |
|---|---|---|
| `palacio_03.mp3` | palacio | La escuadrilla está lista. Despegaremos de Tumbes. |
| `palacio_06.mp3` | palacio | Así será. Cumpliremos. |
| `torre_02.mp3` | torre | Recibido, torre. ¿Cómo nos comunicamos? |
| `torre_04.mp3` | torre | Entendido. Las tropas de tierra avanzarán detrás de nosotros. |
| `fin_nivel1_03.mp3` | fin_nivel1 | ¿Cuál es el siguiente objetivo, torre? |
| `fin_nivel1_05.mp3` | fin_nivel1 | Vamos allá. |
| `fin_nivel2_02.mp3` | fin_nivel2 | Entonces vamos por la base. Que no quede nada en pie. |
| `fin_nivel2_04.mp3` | fin_nivel2 | Entendido, torre. Voy. |

## GENERAL (voz masculina)


| Archivo | Escena | Texto |
|---|---|---|
| `comando_02.mp3` | comando | Layla, las tropas de tierra están listas en la frontera, pero no podemos avanzar sin cobertura aérea. |
| `comando_04.mp3` | comando | Yo iré al frente con la infantería. Tú serás nuestros ojos: guía al piloto por radio. |
| `comando_06.mp3` | comando | Bien. Cuando el piloto despegue, comienza el avance. Suerte. |

## LAYLA (voz femenina)


| Archivo | Escena | Texto |
|---|---|---|
| `comando_03.mp3` | comando | Entendido, mi general. Quiñones despegará apenas reciba sus órdenes. |
| `comando_05.mp3` | comando | Cuente conmigo. Le marcaré cada objetivo y le avisaré de cualquier peligro. |
| `torre_01.mp3` | torre | Aquí la torre. Soy Layla, tu enlace de radio. |
| `torre_03.mp3` | torre | Pulsa T y habla: yo repito tus órdenes. Con B pido un botiquín para las tropas. |
| `torre_05.mp3` | torre | Despeja los nidos con bombas y cuida a los soldados. ¡Buen vuelo! |
| `fin_nivel1_01.mp3` | fin_nivel1 | Posiciones despejadas. Las tropas avanzan. |
| `fin_nivel1_04.mp3` | fin_nivel1 | Quebrada Seca. Un depósito de suministros sostiene la posición enemiga. |
| `fin_nivel2_01.mp3` | fin_nivel2 | Depósito destruido. Sin suministros, la base enemiga queda expuesta. |
| `fin_nivel2_03.mp3` | fin_nivel2 | La infantería te cubre desde tierra. Cuida a los soldados: cada uno cuenta. |

## NARRADOR (voz masculina o la de quien narre)

| Archivo | Escena | Texto |
|---|---|---|
| `palacio_01.mp3` | palacio | Julio de 1941. La disputa fronteriza entre Perú y Ecuador desemboca en el conflicto de Zarumilla. |
| `palacio_04.mp3` | palacio | La Fuerza Aérea opera con aviones North American NA-50, apodados "Torito". |
| `comando_01.mp3` | comando | Mientras tanto, en el puesto de mando de Tumbes… |
| `comando_07.mp3` | comando | El general parte hacia el frente. Layla toma la radio y espera la señal del piloto. |
| `fin_nivel1_02.mp3` | fin_nivel1 | El 23 de julio de 1941, la 41.ª Escuadrilla despega de Tumbes rumbo a Quebrada Seca. |
| `epilogo_alt_01.mp3` | epilogo_alt | Ese final alternativo es una invención del juego: no ocurrió así. |
| `epilogo_alt_02.mp3` | epilogo_alt | La historia real fue otra. |
| `tributo_01.mp3` | tributo | Ese día, José Abelardo Quiñones Gonzales participó en el ataque a baja altura contra Quebrada Seca. |
| `tributo_02.mp3` | tributo | Su avión fue alcanzado por fuego enemigo y lo dirigió contra la posición antiaérea, entregando su vida. |
| `tributo_03.mp3` | tributo | En su honor, cada 23 de julio se celebra el Día de la Fuerza Aérea del Perú. |
