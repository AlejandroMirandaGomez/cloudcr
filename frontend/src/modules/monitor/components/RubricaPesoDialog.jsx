import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link, Skeleton,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import useRubricaPeso from '../hooks/useRubricaPeso.js';
import { PUNTAJE_MAXIMO } from '../lib/rubricaPeso.js';
import { formatearPeso } from '../lib/pesos.js';

/**
 * Resumen de la rubrica de un componente: puntaje, peso actual y peso
 * sugerido por variable, y el boton para aplicar los sugeridos como pesos
 * vigentes. Solo deja aplicar con la rubrica completa.
 */
export default function RubricaPesoDialog({ baseDatosId, componenteId, titulo, indicador, onCerrar, onAplicado }) {
  const { rubrica, listo, error, aplicar } = useRubricaPeso(baseDatosId, componenteId);
  const [aplicando, setAplicando] = useState(false);

  const confirmar = async () => {
    setAplicando(true);
    const resultado = await aplicar();
    setAplicando(false);
    if (resultado.ok) {
      await onAplicado?.();
      onCerrar();
    }
  };

  const variables = rubrica?.variables ?? [];
  const faltantes = rubrica?.faltantes ?? [];
  const completo = rubrica?.completo === true;

  return (
    <Dialog open onClose={onCerrar} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Pesos por rúbrica — {titulo} ({indicador})</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada variable se responde desde su «Ver detalle» con cuatro preguntas (impacto,
          probabilidad, tiempo de reacción y cobertura). El puntaje va de 3 a {PUNTAJE_MAXIMO} y el
          peso sugerido es la parte que ese puntaje representa dentro del componente.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!listo ? (
          <Skeleton variant="rounded" height={260} />
        ) : (
          <>
            {!completo && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Faltan {faltantes.length} variables por responder ({faltantes.join(', ')}). Se muestran
                con puntaje neutro solo como referencia; para aplicar hay que completar la rúbrica.
              </Alert>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variable</TableCell>
                  <TableCell align="right">Puntaje</TableCell>
                  <TableCell align="right">Peso actual</TableCell>
                  <TableCell align="right">Peso sugerido</TableCell>
                  <TableCell align="center">Rúbrica</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variables.map((v) => {
                  const respondida = v.respuestas !== null;
                  return (
                    <TableRow key={v.codigo}>
                      <TableCell>{v.codigo}: {v.variable}</TableCell>
                      <TableCell align="right">
                        {respondida ? v.puntaje : (
                          <Typography component="span" variant="body2" color="text.disabled">
                            {v.puntaje}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatearPeso(v.peso_actual)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatearPeso(v.peso_sugerido)}</TableCell>
                      <TableCell align="center">
                        {respondida ? (
                          <Chip size="small" color="success" variant="outlined" icon={<CheckIcon />} label="Respondida" />
                        ) : (
                          <Link
                            component={RouterLink}
                            to={`/monitor/${baseDatosId}/${componenteId}/${v.codigo}`}
                            variant="body2"
                          >
                            Responder
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={onCerrar} disabled={aplicando}>Cerrar</Button>
          <Button variant="contained" onClick={confirmar} disabled={!listo || !completo || aplicando}>
            Aplicar pesos sugeridos
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
