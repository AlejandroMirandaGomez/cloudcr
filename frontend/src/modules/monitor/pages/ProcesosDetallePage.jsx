import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Chip, Stack, Tooltip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Table from '../../../common/components/basic-table/Table.jsx';
import VariableRowActionsMenu from '../components/VariableRowActionsMenu.jsx';
import PesosToolbar from '../components/PesosToolbar.jsx';
import PesoCell from '../components/PesoCell.jsx';
import usePesosEditables from '../hooks/usePesosEditables.js';
import { formatearMetrica } from '../data/variablesMonitor.js';

const COMPONENTE_ID = 'procesos';

export default function ProcesosDetallePage() {
  const { baseDatosId } = useParams();
  const pesos = usePesosEditables(COMPONENTE_ID);

  const columns = useMemo(
    () => [
      { accessorKey: 'variable', header: 'Variable', size: 200 },
      { accessorKey: 'descripcion', header: 'Descripción', size: 260 },
      {
        accessorKey: 'dato',
        header: 'Dato',
        size: 80,
        Cell: ({ cell }) => <Chip label={cell.getValue()} size="small" variant="outlined" />,
      },
      { accessorKey: 'fuente', header: 'Fuente', size: 220 },
      { accessorKey: 'como', header: 'Cómo', size: 90 },
      {
        id: 'metrica',
        header: 'Métrica',
        accessorFn: formatearMetrica,
        size: 110,
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
    [pesos.editando, pesos.modo, pesos.maximoPara, pesos.editarPeso, pesos.alternarBloqueo],
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
        Procesos
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Variables del indicador de procesos (IP)
      </Typography>

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
        storageKey="monitor-procesos-detalle"
        enableRowActions
        renderRowActions={({ row }) => (
          <VariableRowActionsMenu baseDatosId={baseDatosId} componenteId={COMPONENTE_ID} variableId={row.original.id} />
        )}
        tableOptions={{
          displayColumnDefOptions: { 'mrt-row-actions': { header: 'Acciones', size: 90 } },
        }}
      />
    </Box>
  );
}
