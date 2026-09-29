import { useMemo, useState } from "react";
import {
  NIVELES,
  compararPrioridad,
  crearPaciente,
  pacientesIniciales,
  calcularScore,
  nivelDesdeScore,
} from "./triage";

const vacio = {
  nombre: "",
  doc: "",
  edad: "",
  sexo: "M",
  antecedentes: "",
  spo2: "",
  fc: "",
  pas: "",
  pad: "",
  temp: "",
  fr: "",
};

export default function App() {
  const [pacientes, setPacientes] = useState(pacientesIniciales);
  const [form, setForm] = useState(vacio);
  const [tab, setTab] = useState("cola");
  const [sel, setSel] = useState(null);
  const [ok, setOk] = useState("");

  const cola = useMemo(
    () => pacientes.filter((p) => p.estado === "EN_ESPERA").sort(compararPrioridad),
    [pacientes]
  );
  const atencion = pacientes.filter((p) => p.estado === "EN_ATENCION");
  const criticos = cola.filter((p) => p.score >= 50).length;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function registrar(e) {
    e.preventDefault();
    const p = crearPaciente({
      ...form,
      edad: Number(form.edad),
      spo2: Number(form.spo2),
      fc: Number(form.fc),
      pas: Number(form.pas),
      pad: Number(form.pad),
      temp: Number(form.temp),
      fr: Number(form.fr),
    });
    setPacientes((list) => [p, ...list].sort(compararPrioridad));
    setForm(vacio);
    setTab("cola");
    setOk(`${p.nombre} ingresó · score ${p.score} · ${NIVELES[p.nivel].label}`);
    setTimeout(() => setOk(""), 3500);
  }

  function reevaluar(p, patch) {
    const next = { ...p, ...patch, actualizado: Date.now() };
    next.score = calcularScore(next);
    next.nivel = nivelDesdeScore(next.score);
    setPacientes((list) => list.map((x) => (x.id === p.id ? next : x)).sort(compararPrioridad));
    setSel(next);
    setOk(`Reevaluación: ${next.nombre} ahora score ${next.score}`);
    setTimeout(() => setOk(""), 2800);
  }

  function atender(id) {
    setPacientes((list) =>
      list.map((p) => (p.id === id ? { ...p, estado: "EN_ATENCION" } : p))
    );
    setSel(null);
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="pulse" />
          <div>
            <strong>Urgencias</strong>
            <small>Triage predictivo</small>
          </div>
        </div>
        <nav>
          <button className={tab === "cola" ? "on" : ""} onClick={() => setTab("cola")}>
            Cola en tiempo real
          </button>
          <button className={tab === "ingreso" ? "on" : ""} onClick={() => setTab("ingreso")}>
            Ingreso de paciente
          </button>
        </nav>
        <div className="kpis">
          <div>
            <em>{cola.length}</em>
            <span>En espera</span>
          </div>
          <div>
            <em>{criticos}</em>
            <span>Alto riesgo</span>
          </div>
          <div>
            <em>{atencion.length}</em>
            <span>En atención</span>
          </div>
        </div>
        <p className="hint">
          La cola no es FIFO: se reordena por score de criticidad (0–100) y nivel ESI.
        </p>
      </aside>

      <main>
        <header className="top">
          <h1>{tab === "cola" ? "Sala de espera priorizada" : "Registro de ingreso"}</h1>
          <span className="live">● En vivo · simulación local</span>
        </header>
        {ok && <div className="toast">{ok}</div>}

        {tab === "ingreso" ? (
          <form className="card form" onSubmit={registrar}>
            <h2>Datos demográficos</h2>
            <div className="grid">
              <label>
                Nombre completo
                <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
              </label>
              <label>
                Documento
                <input required value={form.doc} onChange={(e) => set("doc", e.target.value)} />
              </label>
              <label>
                Edad
                <input required type="number" min="0" max="120" value={form.edad} onChange={(e) => set("edad", e.target.value)} />
              </label>
              <label>
                Sexo
                <select value={form.sexo} onChange={(e) => set("sexo", e.target.value)}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </label>
              <label className="full">
                Antecedentes / comorbilidades
                <input value={form.antecedentes} onChange={(e) => set("antecedentes", e.target.value)} placeholder="HTA, EPOC, diabetes…" />
              </label>
            </div>
            <h2>Signos vitales</h2>
            <div className="grid">
              <label>SpO2 %<input required type="number" min="0" max="100" value={form.spo2} onChange={(e) => set("spo2", e.target.value)} /></label>
              <label>FC lpm<input required type="number" min="20" max="250" value={form.fc} onChange={(e) => set("fc", e.target.value)} /></label>
              <label>PAS mmHg<input required type="number" min="50" max="260" value={form.pas} onChange={(e) => set("pas", e.target.value)} /></label>
              <label>PAD mmHg<input required type="number" min="20" max="160" value={form.pad} onChange={(e) => set("pad", e.target.value)} /></label>
              <label>Temp °C<input required type="number" step="0.1" min="30" max="43" value={form.temp} onChange={(e) => set("temp", e.target.value)} /></label>
              <label>FR rpm<input required type="number" min="4" max="60" value={form.fr} onChange={(e) => set("fr", e.target.value)} /></label>
            </div>
            <button className="cta" type="submit">Calcular prioridad e ingresar a cola</button>
          </form>
        ) : (
          <section className="layout">
            <ul className="cola">
              {cola.length === 0 && <li className="empty">No hay pacientes en espera.</li>}
              {cola.map((p, i) => {
                const n = NIVELES[p.nivel];
                return (
                  <li key={p.id} className={sel?.id === p.id ? "row sel" : "row"} onClick={() => setSel(p)}>
                    <span className="pos">{i + 1}</span>
                    <span className="badge" style={{ color: n.color, background: n.bg }}>
                      {n.short}
                    </span>
                    <div className="who">
                      <strong>{p.nombre}</strong>
                      <small>{p.edad} años · Doc. {p.doc}</small>
                    </div>
                    <div className="score">
                      <b>{p.score.toFixed(1)}</b>
                      <small>score</small>
                    </div>
                    <div className="vitals">
                      SpO2 {p.spo2}% · FC {p.fc} · {p.pas}/{p.pad}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="detail card">
              {!sel && <p className="muted">Selecciona un paciente para reevaluar o pasar a atención.</p>}
              {sel && (
                <>
                  <span className="badge" style={{ color: NIVELES[sel.nivel].color, background: NIVELES[sel.nivel].bg }}>
                    {NIVELES[sel.nivel].label}
                  </span>
                  <h2>{sel.nombre}</h2>
                  <p className="muted">{sel.antecedentes || "Sin antecedentes registrados"}</p>
                  <div className="mini">
                    <span>SpO2 {sel.spo2}%</span>
                    <span>FC {sel.fc}</span>
                    <span>PA {sel.pas}/{sel.pad}</span>
                    <span>T {sel.temp}°C</span>
                    <span>FR {sel.fr}</span>
                  </div>
                  <p className="scoreline">
                    Criticidad <b>{sel.score.toFixed(1)}</b> / 100
                  </p>
                  <div className="actions">
                    <button type="button" onClick={() => reevaluar(sel, { spo2: Math.max(70, sel.spo2 - 4), fc: sel.fc + 12 })}>
                      Simular deterioro
                    </button>
                    <button type="button" className="ghost" onClick={() => reevaluar(sel, { spo2: Math.min(99, sel.spo2 + 3), fc: Math.max(60, sel.fc - 8) })}>
                      Simular mejoría
                    </button>
                    <button type="button" className="cta" onClick={() => atender(sel.id)}>
                      Pasar a atención
                    </button>
                  </div>
                </>
              )}
            </aside>
          </section>
        )}
      </main>
    </div>
  );
}
