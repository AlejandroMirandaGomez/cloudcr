import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Checkbox, Chip, MenuItem, Select, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Table from '../../../common/components/basic-table/Table.jsx';
import AuditInfoHeader from '../components/AuditInfoHeader.jsx';
import RowActionsMenu from '../components/RowActionsMenu.jsx';
import { getFilas, setRespuesta } from '../data/answersStore.js';

const CHIP_SX = { width: 104, justifyContent: 'center' };

const PRIMARIO_COLOR = '#0d47a1';

const OPCIONES_CUMPLE = ['No', 'Sí', 'N/A'];

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

function checkColumn({ campo, header, onRespuesta }) {
  return {
    accessorKey: campo,
    header,
    size: 150,
    grow: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    muiTableHeadCellProps: { align: 'center' },
    muiTableBodyCellProps: { align: 'center' },
    Cell: ({ cell, row }) => (
      <Checkbox
        size="small"
        checked={cell.getValue()}
        onChange={(e) => onRespuesta(row.original.id, campo, e.target.checked)}
        sx={{ p: 0.5, '&.Mui-checked': { color: PRIMARIO_COLOR } }}
      />
    ),
  };
}

function buildColumns(onRespuesta) {
  return [
    { accessorKey: 'norma', header: 'Norma', size: 90 },
    { accessorKey: 'nombre', header: 'Nombre', size: 240 },
    { accessorKey: 'enunciado', header: 'Enunciado', size: 420 },
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
    checkColumn({ campo: 'documentado', header: '¿Está documentado?', onRespuesta }),
    checkColumn({ campo: 'repetible', header: '¿Es repetible?', onRespuesta }),
    checkColumn({ campo: 'evidencia', header: '¿Tiene evidencia?', onRespuesta }),
    {
      accessorKey: 'cumple',
      header: '¿Cumple?',
      size: 130,
      grow: false,
      enableGlobalFilter: false,
      filterVariant: 'select',
      filterSelectOptions: OPCIONES_CUMPLE,
      muiTableHeadCellProps: { align: 'center' },
      muiTableBodyCellProps: { align: 'center' },
      Cell: ({ cell, row }) => (
        <Select
          size="small"
          value={cell.getValue()}
          onChange={(e) => onRespuesta(row.original.id, 'cumple', e.target.value)}
          sx={{
            minWidth: 92,
            backgroundColor: 'transparent',
            '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' },
          }}
        >
          {OPCIONES_CUMPLE.map((op) => (
            <MenuItem key={op} value={op}>{op}</MenuItem>
          ))}
        </Select>
      ),
    },
  ];
}

const tableOptions = {
  displayColumnDefOptions: {
    'mrt-row-actions': { header: 'Opciones' },
  },
};

export default function InternalControlQuestionnairePage() {
  const [filas, setFilas] = useState(getFilas);

  const onRespuesta = useCallback((id, campo, valor) => {
    setFilas(setRespuesta(id, campo, valor));
  }, []);

  const cols = useMemo(() => buildColumns(onRespuesta), [onRespuesta]);

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

      <Table
        columns={cols}
        data={filas}
        storageKey="internal-control-questionnaire"
        enableRowActions
        renderRowActions={({ row }) => <RowActionsMenu codigo={row.original.codigo} />}
        tableOptions={tableOptions}
      />
    </Box>
  );
}
