# Modelo de Inferencia Clínica Tabular

Para garantizar alta disponibilidad incluso sin conectividad a la nube, el frontend incluye un clasificador predictivo determinista basado en matrices de criticidad clínica.

## Parámetros Evaluados
- Frecuencia cardíaca (FC)
- Frecuencia respiratoria (FR)
- Presión arterial sistólica y diastólica (PAS/PAD)
- Saturación de oxígeno (SpO2)
- Escala de Coma de Glasgow (GCS)
- Dolor escala EVA (0-10)

## Algoritmo
Normaliza las anomalías fisiológicas calculando un índice de desviación ponderada que asigna el nivel Manchester correspondiente.
