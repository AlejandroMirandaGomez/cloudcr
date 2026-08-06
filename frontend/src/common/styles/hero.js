/**
 * Fondo tipo hero por modo: degradado azul→lavanda con círculos suaves en
 * claro; violetas profundos sobre carbón en oscuro. Incluye el color de texto
 * adecuado para cada fondo.
 */
export function heroSx(mode) {
  if (mode === 'dark') {
    return {
      position: 'relative',
      overflow: 'hidden',
      color: '#ece8f7',
      background: `
        radial-gradient(circle at 12% 85%, rgba(90, 110, 220, 0.35) 0%, transparent 55%),
        radial-gradient(circle at 88% 15%, rgba(150, 100, 230, 0.3) 0%, transparent 55%),
        radial-gradient(circle at 55% 105%, rgba(90, 140, 220, 0.25) 0%, transparent 50%),
        linear-gradient(135deg, #211d38 0%, #251c3d 100%)
      `,
    };
  }
  return {
    position: 'relative',
    overflow: 'hidden',
    color: '#1a1a2e',
    background: `
      radial-gradient(circle at 12% 85%, rgba(122, 168, 250, 0.55) 0%, transparent 55%),
      radial-gradient(circle at 88% 15%, rgba(200, 176, 250, 0.5) 0%, transparent 55%),
      radial-gradient(circle at 55% 105%, rgba(150, 190, 250, 0.45) 0%, transparent 50%),
      linear-gradient(135deg, #d6e4fb 0%, #e7dcf9 100%)
    `,
  };
}
