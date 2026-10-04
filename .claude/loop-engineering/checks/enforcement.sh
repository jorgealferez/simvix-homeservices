#!/usr/bin/env bash
# Puerta `enforcement` del Gauntlet Loop (loop-engineering): verifica que la regla sigue siendo inevitable.
#
# Existe para que desactivar el sistema no pueda pasar desapercibido: si alguien borra un hook, le quita
# el bit de ejecucion, lo desregistra de settings.json, desengancha core.hooksPath o deja de ignorar el
# estado local, esta puerta se pone en rojo.
#
# Falla (exit 1) si:
#   1. falta o no es ejecutable alguna pieza de la capa mecanica (.claude/loop-engineering, pre-commit, bin/gauntlet)
#   2. .claude/settings.json no registra SessionStart, UserPromptSubmit, Stop (x2) y PreToolUse con el hook
#      canonico (por sufijo de ruta y con el archivo ejecutable), o el matcher del PreToolUse no cubre
#      Edit, Write y Bash. En el propio repositorio de reglas (marcador .loop-engineering-root) el
#      PreToolUse no se exige: alli el repositorio principal ES el de reglas.
#   3. core.hooksPath no apunta a .githooks
#   4. .gitignore no cubre .claude/.gauntlet/ (el estado local ensuciaria el arbol y el guard Stop nunca daria paso)
#   5. falta el ledger PENDIENTES.<repo>.md o la carta OBJETIVO.<repo>.md
#   6. la capa canonica no coincide con las sumas registradas en .claude/loop-engineering.json (manipulacion local)
#      -> en el repositorio de reglas es AVISO (alli se edita la capa canonica; loop-init --self la resella)
# Avisa (sin fallar) si una puerta presente en el manifiesto de HEAD ha desaparecido o pasa a enabled:false,
# y si alguna valvula de escape esta activada.

set -uo pipefail

le=".claude/loop-engineering"
findings=0
report() { findings=$(( findings + 1 )); printf '\n[enforcement] %s\n' "$1"; }
warn() { printf '[enforcement] AVISO: %s\n' "$1"; }

is_rules_repo=0
[ -f .loop-engineering-root ] && is_rules_repo=1

require_exec() {
  if [ ! -f "$1" ]; then
    report "falta el archivo de enforcement: $1"
  elif [ ! -x "$1" ]; then
    report "$1 existe pero no es ejecutable (chmod +x \"$1\")"
  fi
}

for f in "$le/gauntlet.py" "$le/checks/hygiene.sh" "$le/checks/enforcement.sh" "$le/checks/ledger.py" \
         "$le/checks/ratchet.py" "$le/hooks/session-start.sh" "$le/hooks/user-prompt.sh" \
         "$le/hooks/stop-gauntlet-guard.py" "$le/hooks/stop-continuity-guard.py" \
         "$le/hooks/protect-rules-repo.py" .githooks/pre-commit bin/gauntlet; do
  require_exec "$f"
done

settings=.claude/settings.json
if [ ! -f "$settings" ]; then
  report "falta $settings: los hooks de Claude Code no estan registrados"
elif ! python3 -m json.tool "$settings" >/dev/null 2>&1; then
  report "$settings no es JSON valido"
else
  pairs="SessionStart:session-start.sh UserPromptSubmit:user-prompt.sh Stop:stop-gauntlet-guard.py Stop:stop-continuity-guard.py"
  [ "$is_rules_repo" = 1 ] || pairs="$pairs PreToolUse:protect-rules-repo.py"
  for pair in $pairs; do
    event="${pair%%:*}"; script="${pair##*:}"
    result=$(python3 - "$settings" "$event" "$script" "$le" <<'PY'
import json, os, sys
settings, event, script, le = sys.argv[1:5]
data = json.load(open(settings, encoding="utf-8"))
suffix = f"{le}/hooks/{script}"
for entry in data.get("hooks", {}).get(event, []):
    for hook in entry.get("hooks", []):
        cmd = (hook.get("command") or "").strip()
        if not cmd.endswith(suffix):
            continue
        path = cmd.replace("$CLAUDE_PROJECT_DIR/", "").replace("${CLAUDE_PROJECT_DIR}/", "")
        if not os.access(path, os.X_OK):
            print(f"registrado pero {path} no existe o no es ejecutable"); sys.exit(0)
        if event == "PreToolUse":
            matcher = entry.get("matcher") or ""
            missing = [t for t in ("Edit", "Write", "Bash") if t not in matcher]
            if missing:
                print(f"matcher '{matcher}' no cubre {', '.join(missing)}"); sys.exit(0)
        print("ok"); sys.exit(0)
print("ausente")
PY
)
    if [ "$result" != "ok" ]; then
      if [ "$result" = "ausente" ]; then
        if git show "HEAD:$settings" 2>/dev/null | grep -q "$le/hooks/$script"; then
          report "$settings ha dejado de registrar el hook $event -> $script (estaba en HEAD). Restauralo."
        else
          report "$settings no registra el hook $event -> $script. Arreglo: loop-init --update"
        fi
      else
        report "$settings: hook $event -> $script: $result"
      fi
    fi
  done
