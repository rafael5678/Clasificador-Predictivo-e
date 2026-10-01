import { etiquetaClinica, LESIONES } from "./ml/dataset";
import { news2, obtenerModelo, predecirScore, prioridadDe } from "./ml/modelo";

export function compararPrioridad(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.llegada - b.llegada;
}

const seed = [
  { nombre: "Elena Vargas", doc: "1020-334455", edad: 71, sexo: "F", lesionId: "sca", spo2: 86, fc: 124, pas: 88, pad: 54, temp: 36.4, fr: 28, comorbIds: ["hta", "dm", "iam"], esperaMin: 4 },
  { nombre: "Martín Soto", doc: "0810-998877", edad: 19, sexo: "M", lesionId: "trauma", spo2: 93, fc: 118, pas: 96, pad: 60, temp: 36.9, fr: 22, comorbIds: [], esperaMin: 7 },
  { nombre: "Rosa Beltrán", doc: "0614-112233", edad: 64, sexo: "F", lesionId: "disnea", spo2: 90, fc: 108, pas: 142, pad: 88, temp: 38.6, fr: 26, comorbIds: ["epoc"], esperaMin: 11 },
  { nombre: "Diego Núñez", doc: "0011-556677", edad: 41, sexo: "M", lesionId: "abdomen", spo2: 97, fc: 92, pas: 128, pad: 80, temp: 37.8, fr: 18, comorbIds: [], esperaMin: 16 },
  { nombre: "Lucía Peña", doc: "2233-445566", edad: 8, sexo: "F", lesionId: "fiebre", spo2: 99, fc: 104, pas: 108, pad: 68, temp: 38.2, fr: 22, comorbIds: [], esperaMin: 22 },
  { nombre: "Héctor Ríos", doc: "3344-778899", edad: 55, sexo: "M", lesionId: "cefalea", spo2: 98, fc: 76, pas: 132, pad: 84, temp: 36.6, fr: 14, comorbIds: ["hta"], esperaMin: 28 },
];

let seq = 7;

export function crearPaciente(data, modelo) {
  const m = modelo || obtenerModelo().modelo;
  const score = predecirScore(m, data);
  return {
    id: data.id || crypto.randomUUID(),
    codigo: data.codigo || `P-${String(seq++).padStart(3, "0")}`,
    ...data,
    score,
    news2: news2(data),
    yRef: etiquetaClinica(data),
    prioridad: prioridadDe(score),
    estado: data.estado || "En espera",
    llegada: data.llegada || Date.now(),
    actualizado: Date.now(),
    lesionLabel: LESIONES.find((l) => l.id === data.lesionId)?.label,
  };
}

export function pacientesIniciales(modelo) {
  return seed.map((s) => crearPaciente(s, modelo)).sort(compararPrioridad);
}

export function minutosEspera(p) {
  return Math.max(1, p.esperaMin || Math.floor((Date.now() - p.llegada) / 60000) || 6);
}
