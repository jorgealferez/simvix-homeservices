---
description: Ejecuta el Gauntlet Loop completo (perfil full) y aplica el protocolo hasta dejarlo en VERDE
argument-hint: "[argumentos extra para el runner, p.ej. --no-bail]"
allowed-tools: Bash(bin/gauntlet:*), Bash(python3 .claude/loop-engineering/gauntlet.py:*)
---

Ejecuta la pasada que cierra la tarea:

```bash
bin/gauntlet -p full $ARGUMENTS
```

Despues:

- **VERDE**: entrega el informe de cierre del protocolo (seccion 7 de la skill `gauntlet-loop`),
  declarando siempre las puertas omitidas y su motivo. Un SKIP no es un PASS.
- **ROJO**: aplica la Fase 4 del bucle: lee el log completo de la puerta que ha fallado, nombra la
  causa raiz en una frase, aplica **un** arreglo dirigido y **repite la pasada completa desde la
  primera puerta**. Nunca silencies una puerta para cerrarla (reglas duras, seccion 5).
- **ESCALADO** (misma puerta en rojo 3 ejecuciones seguidas, o el arreglo exige violar una regla
  dura): para ese item, muevelo a `## Bloqueado` con puerta, causa raiz, lo intentado y dos opciones
  con su coste, y sigue con los demas items del ledger.
