#!/usr/bin/env bash
# Puerta `hygiene` del Gauntlet Loop (loop-engineering).
#
# Comprueba invariantes del repositorio que no dependen de ningun toolchain, asi
# que esta puerta esta activa desde el primer commit de cualquier proyecto.
#
# Falla (exit 1) si encuentra:
#   1. marcadores de conflicto de merge en archivos versionados
#   2. restos de merge versionados (*.orig, *.rej, *.BACKUP.*, *.LOCAL.*, *.REMOTE.*)
#   3. archivos de entorno versionados (.env, .env.local, ...)
#   4. tests enfocados (it.only / describe.only / test.only) que silencian la suite
#   5. archivos versionados mayores de GAUNTLET_MAX_FILE_MB (5 por defecto) fuera de Git LFS
#   6. artefactos generados versionados (bytecode, dependencias, salidas de build)
#
# El punto 6 nacio de un caso real: un __pycache__/ llego a la rama principal porque el
# tamano no lo delataba y .gitignore no lo cubria. Un artefacto generado versionado no es
# un fichero de mas: es ruido que convierte cada diff en algo que nadie lee del todo.
#
# Variables:
#   GAUNTLET_MAX_FILE_MB   tamano maximo por archivo no-LFS (MB, por defecto 5)

set -uo pipefail

findings=0
max_mb="${GAUNTLET_MAX_FILE_MB:-5}"
max_kb=$(( max_mb * 1024 ))

report() {
  findings=$(( findings + 1 ))
  printf '\n[hygiene] %s\n' "$1"
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[hygiene] no estamos dentro de un repositorio git" >&2
  exit 1
fi

# 1. marcadores de conflicto (el patron usa cuantificadores, no marcadores literales)
conflicts=$(git grep -nIE '^(<{7}|={7}|>{7})([[:space:]]|$)' -- . 2>/dev/null || true)
if [ -n "$conflicts" ]; then
  report "marcadores de conflicto de merge sin resolver:"
  printf '%s\n' "$conflicts"
fi

# 2. restos de merge versionados
leftovers=$(git ls-files -- '*.orig' '*.rej' '*.BACKUP.*' '*.LOCAL.*' '*.REMOTE.*' 2>/dev/null || true)
if [ -n "$leftovers" ]; then
  report "restos de merge versionados (borralos del indice):"
  printf '%s\n' "$leftovers"
fi

# 3. archivos de entorno versionados
envfiles=$(git ls-files -- '.env' '.env.*' '**/.env' '**/.env.*' 2>/dev/null | grep -vE '\.(example|sample|template)$' || true)
if [ -n "$envfiles" ]; then
  report "archivos de entorno versionados (usa .env.example y .gitignore):"
  printf '%s\n' "$envfiles"
fi

# 4. tests enfocados
testfiles=$(git ls-files -- '*.test.*' '*.spec.*' 'test/*' 'tests/*' '__tests__/*' 2>/dev/null || true)
if [ -n "$testfiles" ]; then
  focused=$(printf '%s\n' "$testfiles" | tr '\n' '\0' \
    | xargs -0 -r git grep -nIE '(^|[^[:alnum:]_])(it|test|describe|context|bench)\.only[[:space:]]*\(' -- 2>/dev/null || true)
  if [ -n "$focused" ]; then
    report "tests enfocados con .only (ocultan el resto de la suite):"
    printf '%s\n' "$focused"
  fi
fi

# 5. archivos grandes fuera de LFS
oversized=$(git ls-files -z 2>/dev/null | xargs -0 -r du -k -- 2>/dev/null \
  | awk -F'\t' -v max="$max_kb" '$1 > max { print $2 }' || true)
if [ -n "$oversized" ]; then
  non_lfs=""
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if git check-attr filter -- "$path" 2>/dev/null | grep -q 'filter: lfs'; then
      continue
    fi
    size_kb=$(du -k -- "$path" 2>/dev/null | cut -f1)
    non_lfs+="  ${path} (${size_kb} KB)"$'\n'
  done <<< "$oversized"
  if [ -n "$non_lfs" ]; then
    report "archivos de mas de ${max_mb} MB versionados fuera de Git LFS:"
    printf '%s' "$non_lfs"
  fi
fi

# 6. artefactos generados versionados
generated=$(git ls-files -- \
  '*.pyc' '*.pyo' '*.pyd' '**/__pycache__/*' '__pycache__/*' \
  '**/node_modules/*' 'node_modules/*' \
  '**/.pytest_cache/*' '**/.mypy_cache/*' '**/.ruff_cache/*' \
  '*.egg-info/*' '**/*.egg-info/*' \
  '**/target/debug/*' '**/target/release/*' 'target/debug/*' 'target/release/*' \
  'compile_commands.json' '**/compile_commands.json' \
  2>/dev/null || true)
if [ -n "$generated" ]; then
  report "artefactos generados versionados (saca del indice y cubre en .gitignore):"
  printf '%s\n' "$generated"
fi

if [ "$findings" -gt 0 ]; then
  printf '\n[hygiene] %d problema(s) encontrado(s).\n' "$findings"
  exit 1
fi

echo "[hygiene] OK: sin conflictos, sin restos de merge, sin .env versionados, sin tests .only, sin binarios grandes fuera de LFS, sin artefactos generados versionados."
exit 0
