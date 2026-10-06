# Arquitectura Frontend - Triage Predictivo

Este módulo web ha sido diseñado con **React 18** y **Vite**, priorizando una experiencia de usuario clínica ágil, reactiva y clara.

## Estructura de Capas
1. **Presentación (`src/App.jsx` y `src/styles.css`)**:
   - Vistas modulares para Admisión, Monitor de Espera, Simulador de Casos y Analytics.
   - Retroalimentación visual guiada por la escala de colores Manchester (Rojo, Naranja, Amarillo, Verde, Azul).
2. **Lógica de Inferencia Local (`src/ml/`)**:
   - Evaluación tabular offline con pesos de signos vitales para contingencias de red.
3. **Capa de Conectividad (`src/api.js`)**:
   - Cliente HTTP con endpoints hacia el microservicio en Spring Boot (Render o entorno local).
