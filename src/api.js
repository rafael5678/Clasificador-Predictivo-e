import { prioridadDe } from "./ml/modelo";

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : "");

async function req(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error de API");
  }
  return res.json();
}

const ESTADOS = {
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
};

export function mapFromApi(p) {
  const score = Number(p.scoreRiesgo || 0);
  return {
    id: p.pacienteId,
    codigo: String(p.documento || "").slice(-8),
    nombre: p.nombre,
    doc: p.documento,
    edad: p.edad,
    sexo: p.sexo || "M",
    lesionId: p.lesionId,
    motivo: p.motivo || "",
    antecedentes: p.antecedentes || "",
    spo2: p.spo2,
    fc: p.frecuenciaCardiaca,
    pas: p.presionSistolica,
    pad: p.presionDiastolica,
    temp: p.temperatura,
    fr: p.frecuenciaRespiratoria,
    score,
    news2: p.news2,
    prioridad: prioridadDe(score),
    estado: ESTADOS[p.estado] || "En espera",
    llegada: p.evaluadoEn ? new Date(p.evaluadoEn).getTime() : Date.now(),
    comorbIds: [],
  };
}

export async function cargarPacientes() {
  const list = await req("/api/v1/triage/pacientes");
  return list.map(mapFromApi);
}

export async function registrarEvaluar(form) {
  const p = await req("/api/v1/triage/pacientes", {
    method: "POST",
    body: JSON.stringify({
      nombre: form.nombre,
      documento: form.doc,
      edad: Number(form.edad),
      sexo: form.sexo,
      lesionId: form.lesionId,
      motivo: form.motivo,
      antecedentes: (form.comorbIds || []).join(", "),
    }),
  });
  const ev = await req("/api/v1/triage/evaluaciones", {
    method: "POST",
    body: JSON.stringify({
      pacienteId: p.pacienteId,
      frecuenciaCardiaca: Number(form.fc),
      spo2: Number(form.spo2),
      presionSistolica: Number(form.pas),
      presionDiastolica: Number(form.pad),
      temperatura: Number(form.temp),
      frecuenciaRespiratoria: Number(form.fr),
    }),
  });
  return mapFromApi(ev);
}

export async function reevaluarApi(id, form) {
  const ev = await req(`/api/v1/triage/evaluaciones/${id}/reevaluar`, {
    method: "PUT",
    body: JSON.stringify({
      frecuenciaCardiaca: Number(form.fc),
      spo2: Number(form.spo2),
      presionSistolica: Number(form.pas),
      presionDiastolica: Number(form.pad),
      temperatura: Number(form.temp),
      frecuenciaRespiratoria: Number(form.fr),
    }),
  });
  return mapFromApi(ev);
}

export async function atenderApi(id) {
  return mapFromApi(await req(`/api/v1/triage/atender/${id}`, { method: "PATCH" }));
}
