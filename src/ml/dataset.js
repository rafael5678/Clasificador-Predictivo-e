/** Catálogo de motivos clínicos con gravedad base (0–100) aprendida de protocolos ESI/NEWS2. */
export const LESIONES = [
  { id: "paro", label: "Paro cardiorrespiratorio / inconsciencia", grav: 99, esiHint: 1 },
  { id: "avc", label: "Déficit neurológico agudo (ACV)", grav: 94, esiHint: 1 },
  { id: "sca", label: "Dolor torácico / sospecha de SCA", grav: 88, esiHint: 2 },
  { id: "trauma", label: "Trauma de alta energía", grav: 90, esiHint: 1 },
  { id: "disnea", label: "Dificultad respiratoria severa", grav: 82, esiHint: 2 },
  { id: "sepsis", label: "Infección / sospecha de sepsis", grav: 80, esiHint: 2 },
  { id: "anafilaxia", label: "Reacción alérgica grave", grav: 86, esiHint: 1 },
  { id: "hemorragia", label: "Hemorragia activa", grav: 84, esiHint: 2 },
  { id: "abdomen", label: "Dolor abdominal agudo", grav: 52, esiHint: 3 },
  { id: "convulsion", label: "Convulsión reciente", grav: 70, esiHint: 2 },
  { id: "fractura", label: "Fractura / lesión ortopédica", grav: 38, esiHint: 4 },
  { id: "quemadura", label: "Quemadura", grav: 48, esiHint: 3 },
  { id: "cefalea", label: "Cefalea", grav: 26, esiHint: 4 },
  { id: "fiebre", label: "Fiebre sin compromiso hemodinámico", grav: 24, esiHint: 4 },
  { id: "gi", label: "Síntomas gastrointestinales leves", grav: 18, esiHint: 5 },
  { id: "cura", label: "Herida menor / control de cura", grav: 8, esiHint: 5 },
];

export const COMORBILIDADES = [
  { id: "iam", label: "Infarto / cardiopatía isquémica", w: 10 },
  { id: "icc", label: "Falla cardíaca", w: 9 },
  { id: "epoc", label: "EPOC / asma grave", w: 8 },
  { id: "erc", label: "Enfermedad renal crónica", w: 7 },
  { id: "dm", label: "Diabetes", w: 4 },
  { id: "hta", label: "Hipertensión", w: 3 },
  { id: "cancer", label: "Cáncer activo", w: 6 },
  { id: "inmuno", label: "Inmunosupresión", w: 7 },
];

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

export function news2(v) {
  const rr = Number(v.fr);
  const spo2 = Number(v.spo2);
  const temp = Number(v.temp);
  const sbp = Number(v.pas);
  const hr = Number(v.fc);
  let s = 0;
  if (rr <= 8) s += 3;
  else if (rr <= 11) s += 1;
  else if (rr <= 20) s += 0;
  else if (rr <= 24) s += 2;
  else s += 3;
  if (spo2 <= 91) s += 3;
  else if (spo2 <= 93) s += 2;
  else if (spo2 <= 95) s += 1;
  if (temp <= 35) s += 3;
  else if (temp <= 36) s += 1;
  else if (temp <= 38) s += 0;
  else if (temp <= 39) s += 1;
  else s += 2;
  if (sbp <= 90) s += 3;
  else if (sbp <= 100) s += 2;
  else if (sbp <= 110) s += 1;
  else if (sbp >= 220) s += 3;
  if (hr <= 40) s += 3;
  else if (hr <= 50) s += 1;
  else if (hr <= 90) s += 0;
  else if (hr <= 110) s += 1;
  else if (hr <= 130) s += 2;
  else s += 3;
  return s;
}

/** Etiqueta “maestra” clínica (profesor del modelo), 0–100. */
export function etiquetaClinica(row) {
  const n = news2(row);
  const shock = Number(row.fc) / Math.max(40, Number(row.pas));
  const edad = Number(row.edad);
  const les = LESIONES.find((l) => l.id === row.lesionId) || LESIONES[8];
  const comorb = (row.comorbIds || []).reduce((a, id) => {
    const c = COMORBILIDADES.find((x) => x.id === id);
    return a + (c ? c.w : 0);
  }, 0);
  let y = les.grav * 0.38 + (n / 20) * 100 * 0.42 + Math.min(25, (shock - 0.5) * 40) + Math.min(12, edad / 10) * 0.35 + comorb * 0.55;
  if (row.spo2 < 85 || row.pas < 80 || row.fr < 8) y = Math.max(y, 88);
  if (les.esiHint === 1) y = Math.max(y, 78);
  return clamp(Math.round(y * 10) / 10, 0, 100);
}

export function generarDataset(n = 140) {
  const r = rng(20261001);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const les = pick(r, LESIONES);
    const grave = les.grav > 70;
    const edad = Math.floor(2 + r() * 90);
    const comorbIds = COMORBILIDADES.filter(() => r() < (edad > 60 ? 0.28 : 0.12)).map((c) => c.id);
    const row = {
      id: `T-${String(i + 1).padStart(3, "0")}`,
      edad,
      sexo: r() > 0.5 ? "M" : "F",
      fc: clamp(Math.round(grave ? 70 + r() * 90 : 58 + r() * 50), 35, 190),
      spo2: clamp(Math.round(grave ? 82 + r() * 16 : 94 + r() * 6), 70, 100),
      pas: clamp(Math.round(grave ? 75 + r() * 70 : 108 + r() * 40), 60, 220),
      pad: 0,
      temp: clamp(Math.round((grave ? 36 + r() * 4.2 : 36.2 + r() * 1.6) * 10) / 10, 34, 41.5),
      fr: clamp(Math.round(grave ? 12 + r() * 28 : 12 + r() * 10), 6, 44),
      lesionId: les.id,
      comorbIds,
    };
    row.pad = clamp(Math.round(row.pas * (0.55 + r() * 0.12)), 35, 130);
    const y = etiquetaClinica(row);
    row.y = clamp(y + (r() - 0.5) * 8, 0, 100);
    rows.push(row);
  }
  return rows;
}

export const FEATURES = ["edad", "fc", "spo2", "pas", "pad", "temp", "fr", "news", "shock", "comorb", "lesion"];

export function vectorizar(row) {
  const les = LESIONES.find((l) => l.id === row.lesionId);
  const comorb = (row.comorbIds || []).reduce((a, id) => a + (COMORBILIDADES.find((c) => c.id === id)?.w || 0), 0);
  const pas = Number(row.pas) || 120;
  return {
    edad: Number(row.edad) || 0,
    fc: Number(row.fc) || 0,
    spo2: Number(row.spo2) || 0,
    pas,
    pad: Number(row.pad) || 0,
    temp: Number(row.temp) || 0,
    fr: Number(row.fr) || 0,
    news: news2(row),
    shock: Number(row.fc) / Math.max(40, pas),
    comorb,
    lesion: les ? les.grav : 30,
  };
}
