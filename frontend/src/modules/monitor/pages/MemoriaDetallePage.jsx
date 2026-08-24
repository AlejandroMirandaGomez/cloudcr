import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Table from '../../../common/components/basic-table/Table.jsx';
import VariableRowActionsMenu from '../components/VariableRowActionsMenu.jsx';
import PesosToolbar from '../components/PesosToolbar.jsx';
import PesoCell from '../components/PesoCell.jsx';
import EstadoChip, { ESTILO_ESTADO } from '../components/EstadoChip.jsx';
import IndiceComponenteBanner from '../components/IndiceComponenteBanner.jsx';
import usePesosEditables from '../hooks/usePesosEditables.js';
import useAjustesVariables from '../hooks/useAjustesVariables.js';
import useIndiceComponente from '../hooks/useIndiceComponente.js';
import useUmbralesIndice from '../hooks/useUmbralesIndice.js';
import useMediciones from '../hooks/useMediciones.js';
import { estadoDeVariable, formatearUmbrales, formatearValor } from '../lib/estadoVariable.js';

const COMPONENTE_ID = 'memoria';

export default function MemoriaDetallePage() {
  const { baseDatosId } = useParams();
  const ajustes = useAjustesVariables(baseDatosId, COMPONENTE_ID);
  const pesos = usePesosEditables(COMPONENTE_ID, ajustes);
  // Valores reales del ultimo snapshot del collector, refrescados solos.
  const { mediciones } = useMediciones(baseDatosId, COMPONENTE_ID);
  const { umbrales } = useUmbralesIndice(baseDatosId);
  const componente = useIndiceComponente(pesos.filas, mediciones, umbrales.im);

  const columns = useMemo(
    () => [
      { accessorKey: 'variable', header: 'Variable', size: 200 },
      { accessorKey: 'area', header: 'Área', size: 100 },
      { accessorKey: 'fuente', header: 'Fuente', size: 260 },
      { accessorKey: 'como', header: 'Cómo', size: 90 },
      {
        id: 'dato',
        header: 'Dato',
        accessorFn: (row) => estadoDeVariable(row, mediciones).valor,
        Cell: ({ row }) => {
          const estado = estadoDeVariable(row.original, mediciones);
          const texto = formatearValor(estado);
          if (!estado.color) return texto;
          return (
            <Box
              component="span"
              sx={{ color: (theme) => ESTILO_ESTADO[theme.palette.mode]?.[estado.color]?.fg }}
            >
              {texto}
            </Box>
          );
        },
        size: 110,
        muiTableHeadCellProps: {
          sx: { color: (theme) => theme.palette.primary.main },
        },
      },
      {
        id: 'estado',
        header: 'Estado',
        accessorFn: (row) => {
          const { estado, medido } = estadoDeVariable(row, mediciones);
          return estado ?? (medido ? 'Config' : 'Sin dato');
        },
        Cell: ({ row }) => {
          const { estado, color, medido } = estadoDeVariable(row.original, mediciones);
          if (estado) return <EstadoChip color={color} label={estado} />;
          // 'Config' = variable fija (no refleja salud); 'Sin dato' = el
          // collector todavia no la reporto o le falta privilegio.
          return <Chip label={medido ? 'Config' : 'Sin dato'} size="small" variant="outlined" />;
        },
        size: 110,
      },
      {
        id: 'umbrales',
        header: 'Umbrales',
        accessorFn: (row) => formatearUmbrales(row),
        size: 200,
      },
      {
        id: 'peso',
        header: 'Peso',
        accessorFn: (row) => row.porcentaje,
        size: pesos.editando ? 160 : 100,
        Cell: ({ row }) => (
          <PesoCell
            fila={row.original}
            editando={pesos.editando}
            modo={pesos.modo}
            maximo={pesos.maximoPara(row.original.id)}
            onEditar={pesos.editarPeso}
            onAlternarBloqueo={pesos.alternarBloqueo}
          />
        ),
      },
    ],
    [pesos.editando, pesos.modo, pesos.maximoPara, pesos.editarPeso, pesos.alternarBloqueo, mediciones],
  );

  return (
    <Box sx={{ p: 3, pb: 0 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to={`/monitor/${baseDatosId}`} startIcon={<ArrowBackIcon />} variant="outlined">
          Volver al monitor
        </Button>
        <Tooltip title="Disponible próximamente">
          <span>
            <Button startIcon={<AssessmentIcon />} variant="contained" disabled>
              Ver reporte
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Memoria
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Variables del indicador de memoria (IM)
      </Typography>

      <IndiceComponenteBanner titulo="Memoria" indicador="IM" componente={componente} />

      <PesosToolbar
        editando={pesos.editando}
        modo={pesos.modo}
        sumaActual={pesos.sumaActual}
        aviso={pesos.aviso}
        onIniciarEdicion={pesos.iniciarEdicion}
        onCancelar={pesos.cancelar}
        onGuardar={pesos.guardar}
        onCambiarModo={pesos.cambiarModo}
        onRestablecerEquitativo={pesos.restablecerEquitativo}
      />

      <Table
        columns={columns}
        data={pesos.filas}
        storageKey="monitor-memoria-detalle"
        enableRowActions
        renderRowActions={({ row }) => (
          <VariableRowActionsMenu baseDatosId={baseDatosId} componenteId={COMPONENTE_ID} variableId={row.original.id} />
        )}
        tableOptions={{
          displayColumnDefOptions: { 'mrt-row-actions': { header: 'Ver Detalle', size: 90 } },
        }}
      />
    </Box>
  );
}
