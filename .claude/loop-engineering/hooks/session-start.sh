#!/usr/bin/env bash
# SessionStart hook (loop-engineering).
#
#   1. engancha el pre-commit de git que ejecuta el perfil `fast` del gauntlet
#   2. instala dependencias en sesiones remotas (Claude Code on the web), por toolchain detectado
#   3. recuerda la regla permanente, el estado de la meta y el primer item activo, y lista las puertas
#
# La salida estandar se inyecta en el contexto de la sesion: se mantiene corta.

set -uo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" || exit 0
le=".claude/loop-engineering"

# 1. hook de git (idempotente)
current=$(git config --get core.hooksPath 2>/dev/null || true)
if [ "$current" != ".githooks" ] && [ -d .githooks ]; then
  git config core.hooksPath .githooks && echo "[gauntlet] core.hooksPath -> .githooks (pre-commit activo)"
fi

# 2. dependencias, solo en remoto y solo para lo que el proyecto declara
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  logdir="${TMPDIR:-/tmp}"
  if [ -f package.json ] && [ ! -d node_modules ]; then
    if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then cmd="pnpm install --frozen-lockfile";
    elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then cmd="yarn install --frozen-lockfile";
    elif [ -f package-lock.json ]; then cmd="npm ci --no-audit --no-fund";
    else cmd="npm install --no-audit --no-fund"; fi
    if $cmd >"$logdir/loop-deps-node.log" 2>&1; then echo "[gauntlet] dependencias node instaladas ($cmd)";
    else echo "[gauntlet] AVISO: '$cmd' ha fallado; revisa $logdir/loop-deps-node.log"; fi
  fi
  if [ -f requirements.txt ] && command -v python3 >/dev/null 2>&1; then
    python3 -m pip install -q -r requirements.txt >"$logdir/loop-deps-python.log" 2>&1 \
      && echo "[gauntlet] dependencias python instaladas (requirements.txt)" \
      || echo "[gauntlet] AVISO: pip install -r requirements.txt ha fallado; revisa $logdir/loop-deps-python.log"
  fi
  if [ -f go.mod ] && command -v go >/dev/null 2>&1; then
    go mod download >"$logdir/loop-deps-go.log" 2>&1 && echo "[gauntlet] modulos go descargados" \
      || echo "[gauntlet] AVISO: go mod download ha fallado; revisa $logdir/loop-deps-go.log"
  fi
  if [ -f Cargo.toml ] && command -v cargo >/dev/null 2>&1; then
    cargo fetch >"$logdir/loop-deps-cargo.log" 2>&1 && echo "[gauntlet] crates descargados" \
      || echo "[gauntlet] AVISO: cargo fetch ha fallado; revisa $logdir/loop-deps-cargo.log"
  fi
fi

# 3. si el sistema no esta instalado en este repositorio (caso normal cuando los hooks llegan por
# plugin), lo primero es decir como instalarlo; las reglas siguen vigentes, pero sin puertas que correr.
if [ ! -f "$le/gauntlet.py" ] || [ ! -f .claude/gauntlet.json ]; then
  cat <<'MSG'
[loop-engineering] Este repositorio NO tiene el sistema instalado (falta .claude/gauntlet.json o la
  capa mecanica). Las reglas de Loop Engineering siguen vigentes, pero no hay puertas que ejecutar.
  Primera accion, sin pedir permiso: instalarlo desde el repositorio de reglas.
    <reglas>/bin/loop-init .
  Despues: bin/gauntlet -p full y, si la carta queda sin-encuadrar, el encuadre (skill loop-engineering).
MSG
  exit 0
fi

# 4. regla permanente + estado
cat <<'MSG'
[loop-engineering] REGLAS PERMANENTES DE ESTE REPOSITORIO (no necesitan comando):
  - Gauntlet Loop: todo cambio en un archivo versionado se cierra con `bin/gauntlet -p full` en VERDE
    posterior al ultimo cambio. Codigo/config -> full. Solo documentacion -> fast como minimo.
    Un SKIP no es un PASS: declara siempre las puertas omitidas y su motivo.
  - De la base a la meta: OBJETIVO.<repo>.md dice de donde se parte y a donde se llega; se avanza fase a
    fase (PR + squash merge) sin pedir permiso hasta `estado: alcanzado`.
  - Continuidad: mientras PENDIENTES.<repo>.md tenga items en ## Activo, se sigue; parar se escribe.
  - Un ledger y una carta POR REPOSITORIO, nombrados por repositorio: nunca se mezclan desarrollos.
  - El repositorio de reglas (loop-engineering-rules) es de solo lectura en esta sesion.
  Protocolo completo: skills loop-engineering, gauntlet-loop y continuidad.
MSG
python3 "$le/checks/ledger.py" --brief 2>/dev/null || true
python3 "$le/gauntlet.py" --list 2>/dev/null | sed 's/^/[gauntlet] /' | grep -v '^\[gauntlet\]       \$' || true
exit 0
