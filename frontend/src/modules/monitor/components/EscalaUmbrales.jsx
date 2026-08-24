import { Box, Slider, Stack, Typography } from '@mui/material';
import {
  COLOR_BANDA, bandasDeUmbrales, formatearNumero, gradienteDeBandas,
  pasoDeDominio, posicionEnDominio,
} from '../lib/escalaUmbrales.js';

const ALTO_BANDA = 12;

const conUnidad = (valor, unidad) => (unidad ? `${formatearNumero(valor)} ${unidad}` : formatearNumero(valor));

function Extremos({ dominio, unidad }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {conUnidad(dominio.min, unidad)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {conUnidad(dominio.max, unidad)}
      </Typography>
    </Stack>
  );
}

function MarcadorValor({ valor, dominio }) {
  const posicion = posicionEnDominio(valor, dominio);

  return (
    <Box sx={{ position: 'relative', height: 8, mt: 0.5 }}>
      <Box
        sx={{
          position: 'absolute',
          left: `${posicion}%`,
          transform: 'translateX(-50%)',
          width: 2,
          height: 8,
          bgcolor: 'text.primary',
        }}
      />
    </Box>
  );
}

/**
 * Escala visual de los umbrales de una variable. Con onCambiar se vuelve
 * arrastrable; sin el, es solo lectura y puede marcar el valor medido.
 *
 * El dominio lo decide quien la usa: durante una edicion debe salir de los
 * umbrales ya guardados, para que el riel no se mueva mientras se arrastra.
 */
export default function EscalaUmbrales({
  umbralVerde, umbralRojo, unidad, dominio, valorActual, onCambiar, altoMaloPorDefecto,
}) {
  const bandas = bandasDeUmbrales(umbralVerde, umbralRojo, altoMaloPorDefecto);
  if (!bandas || !dominio) return null;

  const fondo = gradienteDeBandas(bandas, dominio);

  if (!onCambiar) {
    return (
      <Box>
        <Box sx={{ height: ALTO_BANDA, borderRadius: 6, background: fondo }} />
        {Number.isFinite(valorActual) && (
          <MarcadorValor valor={valorActual} dominio={dominio} />
        )}
        <Extremos dominio={dominio} unidad={unidad} />
      </Box>
    );
  }

  const paso = pasoDeDominio(dominio, umbralVerde, umbralRojo);
  const verdePrevio = bandas.altoMalo ? bandas.bajo : bandas.alto;
  const rojoPrevio = bandas.altoMalo ? bandas.alto : bandas.bajo;

  /**
   * Las marcas pueden cruzarse: al pasar una sobre la otra se invierte el
   * sentido de la variable. Por eso no basta con leer el par ordenado que
   * entrega el slider; hay que saber cual de las dos se esta arrastrando.
   * La que NO se movio conserva su valor anterior, asi que se identifica por
   * cercania (con tolerancia, porque el paso del riel introduce redondeos).
   */
  const cambiar = (evento, valores, indiceActivo) => {
    const quieta = valores[indiceActivo === 0 ? 1 : 0];
    const arrastraVerde = Math.abs(quieta - rojoPrevio) <= Math.abs(quieta - verdePrevio);

    const fija = arrastraVerde ? rojoPrevio : verdePrevio;
    const previa = arrastraVerde ? verdePrevio : rojoPrevio;
    let movil = valores[indiceActivo];

    if (Math.abs(movil - fija) < paso / 2) {
      const direccion = movil >= previa ? 1 : -1;
      movil = fija + direccion * paso;
      if (movil < dominio.min || movil > dominio.max) movil = fija - direccion * paso;
    }

    onCambiar(arrastraVerde ? { verde: movil, rojo: fija } : { verde: fija, rojo: movil });
  };

  return (
    <Box>
      <Slider
        value={[bandas.bajo, bandas.alto]}
        onChange={cambiar}
        min={dominio.min}
        max={dominio.max}
        step={paso}
        valueLabelDisplay="auto"
        valueLabelFormat={(valor) => conUnidad(valor, unidad)}
        sx={{
          py: 1.5,
          '& .MuiSlider-rail': { background: fondo, opacity: 1, height: ALTO_BANDA },
          '& .MuiSlider-track': { border: 'none', background: 'transparent' },
          '& .MuiSlider-thumb': {
            height: 22,
            width: 22,
            border: '3px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
          },
          '& .MuiSlider-thumb[data-index="0"]': { backgroundColor: COLOR_BANDA[bandas.colorBajo] },
          '& .MuiSlider-thumb[data-index="1"]': { backgroundColor: COLOR_BANDA[bandas.colorAlto] },
        }}
      />
      <Extremos dominio={dominio} unidad={unidad} />
    </Box>
  );
}
