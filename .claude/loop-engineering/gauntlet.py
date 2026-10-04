#!/usr/bin/env python3
"""Runner del Gauntlet Loop (loop-engineering, agnostico al proyecto).

Ejecuta, en orden, las puertas (gates) declaradas en `.claude/gauntlet.json`
y emite un veredicto binario y reproducible: VERDE o ROJO.

Codigos de salida:
  0  VERDE (ninguna puerta bloqueante ha fallado)
  1  ROJO  (al menos una puerta bloqueante ha fallado o ha agotado el tiempo)
  2  Error de configuracion (manifiesto ausente, invalido o argumentos malos)

Uso habitual (desde cualquier subdirectorio del repositorio):
  bin/gauntlet                 # perfil full: la pasada que cierra una tarea
  bin/gauntlet -p fast         # perfil rapido: lo que exige el pre-commit
  bin/gauntlet -g lint         # una sola puerta (parcial: no cierra nada)

  equivalente sin envoltorio: python3 .claude/loop-engineering/gauntlet.py ...
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

PASS = "PASS"
FAIL = "FAIL"
SKIP = "SKIP"
DISABLED = "DISABLED"
TIMEOUT = "TIMEOUT"

BAD_STATES = (FAIL, TIMEOUT)

GATE_KEYS_REQUIRED = ("id", "title", "command")
GATE_KEYS_OPTIONAL = (
    "when",
    "when_description",
    "blocking",
    "profiles",
    "timeout_seconds",
    "enabled",
    "disabled_reason",
    "notes",
    "fix_hint",
)

HISTORY_LIMIT = 20
STALL_THRESHOLD = 3  # ejecuciones consecutivas fallando en la misma puerta


# --------------------------------------------------------------------------- #
# utilidades
# --------------------------------------------------------------------------- #
def color_enabled(stream) -> bool:
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("GAUNTLET_COLOR") == "always":
        return True
    return hasattr(stream, "isatty") and stream.isatty()


class Paint:
    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled

    def _wrap(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m" if self.enabled else text

    def green(self, t: str) -> str:
        return self._wrap("32", t)

    def red(self, t: str) -> str:
        return self._wrap("31", t)

    def yellow(self, t: str) -> str:
        return self._wrap("33", t)

    def dim(self, t: str) -> str:
        return self._wrap("2", t)

    def bold(self, t: str) -> str:
        return self._wrap("1", t)


def repo_root(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
            cwd=Path(__file__).resolve().parent,
        )
        return Path(out.stdout.strip()).resolve()
    except (subprocess.CalledProcessError, FileNotFoundError):
        # .claude/loop-engineering/gauntlet.py -> 2 niveles hasta la raiz
        return Path(__file__).resolve().parents[2]


def die(message: str) -> None:
    print(f"gauntlet: error de configuracion: {message}", file=sys.stderr)
    raise SystemExit(2)


def load_manifest(path: Path) -> dict:
    if not path.is_file():
        die(f"no existe el manifiesto {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        die(f"{path} no es JSON valido: {exc}")
    if not isinstance(data, dict):
        die(f"{path} debe contener un objeto JSON")
    if data.get("version") != 1:
        die(
            f"version de manifiesto no soportada: {data.get('version')!r} (se espera 1)"
        )
    gates = data.get("gates")
    if not isinstance(gates, list) or not gates:
        die("el manifiesto no declara ninguna puerta en 'gates'")

    seen: set[str] = set()
    for index, gate in enumerate(gates):
        if not isinstance(gate, dict):
            die(f"gates[{index}] no es un objeto")
        for key in GATE_KEYS_REQUIRED:
            if not gate.get(key) or not isinstance(gate[key], str):
                die(f"gates[{index}] necesita la clave de texto '{key}'")
        unknown = set(gate) - set(GATE_KEYS_REQUIRED) - set(GATE_KEYS_OPTIONAL)
        if unknown:
            die(f"gate '{gate['id']}' tiene claves desconocidas: {sorted(unknown)}")
        if gate["id"] in seen:
            die(f"id de puerta duplicado: '{gate['id']}'")
        seen.add(gate["id"])
        profiles = gate.get("profiles", [])
        if not isinstance(profiles, list) or not all(
            isinstance(p, str) for p in profiles
        ):
            die(f"gate '{gate['id']}': 'profiles' debe ser una lista de textos")
    return data


def select_gates(manifest: dict, profile: str, only: list[str]) -> list[dict]:
    gates = manifest["gates"]
    if only:
        by_id = {g["id"]: g for g in gates}
        missing = [gid for gid in only if gid not in by_id]
        if missing:
            die(
                f"puertas inexistentes: {', '.join(missing)}. Disponibles: {', '.join(by_id)}"
            )
        return [by_id[gid] for gid in only]
    selected = [g for g in gates if profile in g.get("profiles", [])]
    if not selected:
        known = sorted({p for g in gates for p in g.get("profiles", [])})
        die(
            f"el perfil '{profile}' no selecciona ninguna puerta. Perfiles: {', '.join(known)}"
        )
    return selected


# --------------------------------------------------------------------------- #
# ejecucion
# --------------------------------------------------------------------------- #
def run_shell(
    command: str, cwd: Path, timeout: int, log_path: Path | None, stream: bool
):
    """Ejecuta `command` con bash. Devuelve (exit_code, timed_out, output)."""
    proc = subprocess.Popen(
        ["bash", "-c", command],
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        start_new_session=True,
    )
    timed_out = threading.Event()

    def kill_tree() -> None:
        timed_out.set()
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass

    watchdog = threading.Timer(timeout, kill_tree)
    watchdog.start()

    chunks: list[str] = []
    handle = log_path.open("w", encoding="utf-8") if log_path else None
    try:
        assert proc.stdout is not None
        for line in proc.stdout:
            chunks.append(line)
            if handle:
                handle.write(line)
            if stream:
                sys.stdout.write(line)
        proc.wait()
    finally:
        watchdog.cancel()
        if handle:
            handle.close()
    return proc.returncode, timed_out.is_set(), "".join(chunks)


def evaluate_when(gate: dict, cwd: Path) -> bool:
    condition = gate.get("when")
    if not condition:
        return True
    code, _, _ = run_shell(condition, cwd, timeout=120, log_path=None, stream=False)
    return code == 0


def tail(text: str, lines: int) -> str:
    rows = text.rstrip("\n").splitlines()
    return "\n".join(rows[-lines:]) if rows else "(sin salida)"


# --------------------------------------------------------------------------- #
# historial
# --------------------------------------------------------------------------- #
def load_history(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def stalled_gates(history: list[dict], failing: list[str]) -> list[str]:
    """Puertas que fallan en las ultimas STALL_THRESHOLD ejecuciones consecutivas."""
    if not failing:
        return []
    recent = history[-(STALL_THRESHOLD - 1) :]
    if len(recent) < STALL_THRESHOLD - 1:
        return []
    stalled = []
    for gid in failing:
        if all(gid in entry.get("failing", []) for entry in recent):
            stalled.append(gid)
    return stalled


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="gauntlet",
        description="Ejecuta el Gauntlet Loop declarado en .claude/gauntlet.json",
    )
    parser.add_argument(
        "-p",
        "--profile",
        default=os.environ.get("GAUNTLET_PROFILE", "full"),
        help="perfil de puertas a ejecutar (por defecto: full)",
    )
    parser.add_argument(
        "-g",
        "--gate",
        action="append",
        default=[],
        metavar="ID",
        help="ejecuta solo esta puerta (repetible); ignora el perfil",
    )
    parser.add_argument("--list", action="store_true", help="lista las puertas y sale")
    parser.add_argument(
        "--json", action="store_true", help="imprime el resumen en JSON"
    )
    parser.add_argument(
        "--stream", action="store_true", help="vuelca la salida de cada puerta en vivo"
    )
    parser.add_argument(
        "--no-bail",
        action="store_true",
        help="sigue ejecutando puertas tras el primer fallo bloqueante",
    )
    parser.add_argument(
        "--tail", type=int, default=40, help="lineas de log a mostrar al fallar"
    )
    parser.add_argument(
        "--manifest",
        default=os.environ.get("GAUNTLET_MANIFEST"),
        help="ruta del manifiesto",
    )
    parser.add_argument(
        "--root", default=os.environ.get("GAUNTLET_ROOT"), help="raiz del repositorio"
    )
    args = parser.parse_args(argv)

    root = repo_root(args.root)
    manifest_path = (
        Path(args.manifest).resolve()
        if args.manifest
        else root / ".claude" / "gauntlet.json"
    )
    manifest = load_manifest(manifest_path)
    defaults = manifest.get("defaults", {})
    default_timeout = int(defaults.get("timeout_seconds", 900))

    paint = Paint(color_enabled(sys.stdout))

    if args.list:
        print(paint.bold(f"Puertas declaradas en {manifest_path.relative_to(root)}:"))
        for gate in manifest["gates"]:
            flags = []
            if not gate.get("enabled", True):
                flags.append("desactivada")
            if not gate.get("blocking", True):
                flags.append("no bloqueante")
            suffix = f" [{', '.join(flags)}]" if flags else ""
            profiles = ",".join(gate.get("profiles", [])) or "-"
            print(
                f"  {gate['id']:<18} perfiles={profiles:<10}{suffix}  {gate['title']}"
            )
            print(paint.dim(f"      $ {gate['command']}"))
        return 0

    gates = select_gates(manifest, args.profile, args.gate)

    work_dir = root / ".claude" / ".gauntlet"
    logs_dir = work_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    history_path = work_dir / "history.json"
    history = load_history(history_path)

    scope = f"puertas {', '.join(args.gate)}" if args.gate else f"perfil {args.profile}"
    print(paint.bold(f"== GAUNTLET LOOP == {scope} == {len(gates)} puertas =="))

    results: list[dict] = []
    bailed = False
    started = time.time()

    for gate in gates:
        gid = gate["id"]
        log_path = logs_dir / f"{gid.replace('/', '_').replace(':', '_')}.log"

        if bailed:
            results.append(
                {
                    "id": gid,
                    "title": gate["title"],
                    "state": SKIP,
                    "reason": "no ejecutada: se aborto tras un fallo bloqueante",
                    "duration": 0.0,
                    "exit_code": None,
                    "blocking": gate.get("blocking", True),
                }
            )
            continue

        if not gate.get("enabled", True):
            reason = gate.get("disabled_reason", "desactivada en el manifiesto")
            print(f"  {paint.yellow(DISABLED):<22} {gid} {paint.dim('- ' + reason)}")
            results.append(
                {
                    "id": gid,
                    "title": gate["title"],
                    "state": DISABLED,
                    "reason": reason,
                    "duration": 0.0,
                    "exit_code": None,
                    "blocking": gate.get("blocking", True),
                }
            )
            continue

        if not evaluate_when(gate, root):
            reason = (
                gate.get("when_description")
                or f"condicion no cumplida: {gate.get('when')}"
            )
            print(f"  {paint.dim(SKIP):<22} {gid} {paint.dim('- ' + reason)}")
            results.append(
                {
                    "id": gid,
                    "title": gate["title"],
                    "state": SKIP,
                    "reason": reason,
                    "duration": 0.0,
                    "exit_code": None,
                    "blocking": gate.get("blocking", True),
                }
            )
            continue

        shown = (
            gate["command"]
            if len(gate["command"]) <= 110
            else gate["command"][:107] + "..."
        )
        print(f"  {paint.dim('RUN'):<22} {gid} {paint.dim('$ ' + shown)}")
        t0 = time.time()
        code, timed_out, output = run_shell(
            gate["command"],
            root,
            int(gate.get("timeout_seconds", default_timeout)),
            log_path,
            args.stream,
        )
        duration = time.time() - t0
        blocking = gate.get("blocking", True)

        if timed_out:
            state = TIMEOUT
        elif code == 0:
            state = PASS
        else:
            state = FAIL

        label = {
            PASS: paint.green(PASS),
            FAIL: paint.red(FAIL),
            TIMEOUT: paint.red(TIMEOUT),
        }[state]
        print(f"  {label:<22} {gid} {paint.dim(f'({duration:.1f}s, exit {code})')}")

        if state in BAD_STATES:
            print(paint.dim(f"      log completo: {log_path.relative_to(root)}"))
            print(tail(output, args.tail))
            if gate.get("fix_hint"):
                print(paint.yellow(f"      pista: {gate['fix_hint']}"))
            if blocking and not args.no_bail:
                bailed = True

        results.append(
            {
                "id": gid,
                "title": gate["title"],
                "state": state,
                "reason": None,
                "duration": round(duration, 2),
                "exit_code": code,
                "blocking": blocking,
                "log": str(log_path.relative_to(root)),
            }
        )

    total = time.time() - started
    failing = [r["id"] for r in results if r["state"] in BAD_STATES and r["blocking"]]
    warnings = [
        r["id"] for r in results if r["state"] in BAD_STATES and not r["blocking"]
    ]
    passed = [r["id"] for r in results if r["state"] == PASS]
    skipped = [r["id"] for r in results if r["state"] in (SKIP, DISABLED)]
    green = not failing

    print()
    print(paint.bold("-- resumen --"))
    for r in results:
        mark = {
            PASS: paint.green("PASS"),
            FAIL: paint.red("FAIL"),
            TIMEOUT: paint.red("TIMEOUT"),
            SKIP: paint.dim("SKIP"),
            DISABLED: paint.yellow("DISABLED"),
        }[r["state"]]
        if r["state"] in BAD_STATES and not r["blocking"]:
            mark = paint.yellow("WARN")
        extra = r["reason"] or f"{r['duration']:.1f}s"
        print(f"  {mark:<22} {r['id']:<18} {paint.dim(extra)}")

    verdict = "VERDE" if green else "ROJO"
    line = (
        f"GAUNTLET: {paint.green(verdict) if green else paint.red(verdict)} -- "
        f"{len(passed)} PASS, {len(failing) + len(warnings)} FAIL, {len(skipped)} SKIP "
        f"en {total:.1f}s ({scope})"
    )
    print()
    print(paint.bold(line))
    if failing:
        print(paint.red(f"  puertas bloqueantes en rojo: {', '.join(failing)}"))
        print(
            "  arregla la causa raiz y repite el gauntlet COMPLETO desde la primera puerta."
        )
    if warnings:
        print(paint.yellow(f"  avisos no bloqueantes: {', '.join(warnings)}"))
    if args.gate and green:
        print(
            paint.yellow(
                "  aviso: ejecucion parcial (-g). No cuenta como pasada limpia."
            )
        )

    stalled = stalled_gates(history, failing)
    if stalled:
        print(
            paint.red(
                f"  ESCALADO: {', '.join(stalled)} falla en {STALL_THRESHOLD} ejecuciones seguidas. "
                "Para el loop y consulta al usuario (ver SKILL.md, seccion Escalado)."
            )
        )

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": scope,
        "profile": None if args.gate else args.profile,
        "partial": bool(args.gate),
        "verdict": verdict,
        "failing": failing + warnings,
        "passed": passed,
        "skipped": skipped,
        "duration_seconds": round(total, 2),
    }
    history.append(entry)
    history_path.write_text(
        json.dumps(history[-HISTORY_LIMIT:], indent=2) + "\n", encoding="utf-8"
    )
    summary = dict(entry, gates=results)
    (work_dir / "last-run.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )

    if args.json:
        print(json.dumps(summary, indent=2))

    return 0 if green else 1


if __name__ == "__main__":
    # `gauntlet.py --list | head` no debe morir con BrokenPipeError: dejamos que SIGPIPE
    # tenga su comportamiento por defecto cuando la plataforma lo soporta.
    if hasattr(signal, "SIGPIPE"):
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    try:
        raise SystemExit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print("\ngauntlet: interrumpido", file=sys.stderr)
        raise SystemExit(130)
    except BrokenPipeError:
        os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        raise SystemExit(0)
