# Seguridad en el Cliente Frontend

- **Sanitización de Entradas**: Todos los campos de texto se sanean para prevenir ataques XSS.
- **No Persistencia de Datos Sensibles**: No se almacenan historiales clínicos en `localStorage` no cifrado.
- **Transmisión Cifrada**: En producción, todas las peticiones viajan bajo HTTPS estricto.
