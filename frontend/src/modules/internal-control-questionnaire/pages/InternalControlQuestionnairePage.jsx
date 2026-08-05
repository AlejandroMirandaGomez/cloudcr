import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LaunchIcon from '@mui/icons-material/Launch';
import Table from '../../../common/components/basic-table/Table.jsx';
import AuditInfoHeader from '../components/audit-info-header/AuditInfoHeader.jsx';
import { getControles } from '../../control-list/services/controles.js';

const CHIP_SX = { width: 104, justifyContent: 'center' };

const PRIMARIO_COLOR = '#0d47a1';

function CIDChip({ value }) {
  if (!value) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  const isPrimario = value === 'Primario';
  return (
    <Chip
      label={value}
      size="small"
      variant="outlined"
      sx={{
        ...CHIP_SX,
        ...(isPrimario && { color: PRIMARIO_COLOR, borderColor: PRIMARIO_COLOR }),
      }}
    />
  );
}

const COLUMNAS_OCULTAS = { codigo: false, tipo: false };

const columns = [
  { accessorKey: 'norma', header: 'Norma', size: 90 },
  { accessorKey: 'codigo', header: 'Código', size: 90 },
  { accessorKey: 'nombre', header: 'Nombre', size: 240 },
  { accessorKey: 'descripcion', header: 'Descripción', size: 420 },
  {
    id: 'tipo',
    header: 'Tipo',
    accessorFn: (row) => row.tipo.join(', '),
    Cell: ({ row, table }) => {
      const isCompact = table.getState().density === 'compact';
      return (
        <Stack
          direction={isCompact ? 'row' : 'column'}
          useFlexGap
          sx={{ flexWrap: isCompact ? 'wrap' : 'nowrap', gap: '5px' }}
        >
          {row.original.tipo.map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" sx={CHIP_SX} />
          ))}
        </Stack>
      );
    },
    size: 160,
  },
  {
    accessorKey: 'integridad',
    header: 'Integridad',
    Cell: ({ cell }) => <CIDChip value={cell.getValue()} />,
    size: 130,
  },
  {
    accessorKey: 'disponibilidad',
    header: 'Disponibilidad',
    Cell: ({ cell }) => <CIDChip value={cell.getValue()} />,
    size: 140,
  },
  {
    accessorKey: 'confidencialidad',
    header: 'Confidencialidad',
    Cell: ({ cell }) => <CIDChip value={cell.getValue()} />,
    size: 150,
  },
];

const tableOptions = {
  displayColumnDefOptions: {
    'mrt-row-actions': { header: 'Cuestionario', size: 150 },
  },
};

export default function InternalControlQuestionnairePage() {
  const cols = useMemo(() => columns, []);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getControles().then(setControles).finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: 3, pb: 0 }}>
      <Box sx={{ mb: 2 }}>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Volver al inicio
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <AuditInfoHeader />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Table
          columns={cols}
          data={controles}
          storageKey="internal-control-questionnaire"
          defaultColumnVisibility={COLUMNAS_OCULTAS}
          enableRowActions
          renderRowActions={({ row }) => (
            <Tooltip title="Realizar el cuestionario">
              <IconButton
                component={RouterLink}
                to={`/internal-control-questionnaire/${row.original.id}/cuestionario`}
                size="small"
                aria-label="Realizar el cuestionario"
              >
                <LaunchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          tableOptions={tableOptions}
        />
      )}
    </Box>
  );
}
