#!/usr/bin/env python3
"""Stop hook de continuidad (loop-engineering): un agente no se duerme con trabajo pendiente.

Lee el ledger `PENDIENTES.<repo>.md` y la carta `OBJETIVO.<repo>.md` del repositorio de trabajo.

  - Hay items sin marcar en `## Activo` -> bloquea (exit 2) y devuelve el primero sin reservar.
  - `## Activo` vacio pero la META NO ESTA ALCANZADA -> bloquea con la instruccion concreta:
      * estado sin-encuadrar: haz el encuadre y siembra el ledger;
      * estado en-curso con fases o criterios pendientes: planifica la siguiente fase en ## Activo.
    Salvo que haya items en `## Esperando` (con despertador) o `## Bloqueado` (decision humana).
  - Meta alcanzada, pausada o ledger pausado -> deja cerrar.

Cota por PROGRESO: cada bloqueo guarda el hash del texto de `## Activo` mas el de la carta. Si no
cambia en MAX_SIN_PROGRESO bloqueos seguidos, deja cerrar con ESCALADO y exige `BLOQUEADO: <motivo>`
o una pregunta concreta. No honra `stop_hook_active`: honrarlo dejaria cerrar a la segunda.

Valvulas de escape, solo para personas:
  - `continuidad: pausada` en la cabecera del ledger, o `estado: pausado` en la carta (versionado)
  - `touch .claude/.gauntlet/disable-continuity-guard` (local)
"""

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "checks"))
import ledger  # noqa: E402

MAX_SIN_PROGRESO = 3


def changed_paths(root: Path) -> list[str]:
    res = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "-uall"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        return []
    paths, fields, i = [], res.stdout.split("\0"), 0
    while i < len(fields):
        entry = fields[i]
        i += 1
        if len(entry) < 4:
            continue
        if entry[0] in "RC":
            i += 1
        paths.append(entry[3:])
    return paths


def block(message: str) -> int:
    print(message, file=sys.stderr)
    return 2


def bounded(root: Path, key_text: str) -> tuple[int, bool]:
    """Devuelve (bloqueos consecutivos con la misma clave, hay_que_escalar)."""
    state_dir = root / ".claude" / ".gauntlet"
    state_dir.mkdir(parents=True, exist_ok=True)
    state_path = state_dir / "continuity.json"
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        state = {}
    key = hashlib.sha1(key_text.encode("utf-8")).hexdigest()
    blocks = state.get("blocks", 0) + 1 if state.get("hash") == key else 1
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    escalate = blocks > MAX_SIN_PROGRESO
    state_path.write_text(
        json.dumps({"hash": key, "blocks": 0 if escalate else blocks, "at": now}),
        encoding="utf-8",
    )
    return blocks, escalate


