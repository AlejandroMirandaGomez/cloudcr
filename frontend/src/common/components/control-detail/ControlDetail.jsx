import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Box>
      <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
        {label}:{' '}
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Box>
  );
}

function TextSection({ title, children }) {
  if (!children) return null;
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
        {children}
      </Typography>
    </Box>
  );
}

function BulletSection({ title, children }) {
  if (!children) return null;

  const items = children
    .split('\n')
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
        {title}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        {items.map((item, i) => (
          <Typography
            key={i}
            component="li"
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.75, '&:last-of-type': { mb: 0 } }}
          >
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function QuestionsSection({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <Box>
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>
        {items.map((pregunta, i) => (
          <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20 }}>
              {i + 1}.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pregunta}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function BackButton({ to, label }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      startIcon={<ArrowBackIcon />}
      variant="outlined"
      sx={{ mb: 3 }}
    >
      {label}
    </Button>
  );
}

export default function ControlDetail({ control, codigo, backTo, backLabel }) {
  if (!control) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <BackButton to={backTo} label={backLabel} />
        <Typography variant="h6">Control no encontrado</Typography>
        <Typography variant="body2" color="text.secondary">
          No existe un control con el código «{codigo}».
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <BackButton to={backTo} label={backLabel} />

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          {control.nombre}
        </Typography>

        <Stack direction="row" spacing={3} useFlexGap sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Field label="Código" value={control.codigo} />
          <Field label="Norma" value={control.norma} />
          <Field label="Cláusula" value={control.clausula} />
          <Field label="Dominio de la norma" value={control.dominioNorma} />
          <Field label="Peso" value={control.peso} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={1.5}>
          <Field label="Tipo" value={control.tipo?.join(', ')} />
          <Field label="Concepto de ciberseguridad" value={control.conceptoCiberseguridad?.join(', ')} />
          <Field label="Dominio de seguridad" value={control.dominioSeguridad?.join(', ')} />
          <Field label="Capacidades operativas" value={control.capacidadesOperativas?.join(', ')} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
          Propiedades de seguridad
        </Typography>
        <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Field label="Confidencialidad" value={control.confidencialidad || '—'} />
          <Field label="Integridad" value={control.integridad || '—'} />
          <Field label="Disponibilidad" value={control.disponibilidad || '—'} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          <TextSection title="Descripción">{control.descripcion}</TextSection>
          <TextSection title="Propósito">{control.proposito}</TextSection>

          <BulletSection title="Guía">{control.guia}</BulletSection>
          <BulletSection title="Otra información">{control.otraInformacion}</BulletSection>
        </Stack>

        <QuestionsSection title="Preguntas" items={control.preguntas} />
      </Paper>
    </Box>
  );
}
