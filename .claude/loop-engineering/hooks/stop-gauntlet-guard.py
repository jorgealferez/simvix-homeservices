#!/usr/bin/env python3
"""Stop hook (loop-engineering): impide cerrar el turno con cambios sin verificar por el Gauntlet Loop.

Bloquea (exit 2) cuando el arbol de trabajo tiene cambios y NO existe una pasada del gauntlet que sea,
a la vez: VERDE, completa (no `-g`), del perfil exigido por el tipo de cambio, y posterior al ultimo
archivo modificado.

Cota por PROGRESO, no por cortesia: cada bloqueo guarda una clave con (rutas cambiadas, fecha del
ultimo cambio, fecha de la ultima pasada). Si la clave no cambia en MAX_SIN_PROGRESO bloqueos
seguidos, deja cerrar con un ESCALADO y exige explicar por que no se puede dejar en verde. Cualquier
edicion o cualquier pasada nueva reinicia el contador. A proposito no basta con `stop_hook_active`:
honrarlo dejaria cerrar a la segunda con el arbol igual de sin verificar.

Valvula de escape, solo para personas:  touch .claude/.gauntlet/disable-stop-guard
"""

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "checks"))
import ledger  # noqa: E402

DOC_SUFFIXES = (".md", ".txt", ".rst", ".adoc")
DOC_PREFIXES = ("docs/",)
MAX_SIN_PROGRESO = 2
RUNNER = ".claude/loop-engineering/gauntlet.py"


def changed_paths(root: Path) -> list[str]:
    # -uall: los directorios sin seguimiento se listan archivo a archivo; -z: rutas sin escapar.
    res = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "-uall"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        return []
    paths = []
    fields = res.stdout.split("\0")
    i = 0
    while i < len(fields):
        entry = fields[i]
        i += 1
        if len(entry) < 4:
            continue
        status, path = entry[:2], entry[3:]
        if status[0] in "RC":  # renombrado/copiado: el siguiente campo es el origen
            i += 1
        paths.append(path)
    return paths


def block(message: str) -> int:
    print(message, file=sys.stderr)
    return 2


def main() -> int:
    try:
        json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        pass

    if ledger.yields_to_repo_copy(Path(__file__)):
        return 0  # el repositorio registra su propia copia de este hook: manda la suya

    root = ledger.repo_root()
    state_dir = root / ".claude" / ".gauntlet"
    if (state_dir / "disable-stop-guard").exists():
        return 0

    # Sin manifiesto no hay gauntlet que exigir: este repositorio no tiene el sistema instalado
    # (caso normal cuando los hooks llegan por plugin). Se avisa una vez por turno y se deja cerrar;
    # bloquear pidiendo una pasada imposible seria un callejon sin salida.
    if not (root / ".claude" / "gauntlet.json").is_file():
        if changed_paths(root):
            print(
                "[gauntlet] Este repositorio no declara puertas (.claude/gauntlet.json) y tiene cambios sin "
                "verificar. Instala el sistema con `bin/loop-init` desde el repositorio de reglas para que el "
                "Gauntlet Loop aplique aqui."
            )
        return 0

    # El ledger es estado de continuidad, no un entregable: actualizarlo no exige gauntlet.
    exempt = {ledger.ledger_path(root).name}
    paths = [p for p in changed_paths(root) if p not in exempt]
    if not paths:
        return 0

    # Tras `loop-init` el arbol tiene la instalacion sin commitear, que el agente no ha escrito.
    # Exigirle una pasada por ella es mandarle a verificar trabajo ajeno: se avisa y se deja cerrar.
    if ledger.only_install_pending(root, paths):
        print(
            f"[gauntlet] Los {len(paths)} archivo(s) sin commitear son la instalacion del loop, no trabajo "
            "de este turno. Commiteala (el pre-commit pasara el perfil `fast`) y a partir de ahi el "
            "gauntlet aplica a lo que escribas tu."
        )
        return 0

    docs_only = all(
        p.endswith(DOC_SUFFIXES) or p.startswith(DOC_PREFIXES) for p in paths
    )
    required = "fast" if docs_only else "full"
    accepted = {"full"} if required == "full" else {"fast", "full"}
    cmd = f"bin/gauntlet -p {required}   (o python3 {RUNNER} -p {required})"
    sample = ", ".join(paths[:5]) + (" ..." if len(paths) > 5 else "")

    problems = []
    last = state_dir / "last-run.json"
    run_mtime = 0.0
    if not last.is_file():
        problems.append(
            "ninguna ejecucion del gauntlet registrada en esta copia de trabajo"
        )
    else:
        try:
            data = json.loads(last.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = {}
            problems.append("last-run.json ilegible")
        if data.get("verdict") != "VERDE":
            problems.append(
                f"la ultima pasada quedo en {data.get('verdict')} ({', '.join(data.get('failing') or []) or 'sin detalle'})"
            )
        if data.get("partial"):
            problems.append(
                "la ultima ejecucion fue parcial (-g) y una parcial no cierra una tarea"
            )
        if data.get("profile") not in accepted:
            problems.append(
                f"el cambio exige el perfil '{required}' y la ultima pasada fue del perfil '{data.get('profile')}'"
            )
        run_mtime = last.stat().st_mtime
        stale = [
            p
            for p in paths
            if (root / p).exists() and (root / p).stat().st_mtime > run_mtime
        ]
        if stale:
            problems.append(
                "hay cambios posteriores a la ultima pasada verde: "
                + ", ".join(stale[:5])
                + (" ..." if len(stale) > 5 else "")
            )

    if not problems:
        return 0

    # cota por progreso
    newest = max(
        ((root / p).stat().st_mtime for p in paths if (root / p).exists()), default=0.0
    )
    key = hashlib.sha1(
        ("\n".join(sorted(paths)) + f"|{newest:.3f}|{run_mtime:.3f}").encode("utf-8")
    ).hexdigest()
    state_dir.mkdir(parents=True, exist_ok=True)
    state_path = state_dir / "gauntlet-guard.json"
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        state = {}
    blocks = state.get("blocks", 0) + 1 if state.get("key") == key else 1
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    if blocks > MAX_SIN_PROGRESO:
        state_path.write_text(
            json.dumps({"key": key, "blocks": 0, "at": now}), encoding="utf-8"
        )
        print(
            f"[gauntlet] ESCALADO: {MAX_SIN_PROGRESO} cierres seguidos con {len(paths)} archivo(s) sin verificar y sin "
            "ninguna edicion ni pasada nueva. Se permite cerrar, pero NO es un cierre limpio: di en el informe que "
            "puerta no puede quedar en verde, la causa raiz y que decision pides al usuario."
        )
        return 0
    state_path.write_text(
        json.dumps({"key": key, "blocks": blocks, "at": now}), encoding="utf-8"
    )

    detalle = "\n".join(f"           - {p}" for p in problems)
    return block(
        f"[gauntlet] No puedes cerrar el turno con {len(paths)} archivo(s) sin verificar ({sample}):\n"
        f"{detalle}\n"
        f"           Ejecuta: {cmd}\n"
        f"           Bloqueo {blocks}/{MAX_SIN_PROGRESO} sin progreso (una edicion o una pasada nueva reinician el contador).\n"
        "           Si el rojo es preexistente o el arreglo exige violar una regla dura, escala al usuario "
        "explicitamente en vez de cerrar en silencio."
    )


if __name__ == "__main__":
    sys.exit(main())
