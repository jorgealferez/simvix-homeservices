---
description: Lista las puertas del gauntlet, su orden de ejecucion, perfiles y comando
allowed-tools: Bash(bin/gauntlet:*), Bash(python3 .claude/loop-engineering/gauntlet.py:*)
---

Puertas declaradas en `.claude/gauntlet.json` (el orden de la lista es el orden de ejecucion):

!`bin/gauntlet --list 2>&1 || python3 .claude/loop-engineering/gauntlet.py --list`

Usa esta lista para decidir que puertas puede romper tu cambio antes de tocarlo (Fase 0 del bucle) y
para declarar la confirmacion obligatoria con las puertas previstas.
