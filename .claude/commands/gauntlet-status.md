---
description: Muestra el veredicto de la ultima ejecucion del gauntlet y si sigue siendo valido
allowed-tools: Bash(cat:*), Bash(ls:*), Bash(git status:*), Bash(python3:*)
---

Ultima ejecucion registrada:

!`python3 - <<'PY'
import json, subprocess
from pathlib import Path
root = Path(subprocess.run(["git","rev-parse","--show-toplevel"],capture_output=True,text=True).stdout.strip() or ".")
last = root / ".claude/.gauntlet/last-run.json"
if not last.is_file():
    print("Sin ejecuciones registradas en esta copia de trabajo: ejecuta /gauntlet.")
    raise SystemExit(0)
d = json.loads(last.read_text())
print(f"veredicto : {d['verdict']}  ({d['scope']}, {'PARCIAL' if d['partial'] else 'completa'})")
print(f"fecha     : {d['timestamp']}  ({d['duration_seconds']}s)")
print(f"passed    : {', '.join(d['passed']) or '-'}")
print(f"failing   : {', '.join(d['failing']) or '-'}")
print(f"skipped   : {', '.join(d['skipped']) or '-'}")
out = subprocess.run(["git","status","--porcelain=v1","-z","-uall"],capture_output=True,text=True,cwd=root).stdout
paths = [e[3:] for e in out.split("\0") if len(e) > 3]
if paths:
    mt = last.stat().st_mtime
    newer = [p for p in paths if (root/p).exists() and (root/p).stat().st_mtime > mt]
    print(f"arbol     : {len(paths)} archivo(s) sin commitear")
    if newer:
        print(f"VALIDEZ   : CADUCADO. Modificados despues de la ultima pasada: {', '.join(newer[:10])}")
    else:
        print("VALIDEZ   : vigente para los cambios actuales")
else:
    print("arbol     : limpio")
PY`

Recuerda: solo una pasada **completa** (`-p full`), **en VERDE** y **posterior al ultimo cambio** cierra
una tarea de codigo. Si arriba pone CADUCADO o PARCIAL, ejecuta `/gauntlet`.