fi

hooks_path=$(git config --get core.hooksPath 2>/dev/null || true)
if [ "$hooks_path" != ".githooks" ]; then
  report "core.hooksPath es '${hooks_path:-<sin definir>}' y deberia ser '.githooks' (el pre-commit no se esta ejecutando). Arreglo: git config core.hooksPath .githooks"
fi

if ! git check-ignore -q .claude/.gauntlet/last-run.json 2>/dev/null; then
  report ".gitignore no cubre .claude/.gauntlet/: el estado local del gauntlet ensuciaria el arbol. Anade la linea '.claude/.gauntlet/'"
fi

if [ -x "$le/checks/ledger.py" ]; then
  paths=$(python3 "$le/checks/ledger.py" --paths 2>/dev/null || true)
  ledger=$(printf '%s\n' "$paths" | sed -n 's/^ledger=//p')
  charter=$(printf '%s\n' "$paths" | sed -n 's/^charter=//p')
  [ -n "$ledger" ] && [ ! -f "$ledger" ] && report "falta el ledger $(basename "$ledger"): sin el, el hook Stop de continuidad no sabe si queda trabajo"
  [ -n "$charter" ] && [ ! -f "$charter" ] && report "falta la carta de meta $(basename "$charter"): sin ella no hay a donde llegar"
fi

meta=.claude/loop-engineering.json
if [ -f "$meta" ]; then
  drift=$(python3 - "$meta" <<'PY'
import hashlib, json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
bad = []
for rel, digest in (data.get("files") or {}).items():
    try:
        h = hashlib.sha256(open(rel, "rb").read()).hexdigest()
    except OSError:
        bad.append(f"{rel} (ausente)"); continue
    if h != digest:
        bad.append(rel)
print("\n".join(bad))
PY
)
  if [ -n "$drift" ]; then
    msg="la capa canonica no coincide con las sumas de $meta: $(printf '%s' "$drift" | tr '\n' ' ')"
    if [ "$is_rules_repo" = 1 ]; then
      warn "$msg (repositorio de reglas: resella con 'python3 tools/loop_init.py --self .')"
    else
      report "$msg. Si es una actualizacion legitima ejecuta loop-init --update; si no, alguien ha modificado los hooks a mano"
    fi
  fi
else
  warn "falta $meta: no se puede comprobar la integridad de la capa canonica (instalacion hecha a mano?)"
fi

if git show HEAD:.claude/gauntlet.json >/dev/null 2>&1 && [ -f .claude/gauntlet.json ]; then
  python3 - <<'PY' || true
import json, subprocess
try:
    head = json.loads(subprocess.run(["git", "show", "HEAD:.claude/gauntlet.json"], capture_output=True, text=True).stdout)
    now = json.load(open(".claude/gauntlet.json", encoding="utf-8"))
except Exception:
    raise SystemExit(0)
before = {g["id"]: g for g in head.get("gates", []) if isinstance(g, dict) and "id" in g}
after = {g["id"]: g for g in now.get("gates", []) if isinstance(g, dict) and "id" in g}
for gid, g in before.items():
    if gid not in after:
        print(f"[enforcement] AVISO: la puerta '{gid}' estaba en HEAD y ya no esta en el manifiesto. Quitar una puerta exige peticion explicita del usuario y commit aparte.")
    elif g.get("enabled", True) and not after[gid].get("enabled", True):
        print(f"[enforcement] AVISO: la puerta '{gid}' ha pasado a enabled:false. Solo con peticion explicita del usuario y disabled_reason escrito.")
PY
fi

[ -f .claude/.gauntlet/disable-continuity-guard ] && warn "el guard de continuidad esta desactivado (.claude/.gauntlet/disable-continuity-guard)."
[ -f .claude/.gauntlet/disable-stop-guard ] && warn "el guard del gauntlet esta desactivado (.claude/.gauntlet/disable-stop-guard). Es una decision humana legitima, pero mientras exista nadie impide cerrar un turno sin verificar."

if [ "$findings" -gt 0 ]; then
  printf '\n[enforcement] %d problema(s): el Gauntlet Loop ha dejado de ser inevitable.\n' "$findings"
  exit 1
fi
echo "[enforcement] OK: capa mecanica presente y ejecutable, hooks registrados, core.hooksPath=.githooks, estado local ignorado, ledger y carta presentes."
exit 0
