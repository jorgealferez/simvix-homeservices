# Gauntlet Loop — referencia tecnica

Complemento de `SKILL.md`. Aqui esta el esquema del manifiesto, la semantica exacta del runner y como
extenderlo. `SKILL.md` manda sobre el *protocolo*; este documento sobre la *mecanica*.

## Piezas (en el repositorio de trabajo, instaladas por loop-init)

| Ruta | Que es |
|---|---|
| `.claude/gauntlet.json` | Manifiesto: unica fuente de verdad de las puertas y su orden |
| `.claude/loop-engineering/gauntlet.py` | Runner (Python 3.9+, sin dependencias) |
| `.claude/loop-engineering/checks/hygiene.sh` | Puerta `hygiene`, independiente del toolchain |
| `.claude/loop-engineering/checks/enforcement.sh` | Puerta `enforcement`: vigila que los automatismos sigan activos e integros |
| `.claude/loop-engineering/checks/ledger.py` | Puerta `ledger` y parser compartido de `PENDIENTES.<repo>.md` y `OBJETIVO.<repo>.md` |
| `.claude/loop-engineering/checks/ratchet.py` | Puerta `ratchet`: las medidas publicadas no empeoran ni se salen del presupuesto |
| `.claude/loop-engineering/hooks/*` | Hooks de Claude Code: `session-start.sh`, `user-prompt.sh`, `stop-gauntlet-guard.py`, `stop-continuity-guard.py`, `protect-rules-repo.py` |
| `.claude/loop-engineering.json` | Version instalada, origen, `repo_name`, toolchains y sumas sha256 de la capa canonica |
| `bin/gauntlet` | Envoltorio para humanos y agentes; resuelve la raiz desde su propia ubicacion |
| `.claude/commands/gauntlet*.md` | Comandos de barra: `/gauntlet`, `-fast`, `-gate`, `-list`, `-status` |
| `.githooks/pre-commit` | Ejecuta el perfil `fast` en cada `git commit` |
| `.claude/.gauntlet/` | Logs, `last-run.json`, `history.json` y estado de los guards. Ignorado por git |

## Esquema del manifiesto

```jsonc
{
  "version": 1,                  // obligatorio, unico valor soportado
  "project": "mi-repo",          // informativo
  "defaults": { "timeout_seconds": 900 },
  "gates": [                     // el orden del array ES el orden de ejecucion
    {
      "id": "py:ruff",           // obligatorio, unico, usado en -g y en los nombres de log
      "title": "ruff",           // obligatorio, texto humano del resumen
      "command": "ruff check .", // obligatorio, se ejecuta con `bash -c` desde la raiz del repo
      "when": "test -f ruff.toml",           // opcional: si sale != 0 la puerta se marca SKIP
      "when_description": "no aplica: ...",  // opcional: motivo legible del SKIP
      "blocking": true,          // opcional (true por defecto): si false, su fallo es WARN
      "profiles": ["fast", "full"],          // perfiles que la seleccionan
      "timeout_seconds": 600,    // opcional; al agotarse se mata el grupo de procesos -> TIMEOUT
      "enabled": true,           // opcional (true por defecto)
      "disabled_reason": "...",  // obligatorio de facto si enabled es false
      "notes": "...",            // opcional, documentacion
      "fix_hint": "..."          // opcional, se imprime cuando la puerta falla
    }
  ]
}
```

Claves desconocidas hacen fallar el runner con exit 2: el manifiesto no acepta erratas silenciosas.

## Estados

| Estado | Significado | Efecto en el veredicto |
|---|---|---|
| `PASS` | exit 0 | — |
| `FAIL` | exit != 0 | ROJO si `blocking` |
| `TIMEOUT` | supero `timeout_seconds`; grupo de procesos abatido | ROJO si `blocking` |
| `WARN` | `FAIL`/`TIMEOUT` en puerta `blocking: false` | No cambia el veredicto; se lista aparte |
| `SKIP` | `when` no cumplido, o no ejecutada por aborto tras un fallo bloqueante | — |
| `DISABLED` | `enabled: false` | — |

