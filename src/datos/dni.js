// Base de prueba que SIMULA la consulta de género por DNI.
// No existe una API pública de RENIEC para esto, así que se documenta como simulación.
// Agrega aquí DNIs de prueba (H = hombre, M = mujer).
export const DNI_PRUEBA = {
  '12345678': 'H',
  '87654321': 'M',
};

export function generoPorDni(dni) {
  return DNI_PRUEBA[dni] ?? null;
}
