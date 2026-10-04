---
description: Ejecuta el perfil fast del Gauntlet Loop (lo mismo que exige el hook de pre-commit)
argument-hint: "[argumentos extra para el runner]"
allowed-tools: Bash(bin/gauntlet:*), Bash(python3 .claude/loop-engineering/gauntlet.py:*)
---

Ejecuta las puertas baratas:

```bash
bin/gauntlet -p fast $ARGUMENTS
```

El perfil `fast` solo cierra cambios que sean **exclusivamente documentacion**. Para cualquier cambio
de codigo, config, build o dependencias la pasada que cuenta sigue siendo `/gauntlet` (perfil `full`).
Si sale ROJO, mismo protocolo: causa raiz, un arreglo, pasada completa desde el principio.