Un `SKIP` **no** es un `PASS`: no aporta cobertura y hay que declararlo en el informe.

## Comportamiento del runner

- **Directorio de trabajo**: siempre la raiz del repositorio (`--root`, `GAUNTLET_ROOT` o
  `git rev-parse --show-toplevel` desde la ubicacion del propio runner). Los comandos del manifiesto se
  escriben relativos a la raiz.
- **Aborto temprano**: por defecto se detiene tras el primer fallo bloqueante (las puertas restantes
  quedan en `SKIP` con motivo explicito). `--no-bail` las ejecuta todas.
- **Perfiles**: un perfil no es mas que una etiqueta en `profiles`. `fast` = lo que aguanta un
  pre-commit; `full` = la pasada que cierra la tarea. Anadir un perfil es anadir su etiqueta.
- **Parcialidad**: `-g/--gate` ignora los perfiles y marca la ejecucion como `partial: true` en
  `last-run.json` (y `profile: null`). Una ejecucion parcial nunca cierra una tarea.
- **Historial**: `.claude/.gauntlet/history.json` guarda las 20 ultimas ejecuciones. Si la misma puerta
  aparece en rojo en las 3 ultimas consecutivas, el runner imprime `ESCALADO: ...`.
- **Salida**: cada linea de cada puerta va al log; en fallo se imprimen las ultimas `--tail` lineas (40
  por defecto). `--stream` vuelca en vivo, `--json` anade el resumen en JSON.

### Variables de entorno

| Variable | Efecto |
|---|---|
| `GAUNTLET_PROFILE` | Perfil por defecto (si no se pasa `-p`) |
| `GAUNTLET_MANIFEST` | Ruta alternativa del manifiesto |
| `GAUNTLET_ROOT` | Raiz alternativa del repositorio |
| `GAUNTLET_MAX_FILE_MB` | Limite de tamano de la puerta `hygiene` (5 por defecto) |
| `LOOP_FAST` | La puerta `py:unittest` (perfil fast) la exporta a 1 para que los tests lentos se omitan |
| `NO_COLOR` / `GAUNTLET_COLOR=always` | Control del color |

## Puertas por toolchain

`loop-init` genera el manifiesto a partir de `templates/gates/*.json` del repositorio de reglas segun lo
que detecta: `base` (siempre: `hygiene`, `enforcement`, `ledger`, `ratchet`), `shell` (siempre;
autoguardadas), `node`, `python`, `rust`, `go`, `make`. Principio: el `when` comprueba que el proyecto
declara la herramienta (script en `package.json`, seccion en `pyproject.toml`, `Cargo.toml`, `go.mod`,
target en el `Makefile`); si la declara y la herramienta no esta, la puerta FALLA y el arreglo es
instalarla o declarar `NO VERIFICADO`. Unica excepcion: herramientas que nadie declara (`shellcheck`),
con `when: command -v` y SKIP ruidoso. Las puertas de Python excluyen `.claude/`: la maquinaria del
loop es herramienta instalada, no codigo del proyecto; la lintea el gauntlet del repositorio de reglas.

`loop-init --update` anade al manifiesto existente las puertas base que falten sin tocar las demas.

## Anadir una puerta

1. Deja el comando funcionando a mano primero.
2. Insertalo en `gates` **en su posicion de coste**: barato arriba, caro abajo. Un fallo caro que se
   podia detectar barato es tiempo perdido en cada iteracion del bucle.
3. Elige perfiles: si tarda menos de ~30 s y no necesita build, entra en `fast`; si no, solo `full`.
4. Escribe `when` para que la puerta se auto-omita mientras el proyecto no la declare, y
   `when_description` para que el SKIP se explique solo.
5. Si depende de un script, anadelo a la puerta de contrato del toolchain.
6. **Canario**: provoca el fallo que la puerta debe detectar y comprueba que sale ROJO. Una puerta que
   nunca ha fallado no esta demostrada.
7. Verifica el conjunto: `bin/gauntlet --list` y `bin/gauntlet -p full`.

