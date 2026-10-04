---
description: Retoma el primer item activo sin reservar de PENDIENTES.<repo>.md (o la siguiente fase de la carta) y lo ejecuta ahora, sin preguntar ni pedir permiso
allowed-tools: Bash(python3:*), Bash(bin/gauntlet:*), Bash(git:*)
---

Siguiente tarea del repositorio de trabajo:

!`python3 - <<'PY'
import subprocess, sys
from pathlib import Path
root = Path(subprocess.run(["git","rev-parse","--show-toplevel"],capture_output=True,text=True).stdout.strip() or ".").resolve()
sys.path.insert(0, str(root / ".claude/loop-engineering/checks"))
try:
    import ledger
except ImportError:
    print("Sistema no instalado: la tarea es instalarlo (bin/loop-init desde el repositorio de reglas) y hacer el encuadre.")
    raise SystemExit(0)
st = ledger.load_state(root)
print(f"[{st['repo_name']}] ledger: {Path(st['ledger_path']).name} · carta: {Path(st['charter_path']).name}")
if st["activos_sin_reservar"]:
    print("ITEM:", st["activos_sin_reservar"][0])
elif st["activos"]:
    print("Todos los items activos estan reservados por otra sesion (EN CURSO). Si la reserva tiene mas de 24 h sin movimiento en su rama, ha caducado: tomala.")
elif st["estado"] == "sin-encuadrar":
    print("ITEM: ENCUADRE — rellenar la carta desde la base real (Inicio, Meta, Criterios medibles, Fases), estado en-curso, sembrar ## Activo, PR 'Fase 0 — Encuadre'.")
elif st["estado"] == "alcanzado":
    print("Meta alcanzada. Solo entran items nuevos pedidos por el usuario.")
elif st["fases_pendientes"]:
    print("ITEM: planificar en ## Activo la siguiente fase de la carta ->", st["fases_pendientes"][0])
elif st["criterios_pendientes"]:
    print(f"ITEM: medir y publicar los {len(st['criterios_pendientes'])} criterio(s) pendientes y cerrar la meta.")
else:
    print("Fases y criterios marcados: si las medidas estan publicadas, pon `estado: alcanzado` en la carta.")
PY`

Ejecutalo **ahora**, con estas reglas:

1. No preguntes si debes seguir, ni con que empezar, ni pidas confirmacion: la autorizacion ya esta
   dada (reglas de continuidad y de fases sin pedir permiso).
2. Resevalo primero: anade `EN CURSO (<sesion>, <fecha>)` al item y publica el ledger (commit y push)
   antes de escribir codigo.
3. Si el item es una fase, aplica la mecanica por fase de la skill `loop-engineering`: rama desde la
   principal, implementar con el Gauntlet Loop, benchmark + ADR, PR "Fase N — <titulo>", squash merge,
   marcar la fase en la carta y el item en el ledger, sembrar la siguiente.
4. Declara la confirmacion del gauntlet en tu primera linea y cierra con su informe real.
5. Al terminar: marca el item `[x]` en `## Hecho` (solo con el PR mergeado), toma el siguiente y sigue.
   No cierres el turno con items activos ni con la meta sin alcanzar salvo por una causa de la lista
   "Cuando SI hay que parar", y entonces por escrito en `## Bloqueado`.
