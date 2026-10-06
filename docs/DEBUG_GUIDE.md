# Guía de Diagnóstico y Depuración

Pasos para depurar problemas frecuentes en desarrollo local:

1. **CORS Error**: Asegurarse de que el backend tenga configurado `http://localhost:5173` en su `CorsConfig.java`.
2. **Variables de Entorno no leídas**: Recordar que en Vite todas las variables públicas deben llevar el prefijo `VITE_`.
3. **Problemas de caché de dependencias**:
   ```bash
   npm run build -- --emptyOutDir
   ```
