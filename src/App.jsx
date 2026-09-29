import { useMemo, useState } from "react";
import {
  compararPrioridad,
  crearPaciente,
  pacientesIniciales,
  calcularScore,
  prioridadDe,
  minutosEspera,
} from "./triage";

const NAV = [
  ["inicio", "Inicio"],
  ["pacientes", "Pacientes"],
  ["registrar", "Registrar paciente"],
  ["prediccion", "Predicción de triage"],
  ["historial", "Historial"],
  ["reportes", "Reportes"],
  ["config", "Configuración"],
];

const SINTOMAS = ["Dolor", "Fiebre", "Mareo", "Náuseas", "Dificultad respiratoria", "Tos", "Otros"];

const formVacio = {
  nombre: "",
  doc: "",
  edad: "",
  sexo: "Masculino",
  motivo: "",
  pas: "",
  pad: "",
  fc: "",
  spo2: "",
  temp: "",
  fr: "",
  antecedentes: "",
  sintomas: [],
};

function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
        <path d="M2 16h6l3-8 4 16 3-8h12" fill="none" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span>TriageIA</span>
    </div>
  );
}

function Chip({ p }) {
  return <span className={`chip ${p.toLowerCase()}`}>{p}</span>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [pacientes, setPacientes] = useState(() =>
    pacientesIniciales().map((p, i) => ({ ...p, esperaMin: [2, 6, 15, 18, 26][i] || 10 }))
  );
  const [view, setView] = useState("inicio");
  const [form, setForm] = useState(formVacio);
  const [resultado, setResultado] = useState(null);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [login, setLogin] = useState({ usuario: "", clave: "" });

  const espera = useMemo(
    () => pacientes.filter((p) => p.estado === "En espera").sort(compararPrioridad),
    [pacientes]
  );
  const alta = espera.filter((p) => p.prioridad === "Alta").length;
  const dist = {
    Alta: pacientes.filter((p) => p.prioridad === "Alta").length,
    Media: pacientes.filter((p) => p.prioridad === "Media").length,
    Baja: pacientes.filter((p) => p.prioridad === "Baja").length,
  };
  const total = pacientes.length || 1;

  function flash(m) {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  }

  function go(v) {
    setView(v);
  }

  function onLogin(e) {
    e.preventDefault();
    if (!login.usuario.trim()) return;
    setUser({ nombre: "Dr. Carlos Pérez", rol: "Médico General" });
    setView("inicio");
  }

  function setF(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleSintoma(s) {
    setForm((f) => ({
      ...f,
      sintomas: f.sintomas.includes(s) ? f.sintomas.filter((x) => x !== s) : [...f.sintomas, s],
    }));
  }

  function analizar(e) {
    e.preventDefault();
    const raw = {
      ...form,
      edad: Number(form.edad),
      spo2: Number(form.spo2),
      fc: Number(form.fc),
      pas: Number(form.pas),
      pad: Number(form.pad),
      temp: Number(form.temp),
      fr: Number(form.fr),
    };
    const { score, factores } = calcularScore(raw);
    const p = crearPaciente({ ...raw, score, factores, prioridad: prioridadDe(score) });
    p.factores = factores;
    setResultado(p);
    setView("resultado");
  }

  function confirmar() {
    setPacientes((list) => [resultado, ...list].sort(compararPrioridad));
    setForm(formVacio);
    flash(`${resultado.nombre} ingresó a la cola · prioridad ${resultado.prioridad}`);
    setView("inicio");
  }

  function filtrados() {
    const t = q.toLowerCase();
    return pacientes.filter(
      (p) => !t || p.nombre.toLowerCase().includes(t) || p.doc.includes(t) || p.codigo.toLowerCase().includes(t)
    );
  }

  if (!user) {
    return (
      <div className="login">
        <section className="login-card">
          <Logo />
          <p className="tagline">Inteligencia que apoya decisiones que salvan vidas.</p>
          <h1>Bienvenido de nuevo</h1>
          <p className="sub">Inicie sesión para acceder al sistema de triage.</p>
          <form onSubmit={onLogin}>
            <label>Usuario
              <input value={login.usuario} onChange={(e) => setLogin({ ...login, usuario: e.target.value })} placeholder="Usuario" />
            </label>
            <label>Contraseña
              <input type="password" value={login.clave} onChange={(e) => setLogin({ ...login, clave: e.target.value })} placeholder="Contraseña" />
            </label>
            <div className="row-between">
              <label className="chk"><input type="checkbox" /> Recordarme</label>
              <button type="button" className="link">¿Olvidaste tu contraseña?</button>
            </div>
            <button className="btn-primary wide" type="submit">Iniciar sesión</button>
          </form>
          <small className="foot">TriageIA · v1.0 · Avance frontend</small>
        </section>
        <aside className="login-hero" />
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <nav>
          {NAV.map(([id, label]) => (
            <button key={id} className={view === id || (id === "prediccion" && view === "resultado") ? "on" : ""} onClick={() => go(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="me">
          <div className="avatar">CP</div>
          <div>
            <strong>{user.nombre}</strong>
            <small>{user.rol}</small>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <input className="search" placeholder="Buscar paciente por nombre o documento…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="top-actions">
            <span className="bell">🔔</span>
            <span className="clock">Hoy · {new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
            <button className="ghost" onClick={() => setUser(null)}>Salir</button>
          </div>
        </header>
        {toast && <div className="toast">{toast}</div>}

        {view === "inicio" && (
          <section className="page">
            <h1>Hola, Dr. Carlos</h1>
            <p className="lead">Aquí tienes un resumen del estado de la sala de urgencias.</p>
            <div className="kpis">
              <article><em>{pacientes.length}</em><span>Pacientes en total</span></article>
              <article className="blue"><em>{espera.length}</em><span>En espera</span></article>
              <article className="red"><em>{alta}</em><span>Prioridad alta</span></article>
              <article className="green"><em>9</em><span>Promedio atendidos</span></article>
            </div>
            <div className="split">
              <div className="panel">
                <h3>Pacientes en espera</h3>
                <table>
                  <thead><tr><th>Paciente</th><th>Edad</th><th>Prioridad</th><th>Tiempo de espera</th><th /></tr></thead>
                  <tbody>
                    {espera.map((p) => (
                      <tr key={p.id}>
                        <td>{p.codigo}</td>
                        <td>{p.edad} años</td>
                        <td><Chip p={p.prioridad} /></td>
                        <td>{String(p.esperaMin || minutosEspera(p)).padStart(2, "0")} min</td>
                        <td><button className="link" onClick={() => { setResultado(p); go("resultado"); }}>Ver</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="stack">
                <div className="promo">
                  <strong>TriageIA</strong>
                  <p>Mejores decisiones, mayor seguridad.</p>
                  <button className="btn-primary" onClick={() => go("registrar")}>Registrar nuevo paciente</button>
                </div>
                <div className="panel">
                  <h3>Distribución de prioridades</h3>
                  <Donut dist={dist} total={total} />
                </div>
              </div>
            </div>
          </section>
        )}

        {view === "pacientes" && (
          <section className="page">
            <div className="row-between">
              <h1>Pacientes</h1>
              <button className="btn-primary" onClick={() => go("registrar")}>Nuevo paciente</button>
            </div>
            <div className="panel">
              <table>
                <thead><tr><th>Paciente</th><th>Edad</th><th>Prioridad</th><th>Estado</th><th>Espera</th></tr></thead>
                <tbody>
                  {filtrados().map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="who"><div className="avatar sm">{p.nombre.slice(0, 1)}</div><div><b>{p.nombre}</b><small>{p.codigo} · {p.doc}</small></div></div>
                      </td>
                      <td>{p.edad}</td>
                      <td><Chip p={p.prioridad} /></td>
                      <td>{p.estado}</td>
                      <td>{p.esperaMin || minutosEspera(p)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(view === "registrar" || view === "prediccion") && (
          <section className="page">
            <h1>+ Registrar paciente</h1>
            <form className="panel form" onSubmit={analizar}>
              <h3>Datos del paciente</h3>
              <div className="grid2">
                <label>Nombre completo *<input required value={form.nombre} onChange={(e) => setF("nombre", e.target.value)} /></label>
                <label>Documento de identidad *<input required value={form.doc} onChange={(e) => setF("doc", e.target.value)} /></label>
                <label>Edad *<input required type="number" min="0" max="120" value={form.edad} onChange={(e) => setF("edad", e.target.value)} /></label>
                <label>Sexo *
                  <select value={form.sexo} onChange={(e) => setF("sexo", e.target.value)}>
                    <option>Masculino</option><option>Femenino</option><option>Otro</option>
                  </select>
                </label>
              </div>
              <label>Motivo de consulta<textarea rows="2" value={form.motivo} onChange={(e) => setF("motivo", e.target.value)} placeholder="Describa brevemente el motivo de consulta…" /></label>
              <h3>Signos vitales</h3>
              <div className="grid3">
                <label>Presión arterial (mmHg)<div className="pa"><input required type="number" placeholder="Sistólica" value={form.pas} onChange={(e) => setF("pas", e.target.value)} /><input required type="number" placeholder="Diastólica" value={form.pad} onChange={(e) => setF("pad", e.target.value)} /></div></label>
                <label>Frecuencia cardíaca (lpm)<input required type="number" min="20" max="250" value={form.fc} onChange={(e) => setF("fc", e.target.value)} /></label>
                <label>Saturación de O₂ (%)<input required type="number" min="0" max="100" value={form.spo2} onChange={(e) => setF("spo2", e.target.value)} /></label>
                <label>Temperatura (°C)<input required type="number" step="0.1" min="30" max="43" value={form.temp} onChange={(e) => setF("temp", e.target.value)} /></label>
                <label>Frecuencia respiratoria (rpm)<input required type="number" min="4" max="60" value={form.fr} onChange={(e) => setF("fr", e.target.value)} /></label>
                <label>Antecedentes<input value={form.antecedentes} onChange={(e) => setF("antecedentes", e.target.value)} /></label>
              </div>
              <h3>Síntomas</h3>
              <div className="checks">
                {SINTOMAS.map((s) => (
                  <label key={s} className="chk"><input type="checkbox" checked={form.sintomas.includes(s)} onChange={() => toggleSintoma(s)} /> {s}</label>
                ))}
              </div>
              <button className="btn-primary wide" type="submit">Analizar triage</button>
            </form>
          </section>
        )}

        {view === "resultado" && resultado && (
          <section className="page">
            <h1>Resultado del triage</h1>
            <p className="lead">Clasificación sugerida por el modelo. Requiere validación del profesional de salud.</p>
            <div className={`alert ${resultado.prioridad.toLowerCase()}`}>
              <div>
                <strong>PRIORIDAD {resultado.prioridad.toUpperCase()}</strong>
                <p>Probabilidad: {Math.round(resultado.score)}%</p>
              </div>
              <span className="pill">Sugerencia del modelo</span>
            </div>
            <div className="split">
              <div className="panel">
                <h3>Factores que influyen</h3>
                {(resultado.factores || []).map((f) => (
                  <div key={f.nombre} className="bar-row">
                    <span>{f.nombre}</span>
                    <div className="bar"><i style={{ width: `${f.peso * 100}%` }} /></div>
                    <b>{f.peso.toFixed(2)}</b>
                  </div>
                ))}
                <p className="warn">La clasificación debe ser validada por el profesional de salud.</p>
                <div className="actions">
                  <button className="btn-danger" onClick={confirmar}>Confirmar clasificación</button>
                  <button className="ghost" onClick={() => go("registrar")}>Modificar</button>
                </div>
              </div>
              <div className="panel">
                <h3>Resumen del caso</h3>
                <ul className="kv">
                  <li><span>Edad</span><b>{resultado.edad} años</b></li>
                  <li><span>PA</span><b>{resultado.pas}/{resultado.pad} mmHg</b></li>
                  <li><span>FC</span><b>{resultado.fc} lpm</b></li>
                  <li><span>FR</span><b>{resultado.fr} rpm</b></li>
                  <li><span>Temp</span><b>{resultado.temp} °C</b></li>
                  <li><span>SpO2</span><b>{resultado.spo2}%</b></li>
                  <li><span>Síntomas</span><b>{(resultado.sintomas || []).join(", ") || "—"}</b></li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {view === "historial" && (
          <section className="page">
            <h1>Historial de pacientes</h1>
            <div className="panel">
              <table>
                <thead><tr><th>Paciente</th><th>Fecha y hora</th><th>Clasificación (modelo)</th><th>Clasificación final</th><th>Médico</th></tr></thead>
                <tbody>
                  {pacientes.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.nombre}</b><br /><small>{p.codigo}</small></td>
                      <td>{new Date(p.llegada).toLocaleString("es-CO")}</td>
                      <td><Chip p={p.prioridad} /></td>
                      <td><Chip p={p.prioridad} /></td>
                      <td>{p.medico}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "reportes" && (
          <section className="page">
            <h1>Estadísticas del sistema</h1>
            <div className="kpis">
              <article><em>1.248</em><span>Pacientes del mes anterior</span></article>
              <article className="blue"><em>{pacientes.length}</em><span>Clasificados hoy</span></article>
              <article className="green"><em>91.4%</em><span>Precisión del modelo</span></article>
              <article><em>4.2 min</em><span>Tiempo promedio de espera</span></article>
            </div>
            <div className="split">
              <div className="panel">
                <h3>Evolución de atenciones</h3>
                <svg viewBox="0 0 320 120" className="chart">
                  <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points="0,80 40,70 80,75 120,50 160,58 200,35 240,42 280,22 320,30" />
                  <polyline fill="none" stroke="#22c55e" strokeWidth="3" points="0,95 40,88 80,90 120,72 160,78 200,60 240,66 280,48 320,52" />
                </svg>
              </div>
              <div className="panel">
                <h3>Clasificación de triage</h3>
                <Donut dist={dist} total={total} />
              </div>
            </div>
          </section>
        )}

        {view === "config" && (
          <section className="page">
            <h1>Seguridad y IA Responsable</h1>
            <div className="split">
              <div className="panel">
                <h3>Protección de datos</h3>
                <ul className="list">
                  <li>Cifrado en tránsito</li>
                  <li>Roles y permisos</li>
                  <li>Auditoría de accesos</li>
                  <li>Registro de accesos</li>
                  <li>Auditoría de clasificaciones</li>
                  <li>Control de acceso por rol</li>
                </ul>
              </div>
              <div className="panel">
                <h3>Principios de IA responsable</h3>
                <ul className="list ok">
                  <li>IA = apoyo, no reemplazo</li>
                  <li>Profesional = verifica</li>
                  <li>Criterio clínico decide</li>
                </ul>
                <p className="warn">Nota: Modelo → decide → paciente. Tu privacidad y la de tus pacientes es nuestra prioridad.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Donut({ dist, total }) {
  const a = (dist.Alta / total) * 100;
  const m = (dist.Media / total) * 100;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(#ef4444 0 ${a}%, #f59e0b ${a}% ${a + m}%, #22c55e ${a + m}% 100%)` }}>
        <div className="hole">{total}</div>
      </div>
      <ul>
        <li><i className="alta" /> Alta {Math.round((dist.Alta / total) * 100)}%</li>
        <li><i className="media" /> Media {Math.round((dist.Media / total) * 100)}%</li>
        <li><i className="baja" /> Baja {Math.round((dist.Baja / total) * 100)}%</li>
      </ul>
    </div>
  );
}
