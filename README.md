# TriageIA — Clasificador predictivo en urgencias

Sistema de **reordenamiento dinámico** de la sala de espera. No atiende por llegada (FIFO): estima un **score de criticidad 0–100** con un modelo tabular tipo boosting (NEWS2 + lesión/enfermedad + comorbilidades) y mueve al paciente si sus signos se degradan.

## Acceso de demostración
- Usuario: `medico`
- Contraseña: `triage123`

## Local
```bash
npm install
npm run dev
```

## Vercel
Build: `npm run build` · salida: `dist`
