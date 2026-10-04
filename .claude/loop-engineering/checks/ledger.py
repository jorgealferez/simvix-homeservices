#!/usr/bin/env python3
"""Puerta `ledger` y parser compartido del ledger y la carta de meta (loop-engineering).

Cada repositorio tiene UN ledger y UNA carta, nombrados con el nombre del repositorio:

    PENDIENTES.<repo>.md   ledger de continuidad (que se hace a continuacion)
    OBJETIVO.<repo>.md     carta de meta (de donde se parte y a donde se llega)

`<repo>` sale de `.claude/loop-engineering.json` (`repo_name`, lo graba loop-init) o, si falta, del
remoto `origin` (`owner/repo` -> `repo`) o del nombre del directorio raiz. Nadie mas debe cablear
esos nombres: hooks, comandos y puertas pasan por `ledger_path()` y `charter_path()`.

Como puerta (sin argumentos): exit 0 si la estructura es valida, exit 1 si no. FALLA solo por
estructura o por falsear la meta; AVISA (sin fallar) por cola vacia, `sin-encuadrar` o pausa. La
cola vacia con la meta sin alcanzar la bloquea el hook Stop de continuidad, no esta puerta: si
fallase aqui, el pre-commit impediria commitear el ultimo `[x]` de una fase.

Otros usos:
    ledger.py --brief         resumen de una linea por fichero (lo usan los hooks de sesion)
    ledger.py --paths         imprime repo_name, ledger y carta resueltos
    ledger.py --json          estado completo en JSON
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

LEDGER_PREFIX = "PENDIENTES"
CHARTER_PREFIX = "OBJETIVO"
LEDGER_SECTIONS = ("Activo", "Esperando", "Bloqueado", "Hecho")
CHARTER_SECTIONS = (
    "Inicio",
    "Meta",
    "Criterios de salida",
    "Fases",
    "Calidad y proyeccion",
    "Decisiones del usuario",
)
ESTADOS = ("sin-encuadrar", "en-curso", "alcanzado", "pausado")
PLACEHOLDER = "pendiente de encuadre"

ITEM_RE = re.compile(r"^(\s*)- \[( |x|X)\] (.*)$")
SECTION_RE = re.compile(r"^## (.+?)\s*$")
HEADER_RE = re.compile(r"^([a-z][a-z_-]*):\s*(.+?)\s*$")
RESERVED_RE = re.compile(r"EN CURSO \(")
REF_RE = re.compile(r"(#\d+|\b[0-9a-f]{7,40}\b)")
BLOCKED_TOKEN = "BLOQUEADO:"
OUT_OF_SCOPE = "FUERA DE ALCANCE"


# --------------------------------------------------------------------------- #
# rutas
# --------------------------------------------------------------------------- #
def install_paths(root: Path) -> set[str]:
    """Rutas que planto la propia instalacion del loop, relativas a la raiz.

    Sirve para distinguir "el repositorio tiene trabajo sin verificar" de "acabas de instalar el
    sistema y todavia no has commiteado la instalacion". Medido: tras `loop-init`, el primer turno en
    un repositorio se encontraba un arbol sucio que el agente no habia tocado y un guard exigiendole
    verificarlo.
    """
    paths: set[str] = set()
    meta = root / ".claude" / "loop-engineering.json"
    if meta.is_file():
        try:
            paths |= set(
                (json.loads(meta.read_text(encoding="utf-8")).get("files") or {}).keys()
            )
        except (OSError, json.JSONDecodeError):
            pass
        paths.add(".claude/loop-engineering.json")
    name = repo_name(root)
    paths |= {
        ".claude/gauntlet.json",
        ".claude/settings.json",
        ".gitignore",
        "CLAUDE.md",
        f"{LEDGER_PREFIX}.{name}.md",
        f"{CHARTER_PREFIX}.{name}.md",
        "docs/adr/0000-plantilla.md",
        "docs/benchmarks/plantilla.json",
        "docs/benchmarks/presupuesto.json",
        ".github/workflows/gauntlet.yml",
    }
    for extra in (root / ".claude" / "skills").glob("*/**/*"):
        if extra.is_file():
            paths.add(extra.relative_to(root).as_posix())
    for extra in (root / ".claude" / "commands").glob("*.md"):
        paths.add(extra.relative_to(root).as_posix())
    return paths


def only_install_pending(root: Path, changed: list[str]) -> bool:
    """True si todo lo que hay sin commitear lo planto la instalacion, no el trabajo del agente."""
    if not changed:
        return False
    return set(changed) <= install_paths(root)


def yields_to_repo_copy(script: Path) -> bool:
    """True si este script es la copia del plugin y el repositorio de trabajo tiene la suya registrada.

    Los hooks de un plugin y los de `.claude/settings.json` se ejecutan **los dos**: Claude Code no
    deduplica. Para un guard con cota por progreso eso significaria contar dos bloqueos por turno y
    escalar a la mitad de turnos. Cuando el repositorio registra su propia copia del mismo hook, manda
    la suya (que ademas puede ser de otra version) y la del plugin cede.
    """
    root = repo_root()
    settings = root / ".claude" / "settings.json"
    if not settings.is_file():
        return False
    try:
        data = json.loads(settings.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    me = script.resolve()
    for entries in (data.get("hooks") or {}).values():
        for entry in entries:
            for hook in entry.get("hooks") or []:
                command = (hook.get("command") or "").strip()
                if not command.endswith(me.name):
                    continue
                path = command.split()[0] if command else ""
                path = path.replace("$CLAUDE_PROJECT_DIR/", "").replace(
                    "${CLAUDE_PROJECT_DIR}/", ""
                )
                registered = (
                    (root / path).resolve()
                    if not Path(path).is_absolute()
                    else Path(path).resolve()
                )
                if registered != me and registered.is_file():
                    return True
    return False


def repo_root(explicit: str | None = None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and Path(env).is_dir():
        return Path(env).resolve()
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    if out.returncode == 0 and out.stdout.strip():
        return Path(out.stdout.strip()).resolve()
    return Path.cwd().resolve()


def repo_name(root: Path) -> str:
    meta = root / ".claude" / "loop-engineering.json"
    if meta.is_file():
        try:
            name = json.loads(meta.read_text(encoding="utf-8")).get("repo_name")
            if isinstance(name, str) and name.strip():
                return name.strip()
        except (json.JSONDecodeError, OSError):
            pass
    out = subprocess.run(
        ["git", "-C", str(root), "config", "--get", "remote.origin.url"],
        capture_output=True,
        text=True,
    )
    url = out.stdout.strip() if out.returncode == 0 else ""
    if url:
        tail = url.rstrip("/").split("/")[-1].split(":")[-1]
        if tail.endswith(".git"):
            tail = tail[:-4]
        if tail:
            return tail
    return root.resolve().name


def ledger_path(root: Path, name: str | None = None) -> Path:
    return root / f"{LEDGER_PREFIX}.{name or repo_name(root)}.md"


def charter_path(root: Path, name: str | None = None) -> Path:
    return root / f"{CHARTER_PREFIX}.{name or repo_name(root)}.md"


def legacy_ledger_path(root: Path) -> Path:
    return root / f"{LEDGER_PREFIX}.md"


def legacy_charter_path(root: Path) -> Path:
    return root / f"{CHARTER_PREFIX}.md"


# --------------------------------------------------------------------------- #
# parsers
# --------------------------------------------------------------------------- #
def _parse_sections(text: str) -> dict:
    """Devuelve {'header': {clave: valor}, 'sections': {nombre: [(done, texto, indent)]},
    'section_text': {nombre: texto completo}}. Los nombres de seccion van en minusculas."""
    header: dict[str, str] = {}
    sections: dict[str, list[tuple[bool, str, int]]] = {}
    section_text: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        m = SECTION_RE.match(line)
        if m:
            current = m.group(1).strip().lower()
            sections.setdefault(current, [])
            section_text.setdefault(current, [])
            continue
        if current is None:
            h = HEADER_RE.match(line)
            if h:
                header[h.group(1)] = h.group(2)
            continue
        section_text[current].append(line)
        m = ITEM_RE.match(line)
        if m:
            sections[current].append(
                (m.group(2).lower() == "x", m.group(3).strip(), len(m.group(1)))
            )
    return {
        "header": header,
        "sections": sections,
        "section_text": {k: "\n".join(v) for k, v in section_text.items()},
    }


def parse_ledger(text: str) -> dict:
    data = _parse_sections(text)
    value = data["header"].get("continuidad", "")
    data["paused"] = value.strip().lower() == "pausada"
    data["continuidad"] = value.strip().lower() or None
    return data


def normalize_estado(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip().lower().replace(" ", "-")


def parse_charter(text: str) -> dict:
    data = _parse_sections(text)
    data["estado"] = normalize_estado(data["header"].get("estado"))
    return data


def top_level(
    items: list[tuple[bool, str, int]], done: bool | None = None
) -> list[str]:
    """Items de primer nivel (sin sangria); `done` filtra por estado del checkbox."""
    out = []
    for is_done, text, indent in items:
        if indent:
            continue
        if done is None or is_done == done:
            out.append(text)
    return out


def is_reserved(item_text: str) -> bool:
    return bool(RESERVED_RE.search(item_text))


def pending_fases(charter: dict) -> list[str]:
    return top_level(charter["sections"].get("fases", []), done=False)


def pending_criterios(charter: dict) -> list[str]:
    return [
        t
        for t in top_level(
            charter["sections"].get("criterios de salida", []), done=False
        )
        if OUT_OF_SCOPE not in t
    ]


def sha1_text(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------- #
# estado agregado
# --------------------------------------------------------------------------- #
def load_state(root: Path) -> dict:
    """Estado conjunto de ledger y carta, para hooks y comandos."""
    name = repo_name(root)
    lpath, cpath = ledger_path(root, name), charter_path(root, name)
    state: dict = {
        "repo_name": name,
        "ledger_path": str(lpath),
        "charter_path": str(cpath),
        "ledger_exists": lpath.is_file(),
        "charter_exists": cpath.is_file(),
        "legacy_ledger": legacy_ledger_path(root).is_file(),
        "legacy_charter": legacy_charter_path(root).is_file(),
    }
    if state["ledger_exists"]:
        ledger = parse_ledger(lpath.read_text(encoding="utf-8"))
        secs = ledger["sections"]
        activos_all = top_level(secs.get("activo", []), done=False)
        state.update(
            paused=ledger["paused"],
            activos=activos_all,
            activos_sin_reservar=[t for t in activos_all if not is_reserved(t)],
            esperando=top_level(secs.get("esperando", []), done=False),
            bloqueados=top_level(secs.get("bloqueado", []), done=False),
            hechos=top_level(secs.get("hecho", []), done=True),
            activo_text=ledger["section_text"].get("activo", ""),
        )
    else:
        state.update(
            paused=False,
            activos=[],
            activos_sin_reservar=[],
            esperando=[],
            bloqueados=[],
            hechos=[],
            activo_text="",
        )
    if state["charter_exists"]:
        text = cpath.read_text(encoding="utf-8")
        charter = parse_charter(text)
        state.update(
            estado=charter["estado"],
            fases_pendientes=pending_fases(charter),
            criterios_pendientes=pending_criterios(charter),
            charter_sha1=sha1_text(text),
        )
    else:
        state.update(
            estado=None, fases_pendientes=[], criterios_pendientes=[], charter_sha1=""
        )
    state["meta_alcanzada"] = state["estado"] == "alcanzado"
    return state


def brief(state: dict) -> list[str]:
    """Resumen corto para inyectar en el contexto de la sesion."""
    ln = Path(state["ledger_path"]).name
    cn = Path(state["charter_path"]).name
    lines = []
    if not state["ledger_exists"]:
        lines.append(
            f"[continuidad] FALTA {ln}: la puerta `ledger` estara en rojo. Instala el sistema (loop-init)."
        )
    elif state["paused"]:
        lines.append(
            f"[continuidad] {ln}: PAUSADA por una persona. No se exige avanzar."
        )
    else:
        act = state["activos_sin_reservar"]
        reservados = len(state["activos"]) - len(act)
        extra = f" ({reservados} reservado(s) por otra sesion)" if reservados else ""
        if act:
            lines.append(
                f"[continuidad] {ln}: {len(act)} item(s) activos{extra}. Siguiente: {act[0]}"
            )
            lines.append(
                "  Responde lo que se pida y SIGUE con ese item. No preguntes si sigues: el hook Stop no cierra con trabajo activo."
            )
        else:
            lines.append(
                f"[continuidad] {ln}: sin items activos{extra}. Esperando: {len(state['esperando'])}, bloqueados: {len(state['bloqueados'])}."
            )
    if not state["charter_exists"]:
        lines.append(
            f"[objetivo] FALTA {cn}: sin carta de meta no hay a donde llegar. Instala el sistema (loop-init) y haz el encuadre."
        )
    else:
        estado = state["estado"] or "?"
        if estado == "sin-encuadrar":
            lines.append(
                f"[objetivo] {cn}: estado sin-encuadrar. PRIMERA TAREA: el encuadre (Inicio real, Meta, Criterios medibles, Fases) y sembrar ## Activo."
            )
        elif estado == "alcanzado":
            lines.append(
                f"[objetivo] {cn}: META ALCANZADA. Solo entran items nuevos pedidos por el usuario."
            )
        elif estado == "pausado":
            lines.append(f"[objetivo] {cn}: pausado por una persona.")
        else:
            nf = state["fases_pendientes"]
            nxt = (
                f" Siguiente fase sin marcar: {nf[0]}"
                if nf
                else " Todas las fases marcadas: mide los criterios y cierra la meta."
            )
            lines.append(
                f"[objetivo] {cn}: en-curso, {len(nf)} fase(s) y {len(state['criterios_pendientes'])} criterio(s) pendientes.{nxt}"
            )
    return lines


# --------------------------------------------------------------------------- #
# puerta
# --------------------------------------------------------------------------- #
def check(root: Path) -> tuple[list[str], list[str]]:
    """Devuelve (fallos, avisos)."""
    fails: list[str] = []
    warns: list[str] = []
    name = repo_name(root)
    lpath, cpath = ledger_path(root, name), charter_path(root, name)
    legacy_l, legacy_c = legacy_ledger_path(root), legacy_charter_path(root)

    # ledger
    if not lpath.is_file():
        hint = (
            f" (existe {legacy_l.name} sin nombre de repo: migralo con loop-init)"
            if legacy_l.is_file()
            else ""
        )
        fails.append(f"falta el ledger {lpath.name}{hint}")
    else:
        if legacy_l.is_file():
            fails.append(
                f"coexisten {lpath.name} y {legacy_l.name}: un solo ledger por repositorio, nombrado por repositorio. Retira el legado en un commit aparte"
            )
        ledger = parse_ledger(lpath.read_text(encoding="utf-8"))
        if ledger["continuidad"] not in ("activa", "pausada"):
            fails.append(
                f"{lpath.name}: la cabecera debe declarar `continuidad: activa` o `continuidad: pausada`"
            )
        for section in LEDGER_SECTIONS:
            if section.lower() not in ledger["sections"]:
                fails.append(f"{lpath.name}: falta la seccion '## {section}'")
        for text in top_level(ledger["sections"].get("bloqueado", []), done=False):
            if BLOCKED_TOKEN not in text:
                fails.append(
                    f"{lpath.name}: item de ## Bloqueado sin `{BLOCKED_TOKEN} <motivo>`: {text[:80]}"
                )
        if ledger["paused"]:
            warns.append(
                f"{lpath.name} declara `continuidad: pausada`: solo una persona puede escribirlo; mientras dure, los agentes pueden cerrar el turno con trabajo activo"
            )
        reserved = [
            t
            for t in top_level(ledger["sections"].get("activo", []), done=False)
            if is_reserved(t)
        ]
        if reserved:
            warns.append(
                f"{lpath.name}: {len(reserved)} item(s) reservados con EN CURSO (otra sesion los tiene); una reserva caduca si su rama remota no se mueve en 24 h"
            )

    # carta
    if not cpath.is_file():
        hint = (
            f" (existe {legacy_c.name} sin nombre de repo: migralo con loop-init)"
            if legacy_c.is_file()
            else ""
        )
        fails.append(f"falta la carta de meta {cpath.name}{hint}")
    else:
        if legacy_c.is_file():
            fails.append(
                f"coexisten {cpath.name} y {legacy_c.name}: una sola carta por repositorio, nombrada por repositorio"
            )
        text = cpath.read_text(encoding="utf-8")
        charter = parse_charter(text)
        estado = charter["estado"]
        if estado not in ESTADOS:
            fails.append(
                f"{cpath.name}: `estado:` debe ser uno de {', '.join(ESTADOS)} (ahora: {estado!r})"
            )
        for section in CHARTER_SECTIONS:
            if section.lower() not in charter["sections"]:
                fails.append(f"{cpath.name}: falta la seccion '## {section}'")
        fases_pend = pending_fases(charter)
        crit_pend = pending_criterios(charter)
        if estado == "sin-encuadrar":
            warns.append(
                f"{cpath.name}: estado sin-encuadrar. El encuadre es la primera tarea: nada se da por planificado hasta que la carta tenga Inicio, Meta, Criterios medibles y Fases"
            )
        else:
            if PLACEHOLDER in text.lower():
                fails.append(
                    f"{cpath.name}: quedan marcas '{PLACEHOLDER}' con estado {estado}: el encuadre no esta terminado"
                )
            for crit in top_level(charter["sections"].get("criterios de salida", [])):
                if OUT_OF_SCOPE in crit:
                    continue
                if "medida:" not in crit.lower():
                    fails.append(
                        f"{cpath.name}: criterio sin `medida:` (un criterio que no se mide no es un criterio): {crit[:80]}"
                    )
            for fase in top_level(charter["sections"].get("fases", []), done=True):
                if not REF_RE.search(fase):
                    fails.append(
                        f"{cpath.name}: fase marcada [x] sin referencia (PR #N o commit): {fase[:80]}"
                    )
        if estado == "alcanzado" and (fases_pend or crit_pend):
            fails.append(
                f"{cpath.name}: estado alcanzado con {len(fases_pend)} fase(s) y {len(crit_pend)} criterio(s) sin marcar: "
                "una meta no se declara alcanzada, se mide"
            )
        if estado == "en-curso" and lpath.is_file():
            st = load_state(root)
            if (
                not st["activos"]
                and not st["esperando"]
                and not st["bloqueados"]
                and (fases_pend or crit_pend)
            ):
                warns.append(
                    f"{lpath.name} sin items y {cpath.name} en-curso: la cola esta vacia con la meta sin alcanzar. "
                    "El hook Stop exigira planificar la siguiente fase"
                )
    return fails, warns


def main(argv: list[str]) -> int:
    root = repo_root(os.environ.get("GAUNTLET_ROOT"))
    if "--paths" in argv:
        name = repo_name(root)
        print(f"repo_name={name}")
        print(f"ledger={ledger_path(root, name)}")
        print(f"charter={charter_path(root, name)}")
        return 0
    if "--brief" in argv:
        for line in brief(load_state(root)):
            print(line)
        return 0
    if "--json" in argv:
        print(json.dumps(load_state(root), indent=2, ensure_ascii=False))
        return 0
    fails, warns = check(root)
    for w in warns:
        print(f"[ledger] AVISO: {w}")
    for f in fails:
        print(f"[ledger] {f}")
    if fails:
        print(
            f"\n[ledger] {len(fails)} problema(s): el ledger o la carta de meta no son fiables."
        )
        return 1
    name = repo_name(root)
    print(
        f"[ledger] OK: {LEDGER_PREFIX}.{name}.md y {CHARTER_PREFIX}.{name}.md con estructura valida."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
