---
description: Muestra la carta de meta del repositorio (OBJETIVO.<repo>.md) - estado, inicio, meta, criterios y fases pendientes
argument-hint: "[ruta de otro repositorio de trabajo]"
allowed-tools: Bash(python3:*), Bash(cat:*)
---

Carta de meta del repositorio de trabajo (o del indicado en `$ARGUMENTS`):

!`python3 - "$ARGUMENTS" <<'PY'
import subprocess, sys
from pathlib import Path
arg = (sys.argv[1] or "").strip()
root = Path(arg).resolve() if arg else Path(subprocess.run(["git","rev-parse","--show-toplevel"],capture_output=True,text=True).stdout.strip() or ".").resolve()
sys.path.insert(0, str(root / ".claude/loop-engineering/checks"))
try:
    import ledger
except ImportError:
    print(f"{root}: sistema Loop Engineering no instalado. Instala con bin/loop-init desde el repositorio de reglas.")
    raise SystemExit(0)
st = ledger.load_state(root)
cname = Path(st["charter_path"]).name
print(f"repositorio : {st['repo_name']}  ->  {cname}")
if not st["charter_exists"]:
    print("FALTA la carta: ejecuta loop-init y haz el encuadre.")
    raise SystemExit(0)
text = Path(st["charter_path"]).read_text(encoding="utf-8")
charter = ledger.parse_charter(text)
print(f"estado      : {st['estado']}")
meta = charter["section_text"].get("meta", "").strip()
print("meta        :", (meta.splitlines() or ["(vacio)"])[0][:200])
print(f"criterios   : {len(st['criterios_pendientes'])} pendientes")
for c in st["criterios_pendientes"][:8]: print("   - [ ]", c[:160])
print(f"fases       : {len(st['fases_pendientes'])} pendientes")
for f in st["fases_pendientes"][:8]: print("   - [ ]", f[:160])
dec = charter["section_text"].get("decisiones del usuario", "").strip()
if dec and dec != "(vacio)":
    print("decisiones  :")
    for line in dec.splitlines()[:6]: print("   ", line[:160])
if st["estado"] == "sin-encuadrar":
    print("SIGUIENTE   : ENCUADRE. Lee la base real del repositorio y rellena la carta; no preguntes, escribe las suposiciones.")
elif st["estado"] == "en-curso" and not st["activos"] and st["fases_pendientes"]:
    print("SIGUIENTE   : planificar en ## Activo del ledger ->", st["fases_pendientes"][0])
PY`

La carta manda: la meta se deriva de la base real y de la peticion del usuario, las suposiciones se
escriben en ella, y `estado: alcanzado` solo con todos los criterios medidos (skill `loop-engineering`).
