/**
 * Fondo tipo hero por modo: degradado teal con círculos suaves sobre crema en
 * claro; teal profundo sobre carbón en oscuro. Incluye el color de texto
 * adecuado para cada fondo.
 */
export function heroSx(mode) {
  if (mode === 'dark') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#f0ede6',
      background: `
        radial-gradient(circle at 12% 85%, rgba(93, 202, 165, 0.3) 0%, transparent 55%),
        radial-gradient(circle at 88% 15%, rgba(79, 209, 197, 0.25) 0%, transparent 55%),
        radial-gradient(circle at 55% 105%, rgba(93, 202, 165, 0.2) 0%, transparent 50%),
        linear-gradient(135deg, #16221d 0%, #14201f 100%)
      `,
    };
  }
  return {
    position: 'relative',
    overflow: 'hidden',
    color: '#1a1a1a',
    background: `
      radial-gradient(circle at 12% 85%, rgba(15, 110, 86, 0.28) 0%, transparent 55%),
      radial-gradient(circle at 88% 15%, rgba(43, 169, 138, 0.24) 0%, transparent 55%),
      radial-gradient(circle at 55% 105%, rgba(15, 110, 86, 0.2) 0%, transparent 50%),
      linear-gradient(135deg, #eef0e2 0%, #f5f1e8 100%)
    `,
  };
}
