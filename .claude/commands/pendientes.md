---
description: Muestra el ledger de continuidad del repositorio (PENDIENTES.<repo>.md) - que queda activo, que espera, que esta bloqueado y cual es el siguiente paso
argument-hint: "[ruta de otro repositorio de trabajo]"
allowed-tools: Bash(python3:*), Bash(cat:*)
---

Ledger del repositorio de trabajo (o del indicado en `$ARGUMENTS`; el fichero se nombra por
repositorio y nunca se mezclan desarrollos):

!`python3 - "$ARGUMENTS" <<'PY'
import subprocess, sys
from pathlib import Path
arg = (sys.argv[1] or "").strip()
root = Path(arg).resolve() if arg else Path(subprocess.run(["git","rev-parse","--show-toplevel"],capture_output=True,text=True).stdout.strip() or ".").resolve()
sys.path.insert(0, str(root / ".claude/loop-engineering/checks"))
try:
    import ledger
except ImportError:
    print(f"{root}: sistema Loop Engineering no instalado (falta .claude/loop-engineering). Instala con bin/loop-init desde el repositorio de reglas.")
    raise SystemExit(0)
st = ledger.load_state(root)
lname = Path(st["ledger_path"]).name
print(f"repositorio : {st['repo_name']}  ->  {lname}")
if not st["ledger_exists"]:
    print("FALTA el ledger: la puerta `ledger` esta en rojo. Ejecuta loop-init.")
    raise SystemExit(0)
print(f"continuidad : {'PAUSADA (solo una persona puede reactivarla)' if st['paused'] else 'activa'}")
print(f"activo      : {len(st['activos'])}   esperando: {len(st['esperando'])}   bloqueado: {len(st['bloqueados'])}   hecho: {len(st['hechos'])}")
libres = st["activos_sin_reservar"]
if libres:
    print("SIGUIENTE   :", libres[0])
    for t in libres[1:6]: print("  en cola   :", t)
    if len(libres) > 6: print(f"  ... y {len(libres)-6} mas")
for t in st["activos"]:
    if ledger.is_reserved(t): print("reservado   :", t)
for t in st["esperando"]: print("esperando   :", t)
for t in st["bloqueados"]: print("bloqueado   :", t)
if not st["activos"]:
    est = st["estado"] or "sin carta"
    print(f"meta        : {est} — fases pendientes {len(st['fases_pendientes'])} · criterios pendientes {len(st['criterios_pendientes'])}")
    if est == "sin-encuadrar": print("SIGUIENTE   : ENCUADRE (rellenar la carta y sembrar ## Activo)")
    elif st["fases_pendientes"]: print("SIGUIENTE   : planificar en ## Activo ->", st["fases_pendientes"][0])
PY`

Si hay un item en **SIGUIENTE**, no lo comentes: resevalo (`EN CURSO (<sesion>, <fecha>)`) y ejecutalo.
Regla de continuidad y protocolo completo en la skill `continuidad`. Para retomarlo explicitamente:
`/continuar`.
