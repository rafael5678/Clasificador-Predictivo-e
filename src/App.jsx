import { useEffect, useMemo, useState } from "react";
import { COMORBIDITIES, CONDITIONS } from "./ml/conditions";
import { featureContributions, getModel, predictScore } from "./ml/model";
import { comparePriority, createPatient } from "./patient";
import { explainWhy } from "./explain";
import { fetchPatients, registerAndScore, reevaluatePatient, startCare } from "./api";
import { CARE_TARGETS, estimateWaitMinutes, waitSharePercent, waitSummary } from "./waitTimes";

const NAV = [
  ["queue", "Sala de espera"],
  ["intake", "Nuevo ingreso"],
  ["patients", "Pacientes"],
  ["history", "Historial"],
  ["model", "Cómo calcula"],
  ["ethics", "Uso responsable"],
];

const EMPTY_FORM = {
  name: "",
  document: "",
  age: "",
  sex: "M",
  conditionId: "",
  reason: "",
  systolic: "",
  diastolic: "",
  heartRate: "",
  spo2: "",
  temperature: "",
  respiratoryRate: "",
  comorbidityIds: [],
};

function Logo() {
  return (
    <div className="brand">
      <span className="mark" aria-hidden>
        <svg viewBox="0 0 36 36">
          <path d="M3 18h7l3.2-9 4.2 18 3-9H33" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <strong>TriageIA</strong>
        <small>Cola por gravedad real</small>
      </div>
    </div>
  );
}

function Chip({ priority }) {
  return <span className={`chip ${priority.tone}`}>{priority.chip}</span>;
}

function Field({ label, help, children, className }) {
  return (
    <label className={className}>
      {label}
      {children}
      {help && <small className="field-help">{help}</small>}
    </label>
  );
}

