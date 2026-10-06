# Ciclo de Vida y Hooks en el Frontend

La aplicación utiliza hooks funcionales de React para la reactividad:

- `useState`: Gestión del estado del formulario de admisión, filtros de la cola y alertas.
- `useEffect`: Sincronización periódica con el backend para actualizar los tiempos de espera.
- `useCallback` / `useMemo`: Optimización en el cálculo del score de criticidad para prevenir renderizados innecesarios.
