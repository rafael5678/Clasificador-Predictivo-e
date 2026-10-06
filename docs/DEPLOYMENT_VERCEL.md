# Guía de Despliegue en Vercel

El frontend está configurado para despliegue automatizado en la plataforma **Vercel** mediante integración con el repositorio de GitHub.

## Configuración (`vercel.json`)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Variables de Entorno en Vercel
- `VITE_API_URL`: URL base del backend alojado en Render.
