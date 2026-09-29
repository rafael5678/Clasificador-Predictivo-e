export function calcularScore(v) {
  let score = 0;
  const spo2 = Number(v.spo2);
  const fc = Number(v.fc);
  const pas = Number(v.pas);
  const pad = Number(v.pad);
  const temp = Number(v.temp);
  const fr = Number(v.fr);
  const factores = [];

  const add = (pts, nombre, peso) => {
    if (pts > 0) {
      score += pts;
      factores.push({ nombre, peso, pts });
    }
  };

  if (spo2 < 85) add(40, "Saturación de oxígeno", 0.28);
  else if (spo2 < 90) add(28, "Saturación de oxígeno", 0.22);
  else if (spo2 < 94) add(14, "Saturación de oxígeno", 0.16);

  if (fc < 40 || fc > 140) add(22, "Frecuencia cardíaca", 0.18);
  else if (fc < 50 || fc > 120) add(12, "Frecuencia cardíaca", 0.12);

  if (pas < 80 || pas > 200) add(20, "Presión arterial", 0.18);
  else if (pas < 90 || pas > 180) add(12, "Presión arterial", 0.12);

  if (pad < 40 || pad > 120) add(6, "Presión diastólica", 0.06);

  if (temp < 35 || temp >= 39.5) add(12, "Temperatura", 0.1);
  else if (temp >= 38.5) add(6, "Temperatura", 0.06);

  if (fr < 8 || fr > 30) add(14, "Frecuencia respiratoria", 0.12);
  else if (fr < 12 || fr > 24) add(6, "Frecuencia respiratoria", 0.07);

  if (Number(v.edad) >= 65) add(8, "Edad", 0.12);
  if (Number(v.edad) < 2) add(6, "Edad pediátrica", 0.08);

  const comorb = `${v.antecedentes || ""} ${v.motivo || ""}`.toLowerCase();
  if (/infarto|falla cardiaca|epoc|asma/.test(comorb)) add(8, "Antecedentes", 0.08);
  if ((v.sintomas || []).includes("Dolor")) add(4, "Síntomas", 0.05);
  if ((v.sintomas || []).includes("Dificultad respiratoria")) add(8, "Dificultad respiratoria", 0.1);

  const total = Math.min(100, Math.round(score * 10) / 10);
  const sumaPeso = factores.reduce((a, f) => a + f.peso, 0) || 1;
  return {
    score: total,
    factores: factores.map((f) => ({ ...f, peso: Number((f.peso / sumaPeso).toFixed(2)) })),
  };
}

export function prioridadDe(score) {
  if (score >= 50) return "Alta";
  if (score >= 30) return "Media";
  return "Baja";
}

export function compararPrioridad(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.llegada - b.llegada;
}

const seed = [
  { codigo: "P-001", nombre: "Juan Pérez García", doc: "1020-12345678-9", edad: 67, sexo: "M", antecedentes: "HTA, diabetes", motivo: "Dolor torácico", spo2: 86, fc: 118, pas: 86, pad: 52, temp: 38.9, fr: 28, sintomas: ["Dolor", "Dificultad respiratoria"] },
  { codigo: "P-002", nombre: "Carlos Rodríguez", doc: "0810-98765432-1", edad: 34, sexo: "M", antecedentes: "Asma", motivo: "Disnea", spo2: 91, fc: 104, pas: 148, pad: 92, temp: 38.2, fr: 26, sintomas: ["Dificultad respiratoria"] },
  { codigo: "P-003", nombre: "Ana Martínez", doc: "0614-55667788-2", edad: 21, sexo: "F", antecedentes: "Ninguno", motivo: "Fiebre", spo2: 97, fc: 92, pas: 118, pad: 74, temp: 38.4, fr: 20, sintomas: ["Fiebre"] },
  { codigo: "P-004", nombre: "Luis Fernández", doc: "0011-33445566-0", edad: 58, sexo: "M", antecedentes: "EPOC", motivo: "Tos y fatiga", spo2: 93, fc: 96, pas: 142, pad: 88, temp: 37.6, fr: 22, sintomas: ["Tos", "Mareo"] },
  { codigo: "P-005", nombre: "María López", doc: "2233-11223344-5", edad: 45, sexo: "F", antecedentes: "Ninguno", motivo: "Cefalea", spo2: 99, fc: 78, pas: 122, pad: 78, temp: 36.8, fr: 16, sintomas: ["Dolor"] },
];

let seq = 6;

export function crearPaciente(data) {
  const { score, factores } = calcularScore(data);
  return {
    id: crypto.randomUUID(),
    codigo: data.codigo || `P-${String(seq++).padStart(3, "0")}`,
    ...data,
    score,
    factores,
    prioridad: prioridadDe(score),
    estado: data.estado || "En espera",
    llegada: data.llegada || Date.now(),
    actualizado: Date.now(),
    medico: "Dr. Carlos Pérez",
  };
}

export function pacientesIniciales() {
  return seed.map(crearPaciente).sort(compararPrioridad);
}

export function minutosEspera(p) {
  return Math.max(1, Math.floor((Date.now() - p.llegada) / 60000) || p.esperaMin || 8);
}
