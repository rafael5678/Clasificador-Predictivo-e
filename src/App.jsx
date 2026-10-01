import { compararPrioridad, crearPaciente, minutosEspera, pacientesIniciales } from "./triage";
import { COMORBILIDADES, LESIONES } from "./ml/dataset";
import { explicar, obtenerModelo, predecirScore, similares } from "./ml/modelo";
import { useMemo, useState } from "react";

const NAV = [
  ["inicio", "Sala de espera"],
  ["registrar", "Nuevo ingreso"],
  ["pacientes", "Pacientes"],
  ["historial", "Historial"],
  ["modelo", "Modelo y dataset"],
  ["config", "IA responsable"],
];

const vacio = {
  nombre: "",
  doc: "",
  edad: "",
  sexo: "M",
  lesionId: "abdomen",
  motivo: "",
  pas: "",
  pad: "",
  fc: "",
  spo2: "",
  temp: "",
  fr: "",
  comorbIds: [],
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
        <small>Criticidad en tiempo real</small>
      </div>
    </div>
  );
}

function Chip({ p }) {
  return <span className={`chip ${p.tono}`}>{p.chip}</span>;
}

export default function App() {
  const pack = useMemo(() => obtenerModelo(), []);
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState({ usuario: "", clave: "" });
  const [err, setErr] = useState("");
  const [view, setView] = useState("inicio");
  const [form, setForm] = useState(vacio);
  const [pacientes, setPacientes] = useState(() => pacientesIniciales(pack.modelo));
  const [resultado, setResultado] = useState(null);
  const [sel, setSel] = useState(null);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [re, setRe] = useState(null);

  const espera = useMemo(
    () => pacientes.filter((p) => p.estado === "En espera").sort(compararPrioridad),
    [pacientes]
  );

  function flash(m) {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  }

  function onLogin(e) {
    e.preventDefault();
    if (login.usuario.trim() === "medico" && login.clave === "triage123") {
      setUser({ nombre: "Dr. Carlos Pérez", rol: "Médico de urgencias" });
      setErr("");
      return;
    }
    setErr("Credenciales de demostración: medico / triage123");
  }

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function payload(base) {
    return {
      ...base,
      edad: Number(base.edad),
      spo2: Number(base.spo2),
      fc: Number(base.fc),
      pas: Number(base.pas),
      pad: Number(base.pad),
      temp: Number(base.temp),
      fr: Number(base.fr),
    };
  }

  function analizar(e) {
    e.preventDefault();
    const p = crearPaciente(payload(form), pack.modelo);
    p.factores = explicar(pack.modelo, p);
    p.vecinos = similares(pack.data, p);
    setResultado(p);
    setView("resultado");
  }

  function confirmar() {
    setPacientes((list) => [resultado, ...list].sort(compararPrioridad));
    setForm(vacio);
    flash(`${resultado.nombre} entra a cola · score ${resultado.score} · ${resultado.prioridad.esi}`);
    setView("inicio");
    setResultado(null);
  }

  function atender(id) {
    setPacientes((list) => list.map((p) => (p.id === id ? { ...p, estado: "En atención" } : p)));
    flash("Paciente pasa a sala de atención y sale de la cola.");
    setSel(null);
  }

  function abrirRe(p) {
    setRe({ ...p });
    setView("reevaluar");
  }

  function aplicarRe(e) {
    e.preventDefault();
    const antes = pacientes.find((x) => x.id === re.id);
    const posAntes = espera.findIndex((x) => x.id === re.id);
    const next = crearPaciente(payload(re), pack.modelo);
    next.id = re.id;
    next.codigo = re.codigo;
    next.nombre = re.nombre;
    next.doc = re.doc;
    next.llegada = re.llegada;
    next.estado = "En espera";
    next.factores = explicar(pack.modelo, next);
    const mezcla = pacientes.map((p) => (p.id === next.id ? next : p));
    const cola = mezcla.filter((p) => p.estado === "En espera").sort(compararPrioridad);
    const posAhora = cola.findIndex((x) => x.id === next.id);
    setPacientes(mezcla);
    setRe(null);
    setSel(next);
    const delta = posAntes - posAhora;
    const mov = delta > 0 ? `subió ${delta} puesto(s)` : delta < 0 ? `bajó ${-delta} puesto(s)` : "mantiene posición";
    flash(`Reevaluación: ${next.nombre} · ${antes.score} → ${next.score} · ${mov}`);
    setView("inicio");
  }

  const filtrados = pacientes.filter((p) => {
    const t = q.toLowerCase();
    return !t || p.nombre.toLowerCase().includes(t) || p.doc.includes(t) || p.codigo.toLowerCase().includes(t);
  });

  if (!user) {
    return (
      <div className="auth">
        <section className="auth-copy">
          <Logo />
          <p className="eyebrow">Aprendizaje automático tabular · NEWS2 + boosting</p>
          <h1>La cola no espera al más puntual. Espera al más grave.</h1>
          <p className="lede">
            TriageIA estima criticidad continua (0–100) con signos vitales, lesión o enfermedad y antecedentes, y reordena la sala de espera en milisegundos.
          </p>
          <form className="auth-form" onSubmit={onLogin}>
            <label>Usuario<input autoComplete="username" value={login.usuario} onChange={(e) => setLogin({ ...login, usuario: e.target.value })} /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" value={login.clave} onChange={(e) => setLogin({ ...login, clave: e.target.value })} /></label>
            {err && <p className="form-err">{err}</p>}
            <button className="btn" type="submit">Entrar a urgencias</button>
            <p className="hint">Demo · usuario <b>medico</b> · contraseña <b>triage123</b></p>
          </form>
        </section>
        <aside className="auth-visual">
          <div className="glass">
            <span>Score de riesgo</span>
            <em>91.4</em>
            <small>ESI I · Reanimación · no FIFO</small>
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
            <button key={id} className={view === id || (id === "registrar" && view === "resultado") ? "on" : ""} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="me">
          <span className="ava">CP</span>
          <div>
            <b>{user.nombre}</b>
            <small>{user.rol}</small>
          </div>
        </div>
      </aside>

      <div className="stage">
        <header className="bar">
          <input placeholder="Buscar por nombre, documento o código…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="bar-meta">
            <span className="live">Modelo activo · {pack.data.length} casos</span>
            <button className="text" onClick={() => setUser(null)}>Salir</button>
          </div>
        </header>
        {toast && <div className="toast">{toast}</div>}

        {view === "inicio" && (
          <section className="page">
            <div className="hero-line">
              <div>
                <h1>Sala de espera priorizada</h1>
                <p>Ordenada por criticidad predicha, no por llegada. Si un paciente se descompensa, sube solo.</p>
              </div>
              <button className="btn" onClick={() => setView("registrar")}>Registrar ingreso</button>
            </div>
            <div className="stats">
              <article><small>En espera</small><b>{espera.length}</b></article>
              <article className="crit"><small>Criticidad ≥ 62</small><b>{espera.filter((p) => p.score >= 62).length}</b></article>
              <article><small>Score medio</small><b>{espera.length ? (espera.reduce((a, p) => a + p.score, 0) / espera.length).toFixed(1) : "—"}</b></article>
              <article><small>En atención</small><b>{pacientes.filter((p) => p.estado === "En atención").length}</b></article>
            </div>
            <div className="split">
              <ol className="queue">
                {espera.map((p, i) => (
                  <li key={p.id} className={`q ${p.prioridad.tono} ${sel?.id === p.id ? "sel" : ""}`} onClick={() => setSel(p)}>
                    <em>{String(i + 1).padStart(2, "0")}</em>
                    <div>
                      <strong>{p.nombre}</strong>
                      <small>{p.codigo} · {LESIONES.find((l) => l.id === p.lesionId)?.label}</small>
                    </div>
                    <Chip p={p.prioridad} />
                    <div className="sc">
                      <b>{p.score.toFixed(1)}</b>
                      <small>NEWS2 {p.news2}</small>
                    </div>
                    <span className="wait">{p.esperaMin || minutosEspera(p)} min</span>
                  </li>
                ))}
              </ol>
              <aside className="dossier">
                {!sel && <p className="muted">Selecciona un paciente para ver el riesgo, reevaluar signos o pasarlo a atención.</p>}
                {sel && (
                  <>
                    <Chip p={sel.prioridad} />
                    <h2>{sel.nombre}</h2>
                    <p className="muted">{LESIONES.find((l) => l.id === sel.lesionId)?.label} · {sel.edad} años</p>
                    <div className="vit">
                      <span>SpO₂ {sel.spo2}%</span>
                      <span>FC {sel.fc}</span>
                      <span>PA {sel.pas}/{sel.pad}</span>
                      <span>T {sel.temp}°</span>
                      <span>FR {sel.fr}</span>
                    </div>
                    <p className="scoreline">Criticidad <b>{sel.score.toFixed(1)}</b> · {sel.prioridad.esi}</p>
                    <div className="row-btns">
                      <button className="btn" onClick={() => atender(sel.id)}>Pasar a atención</button>
                      <button className="ghost" onClick={() => abrirRe(sel)}>Reevaluar signos</button>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>
        )}

        {view === "registrar" && (
          <section className="page">
            <h1>Ingreso y predicción</h1>
            <p className="sub">El boosting tabular combina NEWS2, motivo clínico y comorbilidades.</p>
            <form className="sheet" onSubmit={analizar}>
              <h3>Identificación</h3>
              <div className="g2">
                <label>Nombre completo<input required value={form.nombre} onChange={(e) => setF("nombre", e.target.value)} /></label>
                <label>Documento<input required value={form.doc} onChange={(e) => setF("doc", e.target.value)} /></label>
                <label>Edad<input required type="number" min="0" max="120" value={form.edad} onChange={(e) => setF("edad", e.target.value)} /></label>
                <label>Sexo
                  <select value={form.sexo} onChange={(e) => setF("sexo", e.target.value)}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </label>
                <label className="full">Lesión o enfermedad principal
                  <select value={form.lesionId} onChange={(e) => setF("lesionId", e.target.value)}>
                    {LESIONES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </label>
                <label className="full">Motivo de consulta<textarea rows="2" value={form.motivo} onChange={(e) => setF("motivo", e.target.value)} /></label>
              </div>
              <h3>Signos vitales</h3>
              <div className="g3">
                <label>SpO₂ %<input required type="number" min="50" max="100" value={form.spo2} onChange={(e) => setF("spo2", e.target.value)} /></label>
                <label>FC lpm<input required type="number" min="20" max="220" value={form.fc} onChange={(e) => setF("fc", e.target.value)} /></label>
                <label>PAS mmHg<input required type="number" min="50" max="250" value={form.pas} onChange={(e) => setF("pas", e.target.value)} /></label>
                <label>PAD mmHg<input required type="number" min="20" max="160" value={form.pad} onChange={(e) => setF("pad", e.target.value)} /></label>
                <label>Temp °C<input required type="number" step="0.1" min="32" max="43" value={form.temp} onChange={(e) => setF("temp", e.target.value)} /></label>
                <label>FR rpm<input required type="number" min="4" max="50" value={form.fr} onChange={(e) => setF("fr", e.target.value)} /></label>
              </div>
              <h3>Antecedentes</h3>
              <div className="checks">
                {COMORBILIDADES.map((c) => (
                  <label key={c.id} className="chk">
                    <input
                      type="checkbox"
                      checked={form.comorbIds.includes(c.id)}
                      onChange={() =>
                        setF(
                          "comorbIds",
                          form.comorbIds.includes(c.id) ? form.comorbIds.filter((x) => x !== c.id) : [...form.comorbIds, c.id]
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <button className="btn wide" type="submit">Calcular criticidad con el modelo</button>
            </form>
          </section>
        )}

        {view === "resultado" && resultado && (
          <section className="page">
            <h1>Resultado del modelo</h1>
            <p className="sub">Sugerencia automática. La decisión clínica la confirma el profesional.</p>
            <div className={`banner ${resultado.prioridad.tono}`}>
              <div>
                <small>{resultado.prioridad.esi} · {resultado.prioridad.nombre}</small>
                <h2>Score {resultado.score.toFixed(1)} / 100</h2>
              </div>
              <Chip p={resultado.prioridad} />
            </div>
            <div className="split">
              <div className="sheet">
                <h3>Factores que empujan el score</h3>
                {(resultado.factores || []).slice(0, 6).map((f) => (
                  <div key={f.id} className="barline">
                    <span>{f.nombre}</span>
                    <i><b style={{ width: `${Math.min(100, Math.abs(f.peso) * 8)}%` }} /></i>
                    <em>{f.peso > 0 ? "+" : ""}{f.peso}</em>
                  </div>
                ))}
                <div className="row-btns">
                  <button className="btn" onClick={confirmar}>Confirmar e ingresar a cola</button>
                  <button className="ghost" onClick={() => setView("registrar")}>Modificar</button>
                </div>
              </div>
              <div className="sheet">
                <h3>Casos similares del dataset</h3>
                <ul className="near">
                  {(resultado.vecinos || []).map((v) => (
                    <li key={v.id}>
                      <b>{v.id}</b>
                      <span>{LESIONES.find((l) => l.id === v.lesionId)?.label}</span>
                      <em>{v.y.toFixed(1)}</em>
                    </li>
                  ))}
                </ul>
                <p className="muted">Vecinos más cercanos en el espacio de signos vitales y lesión.</p>
              </div>
            </div>
          </section>
        )}

        {view === "reevaluar" && re && (
          <section className="page">
            <h1>Reevaluación dinámica</h1>
            <p className="sub">Si los signos se degradan, el boosting recalcula y la cola se reordena al instante.</p>
            <form className="sheet" onSubmit={aplicarRe}>
              <p><b>{re.nombre}</b> · score actual {predecirScore(pack.modelo, payload(re)).toFixed(1)}</p>
              <div className="g3">
                <label>SpO₂<input type="number" value={re.spo2} onChange={(e) => setRe({ ...re, spo2: e.target.value })} /></label>
                <label>FC<input type="number" value={re.fc} onChange={(e) => setRe({ ...re, fc: e.target.value })} /></label>
                <label>PAS<input type="number" value={re.pas} onChange={(e) => setRe({ ...re, pas: e.target.value })} /></label>
                <label>PAD<input type="number" value={re.pad} onChange={(e) => setRe({ ...re, pad: e.target.value })} /></label>
                <label>Temp<input type="number" step="0.1" value={re.temp} onChange={(e) => setRe({ ...re, temp: e.target.value })} /></label>
                <label>FR<input type="number" value={re.fr} onChange={(e) => setRe({ ...re, fr: e.target.value })} /></label>
              </div>
              <div className="row-btns">
                <button className="btn" type="submit">Recalcular y reordenar</button>
                <button className="ghost" type="button" onClick={() => { setRe({ ...re, spo2: Math.max(72, Number(re.spo2) - 6), fc: Number(re.fc) + 18, fr: Number(re.fr) + 6 }); }}>Simular deterioro</button>
              </div>
            </form>
          </section>
        )}

        {view === "pacientes" && (
          <section className="page">
            <h1>Pacientes</h1>
            <div className="sheet table-wrap">
              <table>
                <thead><tr><th>Paciente</th><th>Lesión / enfermedad</th><th>Score</th><th>Prioridad</th><th>Estado</th></tr></thead>
                <tbody>
                  {filtrados.sort(compararPrioridad).map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.nombre}</b><div className="muted">{p.codigo} · {p.edad} años</div></td>
                      <td>{LESIONES.find((l) => l.id === p.lesionId)?.label}</td>
                      <td>{p.score.toFixed(1)}</td>
                      <td><Chip p={p.prioridad} /></td>
                      <td>{p.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "historial" && (
          <section className="page">
            <h1>Historial</h1>
            <div className="sheet table-wrap">
              <table>
                <thead><tr><th>Paciente</th><th>Hora</th><th>Modelo</th><th>NEWS2</th><th>Médico</th></tr></thead>
                <tbody>
                  {pacientes.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td>{new Date(p.llegada).toLocaleString("es-CO")}</td>
                      <td><Chip p={p.prioridad} /></td>
                      <td>{p.news2}</td>
                      <td>Dr. Carlos Pérez</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "modelo" && (
          <section className="page">
            <h1>Modelo y dataset</h1>
            <p className="sub">Gradient boosting sobre {pack.data.length} casos tabulares sintéticos etiquetados con protocolo NEWS2 + gravedad ESI de la lesión.</p>
            <div className="stats">
              <article><small>Casos</small><b>{pack.data.length}</b></article>
              <article><small>Entrenamiento</small><b>{pack.train.length}</b></article>
              <article><small>Prueba</small><b>{pack.test.length}</b></article>
              <article><small>MAE en test</small><b>{pack.metricas.mae}</b></article>
            </div>
            <div className="split">
              <div className="sheet">
                <h3>Importancia de variables (splits del boosting)</h3>
                {pack.importancia.map((f) => (
                  <div key={f.feat} className="barline">
                    <span>{f.feat}</span>
                    <i><b style={{ width: `${f.p}%` }} /></i>
                    <em>{f.p}%</em>
                  </div>
                ))}
              </div>
              <div className="sheet">
                <h3>Cómo decide quién entra primero</h3>
                <ol className="steps">
                  <li>Se vectorizan signos vitales, NEWS2, índice de shock, comorbilidades y gravedad de la lesión.</li>
                  <li>Un ensamble de tocones (estil XGBoost) predice un score continuo 0–100.</li>
                  <li>La cola en espera se ordena por score descendente; a igualdad, por hora de llegada.</li>
                  <li>Una reevaluación vuelve a puntuar y mueve al paciente en milisegundos.</li>
                </ol>
              </div>
            </div>
          </section>
        )}

        {view === "config" && (
          <section className="page">
            <h1>IA responsable</h1>
            <div className="split">
              <div className="sheet">
                <h3>Límites del sistema</h3>
                <ul className="bullets">
                  <li>El modelo apoya; no sustituye el juicio clínico.</li>
                  <li>Hay umbrales de seguridad (SpO₂, PAS, FR) que fuerzan criticidad alta.</li>
                  <li>Los datos de esta demo son sintéticos, no historia clínica real.</li>
                </ul>
              </div>
              <div className="sheet">
                <h3>Privacidad</h3>
                <p className="muted">En este avance todo corre en el navegador. No hay PostgreSQL ni envío a servidor. El backend llegará en una siguiente etapa.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
