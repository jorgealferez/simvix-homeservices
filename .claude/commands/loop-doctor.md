---
description: Diagnostica la instalacion del sistema Loop Engineering en el repositorio de trabajo (version, integridad, hooks, ledger y carta)
argument-hint: "[ruta-del-repo]"
allowed-tools: Bash(python3:*), Bash(bin/loop-doctor:*), Bash(bash:*), Bash(git:*), Bash(cat:*)
---

Diagnostico local (funciona aunque el repositorio de reglas no este adjunto):

!`root=$(git rev-parse --show-toplevel 2>/dev/null || pwd); cd "$root" && { [ -f .claude/loop-engineering.json ] && python3 -c "import json;d=json.load(open('.claude/loop-engineering.json'));print('version', d.get('version'), '· repo_name', d.get('repo_name'), '· origen', d.get('source_path'))" || echo "NO INSTALADO: falta .claude/loop-engineering.json"; } && { [ -x .claude/loop-engineering/checks/enforcement.sh ] && bash .claude/loop-engineering/checks/enforcement.sh 2>&1 | tail -n 15; } && { [ -x .claude/loop-engineering/checks/ledger.py ] && python3 .claude/loop-engineering/checks/ledger.py --brief; }`

Si el repositorio de reglas esta accesible, el diagnostico completo (con comparacion de version y sumas
frente a la capa canonica) es:

```bash
<reglas>/bin/loop-doctor $ARGUMENTS
```

Si aparece `PROBLEMA` o la puerta `enforcement` esta en rojo, arreglalo antes de tocar nada:
`<reglas>/bin/loop-init <repo> --update` restaura la capa canonica y los registros;
`git config core.hooksPath .githooks` engancha el pre-commit. Desactivar algo exige peticion explicita
del usuario.
