import { useCallback, useMemo, useState } from 'react';
import {
  MODO_PORCENTAJE_EXACTO,
  MODO_PESOS_RELATIVOS,
  convertirModo1AModo2,
  convertirModo2AModo1,
  distribuirEquitativo,
  editarPesoModo1,
  editarPesoModo2,
  maxEditable,
  porcentajesDesdeModo2,
  puedeBloquear,
} from '../lib/pesos.js';
import {
  actualizarPesos,
  getComponente,
  getPesos,
  getPreferenciaPesos,
} from '../data/variablesMonitor.js';

const leerDelStore = (componenteId) => ({
  pesos: getPesos(componenteId),
  preferencia: getPreferenciaPesos(componenteId),
});

export default function usePesosEditables(componenteId, ajustes = null) {
  const componente = getComponente(componenteId);
  const version = ajustes?.version ?? 0;

  const [guardado, setGuardado] = useState(() => leerDelStore(componenteId));
  const [borrador, setBorrador] = useState(null);
  const [aviso, setAviso] = useState('');

  const [clave, setClave] = useState(`${componenteId}:${version}`);
  const claveActual = `${componenteId}:${version}`;

  if (clave !== claveActual) {
    setClave(claveActual);
    setGuardado(leerDelStore(componenteId));
    setBorrador(null);
  }

  const editando = borrador !== null;
  const modo = borrador?.modo ?? guardado.preferencia.modo;
  const bloqueados = borrador?.bloqueados ?? guardado.preferencia.bloqueados;
  const pesos = borrador?.pesos ?? guardado.pesos;

  const porcentajes = useMemo(
    () => (modo === MODO_PESOS_RELATIVOS ? porcentajesDesdeModo2(pesos) : pesos),
    [modo, pesos],
  );

  const filas = useMemo(() => {
    if (!componente) return [];
    const pesoPorId = new Map(pesos.map((p) => [p.id, p.valor]));
    const porcentajePorId = new Map(porcentajes.map((p) => [p.id, p.valor]));

    return componente.variables.map((variable) => ({
      ...variable,
      peso: pesoPorId.get(variable.id) ?? variable.peso,
      porcentaje: porcentajePorId.get(variable.id) ?? variable.peso,
      bloqueada: bloqueados.includes(variable.id),
    }));
  }, [componente, pesos, porcentajes, bloqueados]);

  const sumaActual = useMemo(
    () => Math.round(pesos.reduce((acumulado, p) => acumulado + p.valor, 0) * 100) / 100,
    [pesos],
  );

  const iniciarEdicion = useCallback(() => {
    const preferencia = getPreferenciaPesos(componenteId);
    setAviso('');
    setBorrador({
      pesos: getPesos(componenteId),
      modo: preferencia.modo,
      bloqueados: preferencia.bloqueados,
    });
  }, [componenteId]);

  const cancelar = useCallback(() => {
    setBorrador(null);
    setAviso('');
  }, []);

  const guardar = useCallback(async () => {
    if (!borrador) return;

    const porcentajesExactos = convertirModo2AModo1(borrador.pesos);

    actualizarPesos(componenteId, porcentajesExactos, {
      modo: MODO_PORCENTAJE_EXACTO,
      bloqueados: [],
    });

    setBorrador(null);
    setAviso('');
    setGuardado(leerDelStore(componenteId));

    if (ajustes?.persistir) await ajustes.persistir();
  }, [borrador, componenteId, ajustes]);

  const cambiarModo = useCallback((nuevoModo) => {
    if (!nuevoModo) return;
    setAviso('');
    setBorrador((actual) => {
      if (!actual || actual.modo === nuevoModo) return actual;

      if (nuevoModo === MODO_PESOS_RELATIVOS) {
        return { pesos: convertirModo1AModo2(actual.pesos), modo: nuevoModo, bloqueados: [] };
      }

      return {
        pesos: convertirModo2AModo1(actual.pesos),
        modo: nuevoModo,
        bloqueados: [],
      };
    });
  }, []);

  const editarPeso = useCallback((id, valor) => {
    setAviso('');
    setBorrador((actual) => {
      if (!actual) return actual;

      const pesosNuevos = actual.modo === MODO_PESOS_RELATIVOS
        ? editarPesoModo2({ pesos: actual.pesos, id, nuevoValor: valor })
        : editarPesoModo1({
          pesos: actual.pesos,
          bloqueados: actual.bloqueados,
          id,
          nuevoValor: valor,
        });

      return { ...actual, pesos: pesosNuevos };
    });
  }, []);

  const alternarBloqueo = useCallback((id) => {
    setBorrador((actual) => {
      if (!actual || actual.modo !== MODO_PORCENTAJE_EXACTO) return actual;

      if (actual.bloqueados.includes(id)) {
        setAviso('');
        return { ...actual, bloqueados: actual.bloqueados.filter((otro) => otro !== id) };
      }

      const validacion = puedeBloquear({
        pesos: actual.pesos,
        bloqueados: actual.bloqueados,
        id,
      });

      if (!validacion.ok) {
        setAviso(validacion.motivo);
        return actual;
      }

      setAviso('');
      return { ...actual, bloqueados: [...actual.bloqueados, id] };
    });
  }, []);

  const restablecerEquitativo = useCallback(async () => {
    setAviso('');

    if (!borrador) {
      const equitativos = distribuirEquitativo(guardado.pesos.map((p) => p.id));
      actualizarPesos(componenteId, equitativos, {
        modo: MODO_PORCENTAJE_EXACTO,
        bloqueados: [],
      });
      setGuardado(leerDelStore(componenteId));
      if (ajustes?.persistir) await ajustes.persistir();
      return;
    }

    setBorrador((actual) => ({
      ...actual,
      pesos: distribuirEquitativo(actual.pesos.map((p) => p.id)),
      bloqueados: [],
    }));
  }, [borrador, componenteId, guardado, ajustes]);

  const maximoPara = useCallback(
    (id) => (modo === MODO_PORCENTAJE_EXACTO ? maxEditable({ pesos, bloqueados, id }) : 100),
    [modo, pesos, bloqueados],
  );

  return {
    filas,
    editando,
    modo,
    bloqueados,
    sumaActual,
    aviso,
    iniciarEdicion,
    cancelar,
    guardar,
    cambiarModo,
    editarPeso,
    alternarBloqueo,
    restablecerEquitativo,
    maximoPara,
  };
}
