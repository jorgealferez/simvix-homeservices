---
description: Ejecuta una o varias puertas sueltas del gauntlet (iteracion rapida, ejecucion parcial)
argument-hint: "<id-puerta> [otro-id ...]"
allowed-tools: Bash(bin/gauntlet:*), Bash(python3 .claude/loop-engineering/gauntlet.py:*)
---

Ejecuta solo las puertas indicadas (`$ARGUMENTS`), construyendo el comando con un `-g` por id:

```bash
bin/gauntlet -g <id> [-g <id> ...]
```

Si no se ha indicado ninguna puerta, ejecuta primero `bin/gauntlet --list` y elige las que tu cambio
toca (no preguntes: decide por el diff).

Esto es **iteracion rapida de la Fase 2**, no un veredicto: el runner marca la ejecucion como parcial y
una ejecucion parcial **nunca** cierra una tarea. Cuando la puerta pase, vuelve a la pasada completa
con `/gauntlet`.
