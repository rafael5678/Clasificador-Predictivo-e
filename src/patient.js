import { findSymptom } from "./catalog";
import { CONDITIONS } from "./ml/conditions";
import { news2Score } from "./ml/dataset";
import { getModel, predictScore, priorityFromScore } from "./ml/model";

export function comparePriority(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return (a.arrivedAt || 0) - (b.arrivedAt || 0);
}

export function waitingMinutes(patient) {
  if (!patient.arrivedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - patient.arrivedAt) / 60000));
}

export function createPatient(data, model) {
  const trained = model || getModel().model;
  const normalized = {
    ...data,
    age: Number(data.age ?? data.edad),
    heartRate: Number(data.heartRate ?? data.fc),
    spo2: Number(data.spo2),
    systolic: Number(data.systolic ?? data.pas),
    diastolic: Number(data.diastolic ?? data.pad),
    temperature: Number(data.temperature ?? data.temp),
    respiratoryRate: Number(data.respiratoryRate ?? data.fr),
    conditionId: data.conditionId || data.lesionId,
    comorbidityIds: data.comorbidityIds || data.comorbIds || [],
  };
  normalized.edad = normalized.age;
  normalized.fc = normalized.heartRate;
  normalized.pas = normalized.systolic;
  normalized.pad = normalized.diastolic;
  normalized.temp = normalized.temperature;
  normalized.fr = normalized.respiratoryRate;
  normalized.lesionId = normalized.conditionId;
  normalized.comorbIds = normalized.comorbidityIds;
  const score = predictScore(trained, normalized);
  return {
    ...normalized,
    id: data.id || crypto.randomUUID(),
    name: data.name || data.nombre,
    document: data.document || data.doc,
    nombre: data.name || data.nombre,
    doc: data.document || data.doc,
    score,
    news2: news2Score(normalized),
    priority: priorityFromScore(score),
    prioridad: priorityFromScore(score),
    status: data.status || data.estado || "En espera",
    estado: data.status || data.estado || "En espera",
    arrivedAt: data.arrivedAt || data.llegada || Date.now(),
    llegada: data.arrivedAt || data.llegada || Date.now(),
    conditionLabel: findSymptom(normalized.conditionId)?.label || CONDITIONS.find((c) => c.id === normalized.conditionId)?.label,
  };
}
