import { FEATURES, generarDataset, vectorizar, news2, LESIONES } from "./dataset";

function mejorStump(xs, resid) {
  let best = { feat: FEATURES[0], thr: 0, left: 0, right: 0, err: Infinity };
  for (const feat of FEATURES) {
    const vals = [...new Set(xs.map((x) => x[feat]))].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(vals.length / 8));
    for (let i = 0; i < vals.length; i += step) {
      const thr = vals[i];
      let sl = 0, nl = 0, sr = 0, nr = 0;
      xs.forEach((x, k) => {
        if (x[feat] <= thr) {
          sl += resid[k];
          nl++;
        } else {
          sr += resid[k];
          nr++;
        }
      });
      if (!nl || !nr) continue;
      const left = sl / nl;
      const right = sr / nr;
      let err = 0;
      xs.forEach((x, k) => {
        const p = x[feat] <= thr ? left : right;
        const e = resid[k] - p;
        err += e * e;
      });
      if (err < best.err) best = { feat, thr, left, right, err };
    }
  }
  return best;
}

function predStump(t, x) {
  return x[t.feat] <= t.thr ? t.left : t.right;
}

export function entrenarBoost(rows, rondas = 20, lr = 0.16) {
  const xs = rows.map(vectorizar);
  const y = rows.map((r) => r.y);
  const pred = y.map(() => y.reduce((a, b) => a + b, 0) / y.length);
  const trees = [];
  const bias = pred[0];
  for (let r = 0; r < rondas; r++) {
    const resid = y.map((yi, i) => yi - pred[i]);
    const stump = mejorStump(xs, resid);
    trees.push(stump);
    xs.forEach((x, i) => {
      pred[i] += lr * predStump(stump, x);
    });
  }
  return { trees, lr, bias };
}

export function predecirScore(modelo, row) {
  const x = vectorizar(row);
  let p = modelo.bias;
  for (const t of modelo.trees) p += modelo.lr * predStump(t, x);
  if (row.spo2 < 85 || row.pas < 80 || row.fr < 8 || row.fc > 150) p = Math.max(p, 86);
  if (row.lesionId === "paro") p = Math.max(p, 97);
  return Math.min(100, Math.max(0, Math.round(p * 10) / 10));
}

export function prioridadDe(score) {
  if (score >= 78) return { id: "I", nombre: "Reanimación", tono: "i", esi: "ESI I", chip: "Crítica" };
  if (score >= 62) return { id: "II", nombre: "Emergencia", tono: "ii", esi: "ESI II", chip: "Alta" };
  if (score >= 42) return { id: "III", nombre: "Urgente", tono: "iii", esi: "ESI III", chip: "Media" };
  if (score >= 22) return { id: "IV", nombre: "Menos urgente", tono: "iv", esi: "ESI IV", chip: "Baja" };
  return { id: "V", nombre: "No urgente", tono: "v", esi: "ESI V", chip: "Mínima" };
}

export function explicar(modelo, row) {
  const x = vectorizar(row);
  const base = { ...x };
  FEATURES.forEach((f) => {
    const vals = [x[f]];
    base[f] = vals[0];
  });
  const means = {
    edad: 45,
    fc: 82,
    spo2: 97,
    pas: 122,
    pad: 78,
    temp: 36.7,
    fr: 16,
    news: 1,
    shock: 0.67,
    comorb: 2,
    lesion: 30,
  };
  const labels = {
    edad: "Edad",
    fc: "Frecuencia cardíaca",
    spo2: "Saturación SpO₂",
    pas: "Presión sistólica",
    pad: "Presión diastólica",
    temp: "Temperatura",
    fr: "Frecuencia respiratoria",
    news: "NEWS2",
    shock: "Índice de shock",
    comorb: "Comorbilidades",
    lesion: "Gravedad de lesión/enfermedad",
  };
  const yhat = predecirScore(modelo, row);
  return FEATURES.map((f) => {
    const alt = { ...row };
    if (f === "lesion") alt.lesionId = "cura";
    else if (f === "comorb") alt.comorbIds = [];
    else if (f === "news" || f === "shock") return null;
    else alt[f] = means[f];
    const y0 = predecirScore(modelo, alt);
    return { id: f, nombre: labels[f], peso: Math.round((yhat - y0) * 10) / 10 };
  })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.peso) - Math.abs(a.peso));
}

export function similares(dataset, row, k = 4) {
  const x = vectorizar(row);
  return dataset
    .map((d) => {
      const z = vectorizar(d);
      let dist = 0;
      FEATURES.forEach((f) => {
        const s = f === "spo2" || f === "lesion" ? 1.4 : 1;
        dist += s * ((x[f] - z[f]) / 50) ** 2;
      });
      return { ...d, dist };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k);
}

export function metricas(modelo, test) {
  const err = test.map((r) => Math.abs(predecirScore(modelo, r) - r.y));
  const mae = err.reduce((a, b) => a + b, 0) / err.length;
  return { mae: Math.round(mae * 10) / 10, n: test.length, newsPromedio: Math.round(test.reduce((a, r) => a + news2(r), 0) / test.length) };
}

export function importancia(modelo) {
  const c = Object.fromEntries(FEATURES.map((f) => [f, 0]));
  modelo.trees.forEach((t) => {
    c[t.feat] += 1;
  });
  const tot = modelo.trees.length || 1;
  return FEATURES.map((f) => ({ feat: f, p: Math.round((c[f] / tot) * 100) })).sort((a, b) => b.p - a.p);
}

let cache;
export function obtenerModelo() {
  if (cache) return cache;
  const data = generarDataset(140);
  const train = data.slice(0, 112);
  const test = data.slice(112);
  const modelo = entrenarBoost(train);
  cache = {
    modelo,
    data,
    train,
    test,
    metricas: metricas(modelo, test),
    importancia: importancia(modelo),
    lesiones: LESIONES,
  };
  return cache;
}

export { news2, LESIONES, vectorizar };