def main() -> int:
    try:
        json.load(sys.stdin)  # no se usa: la cota es el progreso, no stop_hook_active
    except (json.JSONDecodeError, ValueError):
        pass

    if ledger.yields_to_repo_copy(Path(__file__)):
        return 0  # el repositorio registra su propia copia de este hook: manda la suya

    root = ledger.repo_root()
    if (root / ".claude" / ".gauntlet" / "disable-continuity-guard").exists():
        return 0

    st = ledger.load_state(root)
    lname = Path(st["ledger_path"]).name
    cname = Path(st["charter_path"]).name
    if not st["ledger_exists"]:
        print(
            f"[continuidad] AVISO: falta {lname}; la puerta `ledger` lo pondra en rojo. Instala el sistema con loop-init."
        )
        return 0
    if st["paused"] or st["estado"] == "pausado":
        return 0

    activos = st["activos"]
    esperando = st["esperando"]
    bloqueados = st["bloqueados"]
    key_text = st["activo_text"] + "\n--\n" + st["charter_sha1"]
    recordatorio = (
        "           Salidas legitimas: terminar el item y marcarlo [x]; moverlo a ## Esperando con despertador "
        "programado; o ## Bloqueado con `BLOQUEADO: <motivo>` de la lista 'Cuando SI hay que parar'.\n"
        "           Recuerda: todo cambio versionado cierra con el gauntlet en VERDE (bin/gauntlet -p full)."
    )

    if activos:
        sin_reservar = st["activos_sin_reservar"]
        blocks, escalate = bounded(root, key_text)
        if escalate:
            print(
                f"[continuidad] ESCALADO: {MAX_SIN_PROGRESO} continuaciones seguidas sin ningun cambio en ## Activo de "
                f"{lname} ni en {cname}. Se permite cerrar el turno, pero esto no es un cierre limpio: marca el item "
                "como `BLOQUEADO: <motivo>` en ## Bloqueado o plantea al usuario la decision concreta que necesitas."
            )
            return 0
        if not sin_reservar:
            print(
                f"[continuidad] Todos los items activos de {lname} estan reservados (EN CURSO) por otra sesion. "
                "Si la reserva tiene mas de 24 h sin movimiento en su rama, ha caducado y puedes tomarla."
            )
            return 0
        primero = sin_reservar[0]
        resto = f" (+{len(activos) - 1} mas en cola)" if len(activos) > 1 else ""
        aviso_espera = (
            f"\n           Ademas hay {len(esperando)} item(s) en ## Esperando: si dependes de ellos, programa el despertador."
            if esperando
            else ""
        )
        return block(
            f"[continuidad] No cierres el turno: queda trabajo activo en {lname}{resto}.\n"
            f"           Siguiente: {primero}\n"
            f"           Continua con el sin pedir permiso ni preguntar si sigues (regla de continuidad).\n"
            f"           Bloqueo {blocks}/{MAX_SIN_PROGRESO} sin progreso en el ledger; el contador se reinicia al avanzar "
            f"(marcar un item, anadir subitems o notas de avance en ## Activo).\n{recordatorio}{aviso_espera}"
        )

    # Sin items activos: manda la carta de meta.
    if not st["charter_exists"]:
        print(
            f"[continuidad] AVISO: falta {cname}; sin carta de meta no se puede saber si el trabajo ha terminado."
        )
        return 0
    if st["meta_alcanzada"]:
        return 0
    if esperando:
        print(
            f"[continuidad] Sin items activos, pero hay {len(esperando)} en ## Esperando: asegurate de haber programado el despertador antes de cerrar."
        )
        return 0
    if bloqueados:
        print(
            f"[continuidad] Sin items activos; quedan {len(bloqueados)} en ## Bloqueado. La decision es del usuario: planteasela de forma concreta en el informe."
        )
        return 0

    fases = st["fases_pendientes"]
    criterios = st["criterios_pendientes"]
    estado = st["estado"]
    if estado == "sin-encuadrar":
        # El encuadre es obligatorio antes de TRABAJAR en el repositorio, no antes de responder una
        # pregunta. Si lo unico sin commitear es la propia instalacion, este turno no ha trabajado
        # aqui: se avisa y se deja cerrar. Medido: el guard exigia encuadrar un proyecto entero a un
        # agente al que solo se le habia pedido una cosa puntual, y la unica forma de obedecer era
        # inventarse la Meta y los Criterios. Un guard no puede empujar a fabricar contenido.
        changed = changed_paths(root)
        if not changed or ledger.only_install_pending(root, changed):
            print(
                f"[continuidad] {cname} esta sin-encuadrar. Antes de trabajar en este repositorio hay que "
                "hacer el encuadre (leer su base real y escribir Inicio, Meta, Criterios medibles y Fases). "
                "Si no sabes cual es la meta, PREGUNTASELA al usuario: no te la inventes para desbloquear "
                "un hook."
            )
            return 0
        blocks, escalate = bounded(root, key_text)
        if escalate:
            print(
                f"[continuidad] ESCALADO: {MAX_SIN_PROGRESO} cierres seguidos sin avanzar el encuadre de {cname}. Se permite cerrar; explica que impide encuadrar y que decision pides."
            )
            return 0
        return block(
            f"[continuidad] No cierres el turno: hay trabajo sin encuadrar. {cname} esta sin-encuadrar y "
            f"{lname} no tiene items activos, pero el arbol tiene cambios.\n"
            "           Haz el ENCUADRE: lee la base real del proyecto (README, docs, manifiestos, arbol, tests, CI),\n"
            f"           rellena en {cname} Inicio, Meta, Criterios de salida medibles y Fases ordenadas, pon `estado: en-curso`\n"
            f"           y siembra ## Activo de {lname} con la primera fase.\n"
            "           Una suposicion razonable sobre la base que has leido se escribe en la carta. Lo que NO sabes\n"
            "           (que quiere el usuario de este proyecto) se PREGUNTA: anota el item en ## Bloqueado con\n"
            "           `BLOQUEADO: falta la meta del proyecto` y plantea la decision. Inventar una Meta o unos\n"
            "           Criterios para que este hook deje de bloquear es falsear la carta, y esta prohibido.\n"
            f"           Bloqueo {blocks}/{MAX_SIN_PROGRESO} sin progreso (cualquier cambio en la carta o en ## Activo reinicia el contador)."
        )
    if fases or criterios:
        blocks, escalate = bounded(root, key_text)
        if escalate:
            print(
                f"[continuidad] ESCALADO: {MAX_SIN_PROGRESO} cierres seguidos con la meta de {cname} sin alcanzar y sin planificar nada. Se permite cerrar; di que impide seguir y que decision pides."
            )
            return 0
        siguiente = (
            fases[0]
            if fases
            else f"medir los {len(criterios)} criterio(s) de salida pendientes y cerrar la meta"
        )
        return block(
            f"[continuidad] No cierres el turno: la meta de {cname} no esta alcanzada y {lname} no tiene trabajo activo.\n"
            f"           Siguiente: {siguiente}\n"
            f"           Anade sus items a ## Activo de {lname} y sigue. Terminar una fase no es motivo para parar: es motivo para empezar la siguiente.\n"
            f"           Bloqueo {blocks}/{MAX_SIN_PROGRESO} sin progreso (cualquier cambio en la carta o en ## Activo reinicia el contador).\n{recordatorio}"
        )
    # Todo marcado pero estado en-curso: hay que cerrar la meta con medidas.
    blocks, escalate = bounded(root, key_text)
    if escalate:
        print(
            f"[continuidad] ESCALADO: fases y criterios marcados pero {cname} sigue en-curso tras {MAX_SIN_PROGRESO} cierres. Se permite cerrar; explica que falta para declarar la meta alcanzada."
        )
        return 0
    return block(
        f"[continuidad] {cname}: todas las fases y criterios estan marcados pero el estado sigue en-curso.\n"
        "           Si los criterios estan medidos y publicados en docs/benchmarks/, pon `estado: alcanzado` y cierra con el informe.\n"
        f"           Si falta alguna medida, anade el item a ## Activo de {lname}. Bloqueo {blocks}/{MAX_SIN_PROGRESO}."
    )


if __name__ == "__main__":
    sys.exit(main())
