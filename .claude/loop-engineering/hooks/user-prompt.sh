#!/usr/bin/env bash
# UserPromptSubmit (loop-engineering): reinyecta las reglas permanentes en cada turno, para que no se
# diluyan en conversaciones largas. La salida estandar se anade al contexto: se mantiene minima.
set -uo pipefail
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cat <<'MSG'
[gauntlet] Regla permanente activa (skill gauntlet-loop). Si este turno va a tocar algun archivo
  versionado: CONFIRMALO en tu primera linea con
  "Gauntlet Loop: ACTIVO — perfil <fast|full> · puertas previstas: <ids>"
  y cierra con el informe real del runner (VERDE/ROJO, PASS/SKIP/FAIL, iteraciones).
  Pasada que cierra tarea: bin/gauntlet -p full
MSG
python3 "$root/.claude/loop-engineering/checks/ledger.py" --brief 2>/dev/null || true
exit 0
