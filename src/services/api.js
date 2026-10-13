import { priorityFromScore } from "../ml/model";

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
    if (error.name === "AbortError") throw new Error("The server took too long to respond (Render is waking up).");
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
  const score = Number(row.riskScore ?? row.scoreRiesgo ?? 0);
  const arrivedAt = (row.evaluatedAt || row.evaluadoEn) ? new Date(row.evaluatedAt || row.evaluadoEn).getTime() : Date.now();
  const statusCode = row.status || row.estado;
  const heartRate = row.heartRate ?? row.frecuenciaCardiaca;
  const systolic = row.systolic ?? row.presionSistolica;
  const diastolic = row.diastolic ?? row.presionDiastolica;
  const temperature = row.temperature ?? row.temperatura;
  const respiratoryRate = row.respiratoryRate ?? row.frecuenciaRespiratoria;
  const age = row.age ?? row.edad;
  const name = row.name || row.nombre;
  const document = row.document || row.documento;
  const conditionId = row.conditionId || row.lesionId;
  return {
    id: row.patientId || row.pacienteId,
    name,
    document,
    age,
    sex: row.sex || row.sexo || "M",
    conditionId,
    reason: row.reason || row.motivo || "",
    history: row.history || row.antecedentes || "",
    spo2: row.spo2,
    heartRate,
    systolic,
    diastolic,
    temperature,
    respiratoryRate,
    score,
    news2: row.news2,
    priority: priorityFromScore(score),
    status: STATUS[statusCode] || statusCode || "En espera",
    arrivedAt,
    comorbidityIds: [],
    scoreSource: row.scoreSource || row.fuenteScore,
    iaActive: Boolean(row.aiActive ?? row.iaActiva),
    dangerLead: row.dangerLead,
    aiMeaning: row.aiMeaning || row.meaningIa,
    iaReasons: row.aiReasons || row.razonesIa || [],
    datasetReasons: row.datasetReasons || row.razonesDataset || [],
    geminiReasons: row.geminiReasons || row.razonesGemini || [],
    protocolScore: row.protocolScore ?? row.scoreProtocolo,
    geminiScore: row.geminiScore ?? row.scoreGemini,
  };
}

export async function fetchPatients() {
  const list = await request("/api/v1/triage/patients", {}, 8000);
  return list.map(mapFromApi);
}

function intakeBody(form) {
  const history = (form.comorbidityIds || form.comorbIds || []).join(", ");
  return {
    name: form.name || form.nombre,
    document: form.document || form.doc,
    age: Number(form.age ?? form.edad),
    sex: form.sex || form.sexo,
    conditionId: form.conditionId || form.lesionId,
    reason: form.reason || form.motivo,
    history,
  };
}

function vitalsBody(form, patientId) {
  const body = {
    heartRate: Number(form.heartRate ?? form.fc),
    spo2: Number(form.spo2),
    systolic: Number(form.systolic ?? form.pas),
    diastolic: Number(form.diastolic ?? form.pad),
    temperature: Number(form.temperature ?? form.temp),
    respiratoryRate: Number(form.respiratoryRate ?? form.fr),
  };
  if (patientId) body.patientId = patientId;
  return body;
}

export async function registerAndScore(form) {
  const created = await request("/api/v1/triage/patients", {
    method: "POST",
    body: JSON.stringify(intakeBody(form)),
  }, 25000);
  const scored = await request("/api/v1/triage/evaluations", {
    method: "POST",
    body: JSON.stringify(vitalsBody(form, created.patientId || created.pacienteId)),
  }, 25000);
  return mapFromApi(scored);
}

export async function analyzeTriage(form, localModelScore) {
  const scored = await request("/api/v1/triage/analyze", {
    method: "POST",
    body: JSON.stringify({
      ...intakeBody(form),
      ...vitalsBody(form),
      localModelScore: localModelScore == null ? null : Number(localModelScore),
    }),
  }, 25000);
  return mapFromApi(scored);
}

export async function reevaluatePatient(id, form) {
  const scored = await request(`/api/v1/triage/evaluations/${id}/reassess`, {
    method: "PUT",
    body: JSON.stringify(vitalsBody(form)),
  }, 25000);
  return mapFromApi(scored);
}

export async function startCare(id) {
  return mapFromApi(await request(`/api/v1/triage/care/${id}`, { method: "PATCH" }));
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
  return request("/api/v1/catalog/symptoms");
}

export async function fetchAdminSymptoms() {
  return request("/api/v1/admin/symptoms");
}

export async function saveSymptom(payload) {
  return request("/api/v1/admin/symptoms", {
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

export async function setUserActive(id, active) {
  return request(`/api/v1/admin/users/${id}/active?active=${active}`, { method: "PATCH" });
}
