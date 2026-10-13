let liveSymptoms = [];

export function setSymptomCatalog(rows) {
  liveSymptoms = Array.isArray(rows) ? rows : [];
}

export function symptomCatalog() {
  return liveSymptoms;
}

export function findSymptom(id) {
  if (!id) return null;
  return liveSymptoms.find((c) => c.id === id) || null;
}

export function conditionLabel(id) {
  return findSymptom(id)?.label || "Motivo no indicado";
}
