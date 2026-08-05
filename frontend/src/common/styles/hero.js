/** Fondo tipo hero: degradado claro azul→lavanda con círculos suaves superpuestos. */
export const heroBackgroundSx = {
  position: 'relative',
  overflow: 'hidden',
  background: `
    radial-gradient(circle at 12% 85%, rgba(122, 168, 250, 0.55) 0%, transparent 55%),
    radial-gradient(circle at 88% 15%, rgba(200, 176, 250, 0.5) 0%, transparent 55%),
    radial-gradient(circle at 55% 105%, rgba(150, 190, 250, 0.45) 0%, transparent 50%),
    linear-gradient(135deg, #d6e4fb 0%, #e7dcf9 100%)
  `,
};
