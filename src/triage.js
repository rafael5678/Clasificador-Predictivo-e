export const NIVELES = {
  TRIAGE_I_ROJO: { label: "Nivel I · Reanimación", short: "I", color: "#e11d48", bg: "rgba(225,29,72,.12)" },
  TRIAGE_II_NARANJA: { label: "Nivel II · Emergencia", short: "II", color: "#ea580c", bg: "rgba(234,88,12,.12)" },
  TRIAGE_III_AMARILLO: { label: "Nivel III · Urgente", short: "III", color: "#ca8a04", bg: "rgba(202,138,4,.14)" },
  TRIAGE_IV_VERDE: { label: "Nivel IV · Menos urgente", short: "IV", color: "#16a34a", bg: "rgba(22,163,74,.12)" },
  TRIAGE_V_AZUL: { label: "Nivel V · No urgente", short: "V", color: "#2563eb", bg: "rgba(37,99,235,.12)" },
};

export function calcularScore(v) {
  let score = 0;
  const spo2 = Number(v.spo2);
  const fc = Number(v.fc);
  const pas = Number(v.pas);
  const pad = Number(v.pad);
  const temp = Number(v.temp);
  const fr = Number(v.fr);

  if (spo2 < 85) score += 40;
  else if (spo2 < 90) score += 28;
  else if (spo2 < 94) score += 14;
  else if (spo2 < 97) score += 4;

  if (fc < 40 || fc > 140) score += 22;
  else if (fc < 50 || fc > 120) score += 12;
  else if (fc < 60 || fc > 100) score += 5;

  if (pas < 80 || pas > 200) score += 20;
  else if (pas < 90 || pas > 180) score += 12;
  else if (pas < 100) score += 6;

  if (pad < 40 || pad > 120) score += 8;

  if (temp < 35 || temp >= 39.5) score += 12;
  else if (temp >= 38.5) score += 6;

  if (fr < 8 || fr > 30) score += 14;
  else if (fr < 12 || fr > 24) score += 6;

  const comorb = (v.antecedentes || "").toLowerCase();
  if (/infarto|iam|falla cardiaca|insuficiencia/.test(comorb)) score += 8;
  if (/epoc|asma|oxigeno/.test(comorb)) score += 6;
  if (/diabetes|hipertens/.test(comorb)) score += 3;
  if (Number(v.edad) >= 75) score += 5;
  if (Number(v.edad) < 2) score += 6;

  return Math.min(100, Math.round(score * 10) / 10);
}

export function nivelDesdeScore(score) {
  if (score >= 70) return "TRIAGE_I_ROJO";
  if (score >= 50) return "TRIAGE_II_NARANJA";
  if (score >= 30) return "TRIAGE_III_AMARILLO";
  if (score >= 15) return "TRIAGE_IV_VERDE";
  return "TRIAGE_V_AZUL";
}

const seed = [
  { nombre: "María López", doc: "10293847", edad: 72, sexo: "F", antecedentes: "HTA, diabetes", spo2: 88, fc: 118, pas: 86, pad: 52, temp: 38.9, fr: 28 },
  { nombre: "Andrés Peña", doc: "44551233", edad: 34, sexo: "M", antecedentes: "Asma", spo2: 96, fc: 88, pas: 122, pad: 78, temp: 37.1, fr: 18 },
  { nombre: "Lucía Torres", doc: "99887711", edad: 8, sexo: "F", antecedentes: "Ninguno", spo2: 99, fc: 102, pas: 108, pad: 68, temp: 37.4, fr: 22 },
  { nombre: "Carlos Ruiz", doc: "22334455", edad: 61, sexo: "M", antecedentes: "EPOC", spo2: 91, fc: 104, pas: 148, pad: 92, temp: 38.2, fr: 26 },
];

export function crearPaciente(data) {
  const score = calcularScore(data);
  const nivel = nivelDesdeScore(score);
  return {
    id: crypto.randomUUID(),
    ...data,
    score,
    nivel,
    estado: "EN_ESPERA",
    llegada: Date.now(),
    actualizado: Date.now(),
  };
}

export function pacientesIniciales() {
  return seed.map(crearPaciente).sort(compararPrioridad);
}

export function compararPrioridad(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return a.llegada - b.llegada;
}
