# Variables de Entorno Frontend

El proyecto utiliza archivos `.env` compatibles con Vite:

- `VITE_API_BASE_URL`: Dirección raíz de la API REST del backend.
- `VITE_APP_ENV`: Entorno de ejecución (`development`, `staging`, `production`).
- `VITE_ENABLE_ANALYTICS`: Bandera booleana para telemetría interna.

## Ejemplo de uso
```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```