Para puertas de dominio (presupuestos de rendimiento, contratos de datos): el umbral vive en el script
o en su config, nunca en el manifiesto. Asi el gauntlet solo decide *si* se pasa y el proyecto decide
*que* se mide. Los numeros medidos se publican en `docs/benchmarks/fase_N.json` y la puerta `ratchet`
impide que empeoren.

## Resolucion de problemas

| Sintoma | Causa habitual y salida |
|---|---|
| exit 2 `no existe el manifiesto` | Se ejecuta con `--root`/`GAUNTLET_ROOT` apuntando fuera del repo, o el sistema no esta instalado (`bin/loop-init`) |
| exit 2 `claves desconocidas` | Errata en una clave del manifiesto; compara con el esquema de arriba |
| Todas las puertas en `SKIP` | El proyecto aun no declara ningun toolchain: es correcto al principio, pero hay que decirlo en el informe |
| `enforcement` en rojo por sumas | Alguien edito la capa canonica a mano; `loop-init --update` la restaura (en el repositorio de reglas: `loop-init --self`) |
| `ledger` en rojo por coexistencia | Hay un `PENDIENTES.md`/`OBJETIVO.md` sin nombre junto al nombrado: retira el legado en un commit aparte |
| Una puerta pasa suelta (`-g`) y falla en `-p full` | Efecto de una puerta anterior (build, deps, artefactos). Diagnostica siempre con la pasada completa |
| `TIMEOUT` en una puerta que antes iba bien | Proceso colgado, no un limite demasiado bajo: revisa el log antes de subir `timeout_seconds` |
| El pre-commit no se ejecuta | `git config core.hooksPath` no apunta a `.githooks`; ejecuta `bin/loop-doctor` desde el repositorio de reglas o `git config core.hooksPath .githooks` |
| Exit 141 al canalizar la salida | SIGPIPE por `\| head`; no es un veredicto. El veredicto se lee de una ejecucion sin tuberia truncante |
| El hook `Stop` bloquea el cierre | Falta la pasada verde posterior al ultimo cambio: ejecutala. Si no puede quedar verde, escala; no crees `disable-stop-guard` |

## Semantica del guard `Stop` del gauntlet

Al intentar cerrar el turno compara el arbol de trabajo (`git status --porcelain=v1 -z -uall`, asi que
un archivo nuevo dentro de un directorio nuevo tambien cuenta y las rutas con espacios o no ASCII no
se pierden) con `.claude/.gauntlet/last-run.json` y **bloquea** (exit 2) si falta una pasada que sea a
la vez: VERDE, completa (no `-g`), del perfil exigido por el tipo de cambio, y posterior en el tiempo al
ultimo archivo modificado.

- El perfil exigido es `full`, salvo que *todos* los archivos cambiados sean documentacion (`.md`,
  `.txt`, `.rst`, `.adoc` o bajo `docs/`), en cuyo caso basta `fast` y `full` tambien vale.
- Exime a `PENDIENTES.<repo>.md`: es estado de continuidad, no un entregable.
- Cota por progreso: la clave es (rutas cambiadas, fecha del ultimo cambio, fecha de la ultima pasada).
  Dos bloqueos con la misma clave y el tercero deja cerrar con `ESCALADO`. Una edicion o una pasada
  nueva reinician el contador. No basta con `stop_hook_active`: honrarlo dejaria cerrar a la segunda con
  el arbol igual de sin verificar.
- Valvula de escape humana: `touch .claude/.gauntlet/disable-stop-guard`. Para el agente, crear ese
  archivo es una regla dura violada.

## Integracion con CI

El mismo contrato debe correr en CI, con el mismo comando y sin reimplementarlo:

```yaml
- run: bin/gauntlet -p full --no-bail
```

`--no-bail` en CI da el panorama completo en un solo run; en local el aborto temprano es mas rapido. Si
CI y el gauntlet local divergen, el manifiesto es el que manda: corrige CI, no el manifiesto. Si el
proyecto no tiene CI operativa (sin runners, sin cuota), la pasada local es el unico veredicto y se
declara asi en `## Decisiones del usuario` de la carta.
