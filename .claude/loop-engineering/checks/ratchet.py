#!/usr/bin/env python3
"""Puerta `ratchet` (loop-engineering): los numeros medidos son suelos, no anecdotas.

Lee `docs/benchmarks/presupuesto.json` y todos los `docs/benchmarks/fase_*.json` y falla si:

  1. una fase publica una medida cuyo `id` no existe en el presupuesto (estaria fuera del ratchet);
  2. una medida incumple el objetivo de su metrica (`direccion: max` -> valor <= objetivo;
     `direccion: min` -> valor >= objetivo);
  3. una medida empeora respecto al ultimo valor publicado de la misma metrica en una fase anterior
     (orden: campo `fecha`, luego nombre de fichero).

Valores de texto `NO VERIFICADO` o `FUERA DE ALCANCE ...` se aceptan y se declaran, pero no cuentan.
Sin presupuesto.json con fases publicadas -> fallo: no se publica lo que no se puede contrastar.

Esquema minimo:
  presupuesto.json  {"version": 1, "metricas": [{"id","descripcion","unidad","direccion":"max|min","objetivo"}]}
  fase_N.json       {"fase": N, "titulo", "fecha": "AAAA-MM-DD", "medidas": {"id": numero|texto}}
"""

from __future__ import annotations

import glob
import json
import os
import sys
from pathlib import Path

DECLARED_TEXT = ("NO VERIFICADO", "FUERA DE ALCANCE")


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return exc


def check(bench_dir: Path) -> tuple[list[str], list[str]]:
    fails: list[str] = []
    warns: list[str] = []
    fase_files = sorted(Path(p) for p in glob.glob(str(bench_dir / "fase_*.json")))
    if not fase_files:
        return fails, [f"sin ficheros fase_*.json en {bench_dir}: nada que contrastar"]
    budget_path = bench_dir / "presupuesto.json"
    if not budget_path.is_file():
        return [
            f"hay {len(fase_files)} fase(s) publicadas pero falta {budget_path}: sin presupuesto no hay ratchet"
        ], warns
    budget = load(budget_path)
    if isinstance(budget, Exception):
        return [f"{budget_path.name} ilegible: {budget}"], warns
    metrics = {}
    for m in budget.get("metricas", []) if isinstance(budget, dict) else []:
        if not isinstance(m, dict) or "id" not in m:
            fails.append(f"{budget_path.name}: metrica sin id: {m!r}")
            continue
        if m.get("direccion") not in ("max", "min"):
            fails.append(
                f"{budget_path.name}: metrica '{m['id']}' sin `direccion` max|min"
            )
            continue
        metrics[m["id"]] = m

    loaded = []
    for f in fase_files:
        data = load(f)
        if isinstance(data, Exception):
            fails.append(f"{f.name} ilegible: {data}")
            continue
        if not isinstance(data, dict):
            fails.append(f"{f.name}: debe contener un objeto JSON")
            continue
        loaded.append((str(data.get("fecha", "")), f.name, data))
    loaded.sort(key=lambda t: (t[0], t[1]))

    last: dict[str, tuple[float, str]] = {}
    for _, fname, data in loaded:
        medidas = data.get("medidas", {})
        if not isinstance(medidas, dict):
            fails.append(f"{fname}: `medidas` debe ser un objeto id -> valor")
            continue
        for mid, value in medidas.items():
            if mid not in metrics:
                fails.append(
                    f"{fname}: medida '{mid}' no existe en {budget_path.name}: publicarla la deja fuera del ratchet"
                )
                continue
            if isinstance(value, str):
                if value.upper().startswith(DECLARED_TEXT):
                    warns.append(f"{fname}: '{mid}' declarada como {value}")
                    continue
                fails.append(
                    f"{fname}: '{mid}' tiene un valor de texto que no es NO VERIFICADO ni FUERA DE ALCANCE: {value!r}"
                )
                continue
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                fails.append(
                    f"{fname}: '{mid}' debe ser un numero medido, no {value!r}"
                )
                continue
            m = metrics[mid]
            objetivo = m.get("objetivo")
            better_is_low = m["direccion"] == "max"
            if isinstance(objetivo, (int, float)) and not isinstance(objetivo, bool):
                if (better_is_low and value > objetivo) or (
                    not better_is_low and value < objetivo
                ):
                    fails.append(
                        f"{fname}: '{mid}' = {value} incumple el objetivo ({m['direccion']} {objetivo} {m.get('unidad', '')})"
                    )
            if mid in last:
                prev, prev_file = last[mid]
                if (better_is_low and value > prev) or (
                    not better_is_low and value < prev
                ):
                    fails.append(
                        f"{fname}: '{mid}' = {value} empeora el ultimo valor publicado ({prev} en {prev_file}): el ratchet no retrocede"
                    )
            last[mid] = (float(value), fname)
    return fails, warns


def main() -> int:
    root = Path(
        os.environ.get("GAUNTLET_ROOT") or os.environ.get("CLAUDE_PROJECT_DIR") or "."
    ).resolve()
    bench_dir = root / "docs" / "benchmarks"
    fails, warns = check(bench_dir)
    for w in warns:
        print(f"[ratchet] AVISO: {w}")
    for f in fails:
        print(f"[ratchet] {f}")
    if fails:
        print(
            f"\n[ratchet] {len(fails)} problema(s): una medida publicada no puede empeorar ni salirse del presupuesto."
        )
        return 1
    print(
        "[ratchet] OK: todas las medidas publicadas existen en el presupuesto, cumplen su objetivo y no retroceden."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
