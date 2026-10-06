# Cliente de API y Estrategia de Conexión

El frontend interactúa con el backend de forma desacoplada y tolerante a fallos.

## Endpoints Consumidos
- `GET /api/triage/cola`: Obtiene la lista ordenada de pacientes por criticidad y tiempo de espera.
- `POST /api/triage/evaluar`: Envía paciente y signos vitales para clasificación y cálculo de score.
- `PUT /api/triage/reevaluar`: Actualiza los signos vitales y recalcula la posición en cola.

## Estrategia de Resiliencia
Si el backend en Render se encuentra en fase de hibernación (*cold-start*), el frontend maneja reintentos automáticos y notifica al personal médico en pantalla.
