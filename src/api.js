import { priorityFromScore } from "./ml/model";

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : "");

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error de API");
  }
  return res.json();
}

const STATUS = {
  EN_ESPERA: "En espera",
  EN_ATENCION: "En atención",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
};

export function mapFromApi(row) {
  const score = Number(row.scoreRiesgo || 0);
  const arrivedAt = row.evaluadoEn ? new Date(row.evaluadoEn).getTime() : Date.now();
  return {
    id: row.pacienteId,
    name: row.nombre,
    document: row.documento,
    age: row.edad,
    sex: row.sexo || "M",
    conditionId: row.lesionId,
    reason: row.motivo || "",
    history: row.antecedentes || "",
    spo2: row.spo2,
    heartRate: row.frecuenciaCardiaca,
    systolic: row.presionSistolica,
    diastolic: row.presionDiastolica,
    temperature: row.temperatura,
    respiratoryRate: row.frecuenciaRespiratoria,
    score,
    news2: row.news2,
    priority: priorityFromScore(score),
    status: STATUS[row.estado] || "En espera",
    arrivedAt,
    comorbidityIds: [],
    fc: row.frecuenciaCardiaca,
    pas: row.presionSistolica,
    pad: row.presionDiastolica,
    temp: row.temperatura,
    fr: row.frecuenciaRespiratoria,
    edad: row.edad,
    nombre: row.nombre,
    doc: row.documento,
    lesionId: row.lesionId,
    estado: STATUS[row.estado] || "En espera",
    llegada: arrivedAt,
    prioridad: priorityFromScore(score),
  };
}

export async function fetchPatients() {
  const list = await request("/api/v1/triage/pacientes");
  return list.map(mapFromApi);
}

export async function registerAndScore(form) {
  const created = await request("/api/v1/triage/pacientes", {
    method: "POST",
    body: JSON.stringify({
      nombre: form.name || form.nombre,
      documento: form.document || form.doc,
      edad: Number(form.age ?? form.edad),
      sexo: form.sex || form.sexo,
      lesionId: form.conditionId || form.lesionId,
      motivo: form.reason || form.motivo,
      antecedentes: (form.comorbidityIds || form.comorbIds || []).join(", "),
    }),
  });
  const scored = await request("/api/v1/triage/evaluaciones", {
    method: "POST",
    body: JSON.stringify({
      pacienteId: created.pacienteId,
      frecuenciaCardiaca: Number(form.heartRate ?? form.fc),
      spo2: Number(form.spo2),
      presionSistolica: Number(form.systolic ?? form.pas),
      presionDiastolica: Number(form.diastolic ?? form.pad),
      temperatura: Number(form.temperature ?? form.temp),
      frecuenciaRespiratoria: Number(form.respiratoryRate ?? form.fr),
    }),
  });
  return mapFromApi(scored);
}

export async function reevaluatePatient(id, form) {
  const scored = await request(`/api/v1/triage/evaluaciones/${id}/reevaluar`, {
    method: "PUT",
    body: JSON.stringify({
      frecuenciaCardiaca: Number(form.heartRate ?? form.fc),
      spo2: Number(form.spo2),
      presionSistolica: Number(form.systolic ?? form.pas),
      presionDiastolica: Number(form.diastolic ?? form.pad),
      temperatura: Number(form.temperature ?? form.temp),
      frecuenciaRespiratoria: Number(form.respiratoryRate ?? form.fr),
    }),
  });
  return mapFromApi(scored);
}

export async function startCare(id) {
  return mapFromApi(await request(`/api/v1/triage/atender/${id}`, { method: "PATCH" }));
}

export const cargarPacientes = fetchPatients;
export const registrarEvaluar = registerAndScore;
export const reevaluarApi = reevaluatePatient;
export const atenderApi = startCare;
