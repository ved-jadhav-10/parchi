# Benchmark report

Gold set: 50 cases. draft: expected alerts were written by the developer from drug labels and guidelines (the `why` of each case), independent of the engine, and have NOT yet been reviewed by a pharmacist

## Parchi engine

alerts per Rx 0.82, interrupts per Rx 0.2, false alarms on clean Rx 0.0

Missed (expected, not raised):
- S19: ddi:ramipril+spironolactone
- S20: ddi:telmisartan+ramipril

Extra (raised, not expected):
- none

