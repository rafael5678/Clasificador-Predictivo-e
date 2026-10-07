import { priorityFromScore } from "./ml/model";

export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : "");

async function request(path, options = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Error de API");
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("El servidor tardó en responder (Render se está despertando).");
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
  const list = await request("/api/v1/triage/pacientes", {}, 8000);
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
  }, 25000);
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

export async function login(credentials) {
  return request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  }, 25000);
}

export async function fetchSymptoms() {
  return request("/api/v1/catalogo/sintomas");
}

export async function fetchAdminSymptoms() {
  return request("/api/v1/admin/sintomas");
}

export async function saveSymptom(payload) {
  return request("/api/v1/admin/sintomas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminUsers() {
  return request("/api/v1/admin/users");
}

export async function createUser(payload) {
  return request("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setUserActive(id, activo) {
  return request(`/api/v1/admin/users/${id}/activo?activo=${activo}`, { method: "PATCH" });
}

export const cargarPacientes = fetchPatients;
export const registrarEvaluar = registerAndScore;
export const reevaluarApi = reevaluatePatient;
export const atenderApi = startCare;