export default function App() {
  const pack = useMemo(() => getModel(), []);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState("queue");
  const [form, setForm] = useState(EMPTY_FORM);
  const [patients, setPatients] = useState([]);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [recheck, setRecheck] = useState(null);
  const [liveQueue, setLiveQueue] = useState({ loading: true, patients: [] });

  const waiting = useMemo(
    () => patients.filter((p) => p.status === "En espera").sort(comparePriority),
    [patients]
  );

  useEffect(() => {
    fetchPatients()
      .then((list) => setLiveQueue({ loading: false, patients: list.filter((p) => p.status === "En espera").sort(comparePriority) }))
      .catch(() => setLiveQueue({ loading: false, patients: [], offline: true }));
  }, []);

  function flash(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toPayload(source) {
    return {
      ...source,
      age: Number(source.age),
      spo2: Number(source.spo2),
      heartRate: Number(source.heartRate),
      systolic: Number(source.systolic),
      diastolic: Number(source.diastolic),
      temperature: Number(source.temperature),
      respiratoryRate: Number(source.respiratoryRate),
      fc: Number(source.heartRate),
      pas: Number(source.systolic),
      pad: Number(source.diastolic),
      temp: Number(source.temperature),
      fr: Number(source.respiratoryRate),
      edad: Number(source.age),
      lesionId: source.conditionId,
      comorbIds: source.comorbidityIds,
    };
  }

  function onLogin(event) {
    event.preventDefault();
    if (login.username.trim() === "medico" && login.password === "triage123") {
      setUser({ displayName: "Personal de urgencias", role: "Acceso de trabajo" });
      setLoginError("");
      fetchPatients()
        .then((list) => setPatients(list))
        .catch(() => {
          setPatients([]);
          flash("No se pudo leer la base. Revisa que Render esté activo.");
        });
      return;
    }
    setLoginError("Usuario o contraseña incorrectos.");
  }

  function analyze(event) {
    event.preventDefault();
    if (!form.conditionId) return;
    const patient = createPatient(toPayload(form), pack.model);
    patient.contributions = featureContributions(pack.model, patient);
    patient.explanation = explainWhy(patient);
    setResult(patient);
    setView("result");
  }

  async function confirmEntry() {
    try {
      const saved = await registerAndScore(result);
      saved.contributions = result.contributions;
      saved.explanation = explainWhy(saved);
      setPatients((list) => [saved, ...list.filter((p) => p.id !== saved.id)].sort(comparePriority));
      setForm(EMPTY_FORM);
      flash(`${saved.name} quedó en la cola con puntaje ${saved.score}.`);
    } catch (error) {
      flash(`No se guardó en la base: ${error.message}`);
      return;
    }
    setView("queue");
    setResult(null);
  }

  async function moveToCare(id) {
    try {
      await startCare(id);
    } catch (error) {
      flash(error.message);
      return;
    }
    setPatients((list) => list.map((p) => (p.id === id ? { ...p, status: "En atención", estado: "En atención" } : p)));
    flash("Salió de la cola: pasa a atención.");
    setSelected(null);
  }

  async function applyRecheck(event) {
    event.preventDefault();
    const before = patients.find((p) => p.id === recheck.id);
    const positionBefore = waiting.findIndex((p) => p.id === recheck.id);
    let next = createPatient(toPayload(recheck), pack.model);
    next.id = recheck.id;
    next.name = recheck.name;
    next.document = recheck.document;
    next.arrivedAt = recheck.arrivedAt;
    next.explanation = explainWhy(next);
    try {
      next = { ...next, ...(await reevaluatePatient(recheck.id, toPayload(recheck))) };
      next.explanation = explainWhy(next);
    } catch (error) {
      flash(error.message);
      return;
    }
    const merged = patients.map((p) => (p.id === next.id ? next : p));
    const queue = merged.filter((p) => p.status === "En espera").sort(comparePriority);
    const positionAfter = queue.findIndex((p) => p.id === next.id);
    setPatients(merged);
    setRecheck(null);
    setSelected(next);
    const delta = positionBefore - positionAfter;
    const moved = delta > 0 ? `subió ${delta} puesto(s)` : delta < 0 ? `bajó ${Math.abs(delta)} puesto(s)` : "se quedó en el mismo puesto";
    flash(`Nuevo puntaje ${before.score} → ${next.score}: ${moved}.`);
    setView("queue");
  }

  const filtered = patients.filter((p) => {
    const q = query.toLowerCase();
    return !q || (p.name || "").toLowerCase().includes(q) || String(p.document || "").includes(q);
  });

  const topWaiting = liveQueue.patients[0];
  const selectedExplain = selected ? explainWhy(selected) : null;

  if (!user) {
    return (
      <div className="auth">
        <section className="auth-copy">
          <Logo />
          <p className="eyebrow">Urgencias · cola por riesgo, no por orden de llegada</p>
          <h1>Entra quien está más grave, no quien llegó primero.</h1>
          <p className="lede">
            El puntaje va de 0 a 100. Se calcula con oxígeno, pulso, presión, temperatura, respiración, edad, qué le duele y enfermedades que ya tenía.
          </p>
          <form className="auth-form" onSubmit={onLogin}>
            <label>Usuario<input autoComplete="username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></label>
            {loginError && <p className="form-err">{loginError}</p>}
            <button className="btn" type="submit">Entrar a urgencias</button>
            <p className="hint">Acceso de trabajo: usuario <b>medico</b> · contraseña <b>triage123</b></p>
          </form>
        </section>
        <aside className="auth-visual">
          <div className="glass glass-wide">
            <span>Cuánto se espera, según qué tan grave esté</span>
            <p className="glass-lead">
              El puntaje 100 es lo más grave (casi no espera). El 0 es lo más leve (puede esperar más).
              La barra es el <b>porcentaje de espera</b> respecto a 2 horas: si estás muy herido, el porcentaje es bajo.
            </p>
            <ul className="wait-bands">
              {CARE_TARGETS.map((t) => {
                const count = liveQueue.patients.filter((p) => p.score >= t.minScore && p.score <= t.maxScore).length;
                const share = Math.round((t.wait / 120) * 100);
                return (
                  <li key={t.id}>
                    <div className="wait-row">
                      <b>{t.label}</b>
                      <em>puntaje {t.minScore}–{t.maxScore}</em>
                      <span>~{t.wait} min</span>
                    </div>
                    <div className="wait-bar"><i style={{ width: `${share}%` }} /></div>
                    <small>{t.detail}{!liveQueue.loading && !liveQueue.offline ? ` · Ahora en sala: ${count}` : ""}</small>
                  </li>
                );
              })}
            </ul>
            {topWaiting && (
              <p className="glass-now">
                Más grave ahora: puntaje {topWaiting.score.toFixed(1)} · espera meta ~{estimateWaitMinutes(topWaiting.score, liveQueue.patients)} min
                ({waitSharePercent(topWaiting.score)}% de una espera larga).
              </p>
            )}
            {liveQueue.loading && <small className="glass-status">Consultando la sala… si Render está dormido puede tardar unos segundos.</small>}
            {liveQueue.offline && <small className="glass-status">Servidor aún no responde. Puedes entrar igual; la tabla de espera es del protocolo de triage.</small>}
            {!liveQueue.loading && !liveQueue.offline && !topWaiting && (
              <small className="glass-status">Sala vacía en la base. Los tiempos de arriba son la meta según gravedad.</small>
            )}
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="side">
        <Logo />
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} className={view === id || (id === "intake" && view === "result") ? "on" : ""} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="me">
          <span className="ava">UR</span>
          <div>
            <b>{user.displayName}</b>
            <small>{user.role}</small>
          </div>
        </div>
      </aside>

      <div className="stage">
        <header className="bar">
          <input placeholder="Buscar por nombre o documento…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="bar-meta">
            <span className="live">{waiting.length} en espera (datos de la base)</span>
            <button className="text" onClick={() => setUser(null)}>Salir</button>
          </div>
        </header>
        {toast && <div className="toast">{toast}</div>}

        {view === "queue" && (
          <section className="page">
            <div className="hero-line">
              <div>
                <h1>Sala de espera</h1>
                <p>El número 1 es quien tiene el puntaje más alto ahora. No es el que llegó primero.</p>
              </div>
              <button className="btn" onClick={() => setView("intake")}>Nuevo ingreso</button>
            </div>
            <div className="stats">
              <article><small>En espera</small><b>{waiting.length}</b></article>
              <article className="crit"><small>Puntaje 62 o más</small><b>{waiting.filter((p) => p.score >= 62).length}</b></article>
              <article><small>Puntaje medio</small><b>{waiting.length ? (waiting.reduce((a, p) => a + p.score, 0) / waiting.length).toFixed(1) : "—"}</b></article>
              <article><small>En atención</small><b>{patients.filter((p) => p.status === "En atención").length}</b></article>
            </div>
            <div className="split">
              <ol className="queue">
                {waiting.length === 0 && <li className="empty">No hay pacientes en espera en la base de datos.</li>}
                {waiting.map((p, i) => (
                  <li key={p.id} className={`q ${p.priority.tone} ${selected?.id === p.id ? "sel" : ""}`} onClick={() => setSelected(p)}>
                    <em>{String(i + 1).padStart(2, "0")}</em>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{CONDITIONS.find((c) => c.id === p.conditionId)?.label || "Motivo no indicado"}</small>
                    </div>
                    <Chip priority={p.priority} />
                    <div className="sc">
                      <b>{Number(p.score).toFixed(1)}</b>
                      <small>~{estimateWaitMinutes(p.score, waiting)} min</small>
                    </div>
                    <span className="wait">{waitSharePercent(p.score)}%</span>
                  </li>
                ))}
              </ol>
              <aside className="dossier">
                {!selected && <p className="muted">Toca un paciente para ver por qué tiene ese puntaje.</p>}
                {selected && selectedExplain && (
                  <>
                    <Chip priority={selected.priority} />
                    <h2>{selected.name}</h2>
                    <p className="muted">{selectedExplain.meaning}</p>
                    <p className="scoreline">Puntaje <b>{Number(selected.score).toFixed(1)}</b> / 100</p>
                    <p className="muted">{waitSummary(selected.score, waiting).text} Porcentaje de espera: {waitSharePercent(selected.score)}% (100% = ~2 horas en un caso leve).</p>
                    <ul className="why-list">
                      {selectedExplain.reasons.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
                    </ul>
                    <div className="row-btns">
                      <button className="btn" onClick={() => moveToCare(selected.id)}>Pasar a atención</button>
                      <button className="ghost" onClick={() => { setRecheck({ ...selected }); setView("recheck"); }}>Volver a medir signos</button>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>
        )}

        {view === "intake" && (
          <section className="page">
            <h1>Nuevo ingreso</h1>
            <p className="sub">Escribe lo que ves o te dicen. No hace falta saber medicina: cada casilla explica qué pedir.</p>
            <form className="sheet" onSubmit={analyze}>
              <h3>Quién es</h3>
              <div className="g2">
                <Field label="Nombre y apellido" help="Como aparece en la cédula o como se presenta.">
                  <input required value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </Field>
                <Field label="Documento" help="Cédula, tarjeta de identidad o pasaporte.">
                  <input required value={form.document} onChange={(e) => setField("document", e.target.value)} />
                </Field>
                <Field label="Edad (años)" help="Si no la sabe, pregunte cuántos años tiene.">
                  <input required type="number" min="0" max="120" value={form.age} onChange={(e) => setField("age", e.target.value)} />
                </Field>
                <Field label="Sexo">
                  <select value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro / no dice</option>
                  </select>
                </Field>
                <Field className="full" label="¿Qué le pasa? (lo más grave)" help="Elija la opción que más se parezca. Eso cambia el orden de la cola.">
                  <select required value={form.conditionId} onChange={(e) => setField("conditionId", e.target.value)}>
                    <option value="">Seleccione una opción…</option>
                    {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </Field>
                {form.conditionId && <p className="field-help full-note">{CONDITIONS.find((c) => c.id === form.conditionId)?.hint}</p>}
                <Field className="full" label="Cuéntenos un poco más (opcional)" help="Con palabras simples: desde cuándo, si empeoró, si se golpeó.">
                  <textarea rows="2" value={form.reason} onChange={(e) => setField("reason", e.target.value)} />
                </Field>
              </div>
              <h3>Números del cuerpo (signos vitales)</h3>
              <p className="sub">Los toma el tensiómetro, el termómetro y el clip del dedo (oxímetro). Si aún no los tienen, pídalos al que toma los signos.</p>
              <div className="g3">
                <Field label="Oxígeno en sangre (%)" help="Clip en el dedo. Normal: 95 a 100. Si está bajo 94, avise.">
                  <input required type="number" min="50" max="100" value={form.spo2} onChange={(e) => setField("spo2", e.target.value)} />
                </Field>
                <Field label="Latidos por minuto" help="Pulso. En un adulto tranquilo suele ser 60 a 100.">
                  <input required type="number" min="20" max="220" value={form.heartRate} onChange={(e) => setField("heartRate", e.target.value)} />
                </Field>
                <Field label="Presión: número de arriba" help="El mayor del tensiómetro (sistólica). Ejemplo: en 120/80, este es 120.">
                  <input required type="number" min="50" max="250" value={form.systolic} onChange={(e) => setField("systolic", e.target.value)} />
                </Field>
                <Field label="Presión: número de abajo" help="El menor (diastólica). En 120/80, este es 80.">
                  <input required type="number" min="20" max="160" value={form.diastolic} onChange={(e) => setField("diastolic", e.target.value)} />
                </Field>
                <Field label="Temperatura (°C)" help="En la frente o axila. Un adulto suele estar cerca de 36.5 a 37.2.">
                  <input required type="number" step="0.1" min="32" max="43" value={form.temperature} onChange={(e) => setField("temperature", e.target.value)} />
                </Field>
                <Field label="Respiraciones en un minuto" help="Cuente pechos que suben en 60 segundos. En reposo: más o menos 12 a 20.">
                  <input required type="number" min="4" max="50" value={form.respiratoryRate} onChange={(e) => setField("respiratoryRate", e.target.value)} />
                </Field>
              </div>
              <h3>¿Ya tenía alguna de estas enfermedades?</h3>
              <p className="sub">Marque solo si la persona lo dice o está en un papel. Si no sabe, déjelo vacío.</p>
              <div className="checks">
                {COMORBIDITIES.map((c) => (
                  <label key={c.id} className="chk">
                    <input
                      type="checkbox"
                      checked={form.comorbidityIds.includes(c.id)}
                      onChange={() =>
                        setField(
                          "comorbidityIds",
                          form.comorbidityIds.includes(c.id)
                            ? form.comorbidityIds.filter((x) => x !== c.id)
                            : [...form.comorbidityIds, c.id]
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <button className="btn wide" type="submit">Calcular puntaje y explicar</button>
            </form>
          </section>
        )}

        {view === "result" && result && (
          <section className="page">
            <h1>Por qué salió este puntaje</h1>
            <p className="sub">Es una guía. Quien atiende confirma si está de acuerdo.</p>
            <div className={`banner ${result.priority.tone}`}>
              <div className={`severity-stamp ${result.priority.tone}`}>
                {result.priority.chip}
              </div>
              <div className="banner-copy">
                <p className="severity-kicker">{result.priority.esi} · {result.priority.name}</p>
                <h2>{result.score.toFixed(1)} <span>/ 100</span></h2>
                <p className="danger-lead">{result.explanation.dangerLead}</p>
                <p>{result.explanation.meaning}</p>
                <p>{result.explanation.whyQueue}</p>
                <p>{waitSummary(result.score, waiting).text} Porcentaje de espera: {waitSharePercent(result.score)}% (un caso leve ≈ 100%, un caso crítico ≈ 2%).</p>
              </div>
            </div>
            <div className="split">
              <div className="sheet">
                <h3>Por qué está así (con sus números)</h3>
                <ul className="why-list big">
                  {result.explanation.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <div className="row-btns">
                  <button className="btn" onClick={confirmEntry}>Confirmar y poner en la cola</button>
                  <button className="ghost" onClick={() => setView("intake")}>Corregir datos</button>
                </div>
              </div>
              <div className="sheet">
                <h3>Cuánto aportó cada dato (modelo)</h3>
                {(result.contributions || []).filter((f) => Math.abs(f.weight) >= 0.5).slice(0, 6).map((f) => (
                  <div key={f.id} className="barline">
                    <span>{f.name}</span>
                    <i><b style={{ width: `${Math.min(100, Math.abs(f.weight) * 8)}%` }} /></i>
                    <em>{f.weight > 0 ? "+" : ""}{f.weight}</em>
                  </div>
                ))}
                <p className="muted">Un número positivo subió el puntaje. Uno negativo lo bajó. NEWS2 de esta persona: {result.news2}.</p>
              </div>
            </div>
          </section>
        )}

        {view === "recheck" && recheck && (
          <section className="page">
            <h1>Volver a medir</h1>
            <p className="sub">Si los números empeoran, el puntaje sube y puede adelantar en la cola. Puntaje actual: {predictScore(pack.model, toPayload(recheck)).toFixed(1)}.</p>
            <form className="sheet" onSubmit={applyRecheck}>
              <p><b>{recheck.name}</b></p>
              <div className="g3">
                <Field label="Oxígeno %"><input type="number" value={recheck.spo2} onChange={(e) => setRecheck({ ...recheck, spo2: e.target.value })} /></Field>
                <Field label="Latidos"><input type="number" value={recheck.heartRate} onChange={(e) => setRecheck({ ...recheck, heartRate: e.target.value, fc: e.target.value })} /></Field>
                <Field label="Presión arriba"><input type="number" value={recheck.systolic} onChange={(e) => setRecheck({ ...recheck, systolic: e.target.value, pas: e.target.value })} /></Field>
                <Field label="Presión abajo"><input type="number" value={recheck.diastolic} onChange={(e) => setRecheck({ ...recheck, diastolic: e.target.value, pad: e.target.value })} /></Field>
                <Field label="Temperatura"><input type="number" step="0.1" value={recheck.temperature} onChange={(e) => setRecheck({ ...recheck, temperature: e.target.value, temp: e.target.value })} /></Field>
                <Field label="Respiraciones"><input type="number" value={recheck.respiratoryRate} onChange={(e) => setRecheck({ ...recheck, respiratoryRate: e.target.value, fr: e.target.value })} /></Field>
              </div>
              <button className="btn" type="submit">Recalcular y reordenar</button>
            </form>
          </section>
        )}

        {view === "patients" && (
          <section className="page">
            <h1>Pacientes (base de datos)</h1>
            <div className="sheet table-wrap">
              {filtered.length === 0 && <p className="muted">No hay registros todavía.</p>}
              <table>
                <thead><tr><th>Persona</th><th>Qué le pasa</th><th>Puntaje</th><th>Prioridad</th><th>Estado</th></tr></thead>
                <tbody>
                  {filtered.sort(comparePriority).map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b><div className="muted">{p.age} años · {p.document}</div></td>
                      <td>{CONDITIONS.find((c) => c.id === p.conditionId)?.label || "—"}</td>
                      <td>{Number(p.score).toFixed(1)}</td>
                      <td><Chip priority={p.priority} /></td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "history" && (
          <section className="page">
            <h1>Historial</h1>
            <div className="sheet table-wrap">
              <table>
                <thead><tr><th>Persona</th><th>Hora del puntaje</th><th>Prioridad</th><th>NEWS2</th></tr></thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{new Date(p.arrivedAt).toLocaleString("es-CO")}</td>
                      <td><Chip priority={p.priority} /></td>
                      <td>{p.news2 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "model" && (
          <section className="page">
            <h1>Cómo se calcula</h1>
            <p className="sub">
              El modelo se entrenó con {pack.train.length} ejemplos de práctica (no son pacientes de este hospital).
              El error medio en {pack.metrics.n} ejemplos de prueba es {pack.metrics.mae} puntos. La cola que ves arriba sí son registros reales de Supabase.
            </p>
            <div className="split">
              <div className="sheet">
                <h3>Qué datos usa más el modelo</h3>
                {pack.importance.map((f) => (
                  <div key={f.feature} className="barline">
                    <span>{f.feature}</span>
                    <i><b style={{ width: `${f.percent}%` }} /></i>
                    <em>{f.percent}%</em>
                  </div>
                ))}
              </div>
              <div className="sheet">
                <h3>Quién pasa primero</h3>
                <ol className="steps">
                  <li>Se leen oxígeno, pulso, presión, temperatura, respiración, edad, motivo y enfermedades previas.</li>
                  <li>Sale un puntaje de 0 (más estable) a 100 (más grave).</li>
                  <li>La lista se ordena del puntaje más alto al más bajo. Si empatan, gana quien llegó antes.</li>
                  <li>Si se vuelven a tomar los signos y empeoran, el puntaje sube y puede adelantar.</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {view === "ethics" && (
          <section className="page">
            <h1>Uso responsable</h1>
            <div className="sheet">
              <ul className="bullets">
                <li>Esto ayuda a ordenar la cola. No reemplaza al médico ni a la enfermería.</li>
                <li>Si el oxígeno, la presión o la respiración están muy mal, el sistema sube el puntaje a propósito.</li>
                <li>Los pacientes de la sala salen de la base PostgreSQL (Supabase). No se muestran nombres inventados.</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
