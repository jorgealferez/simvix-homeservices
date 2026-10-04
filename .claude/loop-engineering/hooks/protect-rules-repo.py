#!/usr/bin/env python3
"""PreToolUse hook (loop-engineering): el repositorio de reglas es de solo lectura.

Se instala en cada repositorio DESTINO (matcher `Edit|Write|MultiEdit|NotebookEdit|Bash`). Reconoce
un repositorio de reglas por el marcador `.loop-engineering-root` en su raiz y, ante una escritura en
el, devuelve `permissionDecision: ask` ("aprobar solo si has pedido cambiar las reglas"): la unica
excepcion, la peticion explicita del usuario, pasa asi por el sistema de permisos, que el agente no
puede contestar. Si nadie podria contestar (`permission_mode` bypassPermissions o dontAsk) deniega.

Tambien pide confirmacion para escribir en la propia maquinaria del destino (`.claude/settings*.json`,
`.claude/loop-engineering/`, `.githooks/`): un agente no modifica su propia configuracion de hooks.

Excepcion estructural de mantenimiento: si `CLAUDE_PROJECT_DIR` es un repositorio de reglas (la
persona lo abrio como repositorio principal), el hook no debe estar registrado; si lo esta, permite.
Anulacion documentada, solo para ejecuciones sin persona: LOOP_RULES_MAINTENANCE=1.

Payload malformado: permite y lo dice (fail-open registrado), porque un hook roto no debe paralizar
la sesion.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

MARKER = ".loop-engineering-root"
SCOPE_KEY = "alcance"
WRITE_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")
PROTECTED_TARGET_PATHS = (
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".claude/loop-engineering/",
    ".githooks/",
)
MUTATORS = re.compile(
    r"(^|[\s;&|(])(rm|mv|cp|touch|chmod|chown|ln|truncate|tee|install|rsync|dd|mkdir|rmdir|unlink|shred)\b"
    r"|(^|[\s;&|(])sed\s+(-[a-zA-Z]*i|--in-place)"
    r"|(^|[\s;&|(])python3?\s+-c\b"
    r"|(^|[\s;&|(])git(\s+-C\s+\S+)?\s+(add|commit|push|checkout|switch|reset|rebase|stash|rm|mv|apply|am|cherry-pick|merge|restore|clean|tag|branch\s+-[dDm])\b"
    r"|(^|[^<>])>{1,2}(?!&)"
)
ALLOWED_EXECUTABLES = (
    "bin/loop-init",
    "bin/loop-doctor",
    "bin/gauntlet",
    "tools/loop_init.py",
    ".claude/loop-engineering/gauntlet.py",
    ".claude/loop-engineering/checks/",
)
READ_ONLY_PREFIX = re.compile(
    r"^\s*(cat|ls|head|tail|less|more|wc|grep|rg|find|diff|stat|file|tree|md5sum|sha256sum|"
    r"git\s+(status|log|diff|show|rev-parse|ls-files|grep|blame|branch|remote|config\s+--get)|"
    r"python3?\s+-m\s+(json\.tool|unittest|compileall|py_compile))\b"
)


def declared_scope(project_dir: Path | None) -> set[str]:
    """Nombres de repositorio que la carta del repositorio de trabajo declara dentro del alcance.

    Cabecera `alcance: repo-a, repo-b` en OBJETIVO.<repo>.md. Sin ella el alcance es el propio
    repositorio: los demas repositorios adjuntos a la sesion son de lectura mientras nadie los nombre.
    """
    if project_dir is None:
        return set()
    scope = {project_dir.name}
    try:
        for charter in project_dir.glob("OBJETIVO.*.md"):
            partes = charter.name.split(".")
            if len(partes) >= 3:
                scope.add(".".join(partes[1:-1]))
            for line in charter.read_text(encoding="utf-8").splitlines():
                if line.startswith("## "):
                    break
                if line.lower().startswith(SCOPE_KEY + ":"):
                    scope |= {
                        x.strip() for x in line.split(":", 1)[1].split(",") if x.strip()
                    }
    except OSError:
        pass
    return scope


def git_root(path: Path) -> Path | None:
    """Raiz del repositorio git que contiene `path`, sin ejecutar git."""
    try:
        cur = path.resolve()
    except OSError:
        cur = path
    for candidate in (cur, *cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return None


def find_marker_root(path: Path) -> Path | None:
    try:
        cur = path.resolve()
    except OSError:
        cur = path
    for candidate in (cur, *cur.parents):
        if (candidate / MARKER).exists():
            return candidate
    return None


def discover_rules_roots(project_dir: Path | None, env: dict) -> list[Path]:
    roots: list[Path] = []
    for raw in filter(None, env.get("LOOP_RULES_DIRS", "").split(os.pathsep)):
        p = Path(raw)
        if (p / MARKER).exists():
            roots.append(p.resolve())
    if project_dir is not None:
        meta = project_dir / ".claude" / "loop-engineering.json"
        try:
            src = json.loads(meta.read_text(encoding="utf-8")).get("source_path")
            if src and (Path(src) / MARKER).exists():
                roots.append(Path(src).resolve())
        except (OSError, json.JSONDecodeError, AttributeError):
            pass
        try:
            for sib in project_dir.resolve().parent.iterdir():
                if sib.is_dir() and (sib / MARKER).exists():
                    roots.append(sib.resolve())
        except OSError:
            pass
    unique: list[Path] = []
    for r in roots:
        if r not in unique:
            unique.append(r)
    return unique


def command_mentions(command: str, root: Path, cwd: Path | None) -> bool:
    text = command
    if str(root) in text:
        return True
    name = root.name
    if re.search(rf"(^|[\s'\"=:/])\.{{0,2}}/?{re.escape(name)}(/|\b)", text):
        # nombre del repo como segmento de ruta relativa, p. ej. ../reglas/CLAUDE.md
        return True
    if cwd is not None:
        try:
            if cwd.resolve() == root or root in cwd.resolve().parents:
                return True
        except OSError:
            pass
    return False


def is_mutation(command: str) -> bool:
    if READ_ONLY_PREFIX.match(command) and not MUTATORS.search(
        command.split("|", 1)[-1] if "|" in command else ""
    ):
        # comando de lectura sin redireccion ni segunda etapa mutadora
        return bool(re.search(r"(^|[^<>])>{1,2}(?!&)", command))
    return bool(MUTATORS.search(command))


def uses_allowed_executable(command: str) -> bool:
    return any(tok in command for tok in ALLOWED_EXECUTABLES) and not re.search(
        r"(^|[^<>])>{1,2}(?!&)", command
    )


def decide(
    payload: dict, env: dict, rules_roots: list[Path] | None = None
) -> tuple[str, str]:
    """Devuelve ('allow'|'ask'|'deny', motivo)."""
    if env.get("LOOP_RULES_MAINTENANCE") == "1":
        return "allow", "LOOP_RULES_MAINTENANCE=1 (anulacion documentada)"
    project_raw = env.get("CLAUDE_PROJECT_DIR")
    project_dir = (
        Path(project_raw).resolve()
        if project_raw and Path(project_raw).is_dir()
        else None
    )
    if project_dir is not None and (project_dir / MARKER).exists():
        return (
            "allow",
            "sesion de mantenimiento: el repositorio principal es el de reglas",
        )
    tool = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}
    mode = payload.get("permission_mode", "")
    verdict = "deny" if mode in ("bypassPermissions", "dontAsk") else "ask"
    roots = (
        rules_roots
        if rules_roots is not None
        else discover_rules_roots(project_dir, env)
    )

    if tool in WRITE_TOOLS:
        raw = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
        if not raw:
            return "allow", "sin ruta"
        target = Path(raw)
        if not target.is_absolute() and project_dir is not None:
            target = project_dir / target
        hit = find_marker_root(target)
        if hit is not None:
            return verdict, (
                f"Escritura en el repositorio de reglas ({hit.name}), que es de solo lectura. "
                "Aprobar solo si el usuario ha pedido explicitamente cambiar las reglas."
            )
        if project_dir is not None:
            try:
                rel = target.resolve().relative_to(project_dir).as_posix()
            except (ValueError, OSError):
                rel = ""
            if rel and any(
                rel == p.rstrip("/") or rel.startswith(p)
                for p in PROTECTED_TARGET_PATHS
            ):
                return verdict, (
                    f"Escritura en la maquinaria del loop del repositorio ({rel}). Un agente no modifica su "
                    "propia configuracion de hooks; solo con peticion explicita del usuario."
                )
            # Alcance multi-destino: otro repositorio git de la sesion que la carta no nombra.
            other = git_root(target)
            if (
                other is not None
                and other != project_dir
                and other.name not in declared_scope(project_dir)
            ):
                return verdict, (
                    f"Escritura en otro repositorio de la sesion ({other.name}), que la carta de "
                    f"{project_dir.name} no declara en su alcance. El repositorio de trabajo es "
                    f"{project_dir.name}; los demas son de lectura mientras nadie los nombre. Para "
                    f"incluirlo, anade `{SCOPE_KEY}: {other.name}` a la cabecera de la carta."
                )
        return "allow", "ruta fuera del repositorio de reglas"

    if tool == "Bash":
        command = tool_input.get("command") or ""
        cwd_raw = payload.get("cwd")
        cwd = Path(cwd_raw) if cwd_raw else None
        if not command.strip():
            return "allow", "comando vacio"
        for root in roots:
            if (
                command_mentions(command, root, None)
                and is_mutation(command)
                and not uses_allowed_executable(command)
            ):
                return verdict, (
                    f"El comando menciona el repositorio de reglas ({root.name}) junto a un verbo que escribe. "
                    "Ese repositorio es de solo lectura; aprobar solo si el usuario ha pedido cambiar las reglas."
                )
            if (
                cwd is not None
                and command_mentions("", root, cwd)
                and is_mutation(command)
                and not uses_allowed_executable(command)
            ):
                return verdict, (
                    f"Comando con efectos de escritura ejecutado dentro del repositorio de reglas ({root.name}). "
                    "Aprobar solo si el usuario ha pedido cambiar las reglas."
                )
        if project_dir is not None and is_mutation(command):
            for p in PROTECTED_TARGET_PATHS:
                if p in command:
                    return verdict, (
                        f"El comando escribe en la maquinaria del loop ({p}). Un agente no modifica su propia "
                        "configuracion de hooks; solo con peticion explicita del usuario."
                    )
        return "allow", "comando sin escritura en el repositorio de reglas"
    return "allow", "herramienta no vigilada"


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise ValueError("payload no es un objeto")
    except (json.JSONDecodeError, ValueError) as exc:
        print(
            f"[protect-rules-repo] AVISO: payload ilegible ({exc}); se permite la accion.",
            file=sys.stderr,
        )
        return 0
    decision, reason = decide(payload, dict(os.environ))
    if decision == "allow":
        return 0
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": decision,
                    "permissionDecisionReason": reason,
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
