# Almacenamiento Temporal y Resiliencia en Cliente

Para evitar la pérdida accidental de datos durante la redacción de valoraciones clínicas:

- Se utiliza `sessionStorage` para guardar temporalmente el borrador de signos vitales mientras el enfermero completa la evaluación.
- Al confirmar el envío exitoso al backend, el borrador se purga automáticamente.
- Garantiza cumplimiento estricto de privacidad al no persistir historiales en disco permanente.
