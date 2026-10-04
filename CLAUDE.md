# simvix-homeservices

<!-- loop-engineering:start (generado por loop-init v0.1.0; no editar a mano entre marcadores) -->
## Loop Engineering — reglas permanentes de simvix-homeservices

Instalado desde el repositorio de reglas `loop-engineering-rules`. Se aplican en **toda** sesion, por
defecto y sin comando previo. Protocolo completo en las skills `loop-engineering`, `gauntlet-loop` y
`continuidad` (en `.claude/skills/` de este repositorio y en el repositorio de reglas si esta adjunto).

### Alcance y aislamiento

- Se trabaja en **este** repositorio. El repositorio de reglas (`loop-engineering-rules`, marcador
  `.loop-engineering-root`) es de **solo lectura**: no se edita, no se commitea, no se "arregla de paso".
  Un hook `PreToolUse` pide confirmacion humana ante cualquier escritura alli.
- **Un ledger y una carta por repositorio, nombrados por repositorio**: `PENDIENTES.simvix-homeservices.md` y
  `OBJETIVO.simvix-homeservices.md`. Un item se anota solo en el ledger del repositorio al que pertenece el cambio;
  si una tarea toca otro repositorio, su parte va en el ledger de ese otro, con referencia cruzada.
  Prohibido crear `PENDIENTES.md`/`OBJETIVO.md` sin nombre o un ledger global.

### Gauntlet Loop (obligatorio)

Ningun cambio esta terminado hasta que `bin/gauntlet -p full` termina en **VERDE** en una unica
pasada posterior al ultimo cambio. Antes de la primera edicion, la primera linea de la respuesta es
`Gauntlet Loop: ACTIVO — perfil <fast|full> · puertas previstas: <ids>`; la tarea cierra con el
informe real del runner. Codigo, config, build, dependencias, CI -> `full`; solo documentacion ->
`fast` como minimo. Bucle: cambio minimo -> `bin/gauntlet -g <id>` (parcial) -> `bin/gauntlet -p full`
-> si ROJO, causa raiz en una frase, un arreglo, y la pasada completa desde el principio.

Prohibido sin excepciones: dar algo por terminado sin la pasada `full` en VERDE posterior al ultimo
cambio; reportar un veredicto de memoria; silenciar una puerta (`skip`, `only`, tests comentados,
`ignore`/`allow`/`disable` de conveniencia, umbrales rebajados); `--no-verify`, tocar `core.hooksPath`,
desactivar un hook o crear `.claude/.gauntlet/disable-*`; editar `.claude/gauntlet.json` para que una
puerta en rojo deje de ejecutarse; llamar "flake" a un fallo (una sola re-ejecucion, y solo si murio
antes de ejecutar nada real); ampliar el diff para arreglar un rojo preexistente. Un SKIP no es un
PASS: las puertas omitidas se declaran siempre con su motivo.

### De la base a la meta (autonomia total)

`OBJETIVO.simvix-homeservices.md` fija Inicio, Meta, Criterios de salida medibles y Fases. Si su estado es
`sin-encuadrar`, la **primera tarea es el encuadre**: leer la base real (README, docs, manifiestos,
arbol, tests, CI), rellenar la carta, sembrar `## Activo` del ledger y cerrar "Fase 0 — Encuadre" con
PR. Despues se ejecutan las fases **en orden y sin pedir permiso**: rama desde la rama por omision,
implementar con el gauntlet, benchmark medido + ADR, PR "Fase N — <titulo>" con el veredicto real en el
cuerpo, **squash merge**, siguiente fase. La autorizacion es durable: no se pregunta "¿sigo?". Un
criterio que el entorno no puede medir se declara `NO VERIFICADO` con motivo, nunca se da por
cumplido. La meta se declara `alcanzado` solo con todos los criterios medidos.

Tras un squash merge la rama se rearranca desde la rama por omision (nunca apilando sobre historia
mergeada). Antes de un `git push --force-with-lease` para realinear la rama remota, comprobar que el
squash no perdio nada, acotado a los ficheros que la rama tocaba:

```bash
git fetch --prune origin
base=$(git merge-base <rama-remota-previa> origin/<principal>)
mias=$(git diff --name-only "$base" <rama-remota-previa>)
git diff --name-only <rama-remota-previa> origin/<principal> -- $mias   # tiene que salir vacio
```

### Continuidad (agentes que no se duermen)

Mientras `PENDIENTES.simvix-homeservices.md` tenga un item sin marcar en `## Activo`, el agente **sigue**: al
empezar una sesion toma el primer item sin reservar; antes de empezarlo lo reserva (`EN CURSO
(<sesion>, <fecha>)`) y publica el ledger; anota el avance como subitems; al terminar marca `[x]` (solo
con PR mergeado) y toma el siguiente. Con `## Activo` vacio y la meta sin alcanzar, planifica la
siguiente fase: terminar no es motivo para parar. Al esperar algo externo, mueve el item a
`## Esperando` y **programa un despertador** (`send_later` 30–60 min en sesiones remotas, `/loop` o
`ScheduleWakeup` donde existan, `subscribe_pr_activity` en PRs propios); sin despertador el item no se
mueve. Prohibido: "¿quieres que continue?", "¿sigo?", "avisame si...", cerrar el turno con un resumen y
trabajo activo, marcar `[x]` sin merge, borrar o reordenar items, escribir `continuidad: pausada`,
rodear el hook `Stop`.

### Cuando SI hay que parar y preguntar

Solo si: pasar una puerta exigiria violar una prohibicion; hay que relajar, desactivar o eliminar una
puerta o bajar un objetivo de la carta; el arreglo contradice una decision de `## Decisiones del
usuario` o exige un cambio de arquitectura o de presupuesto; se necesita un permiso que el entorno no
concede y no hay alternativa; hay que borrar o reescribir historia publicada. Se para **por escrito**:
el item pasa a `## Bloqueado` con `BLOQUEADO: <motivo>`, se plantea la decision concreta (que se
necesita, que se intento, dos opciones con su coste) y se sigue con los demas items. Un bloqueo de
entorno no para nada: se declara `NO VERIFICADO` y se sigue.

### Comandos e informe de cierre

`/gauntlet` (`bin/gauntlet -p full`) · `/gauntlet-fast` · `/gauntlet-gate <id>` · `/gauntlet-list` ·
`/gauntlet-status` · `/pendientes` · `/continuar` · `/objetivo` · `/loop-doctor`. Todo turno que toque
archivos versionados cierra con:

```
Gauntlet (perfil full): VERDE — N PASS, M SKIP, 0 FAIL
  ejecutadas : ...
  omitidas   : ... (motivo)
  iteraciones: N
Continuidad (PENDIENTES.simvix-homeservices.md): activo N · esperando N · bloqueado N · hecho N
  siguiente : ...
  despertador: ...
Objetivo (OBJETIVO.simvix-homeservices.md): <estado> — fases pendientes N · criterios pendientes N
```

Automatismos que sostienen la regla: hooks `SessionStart`, `UserPromptSubmit`, `Stop` (x2) y
`PreToolUse` en `.claude/settings.json`; `.githooks/pre-commit` (perfil `fast`); puertas `enforcement`
y `ledger` del gauntlet; `.claude/.gauntlet/` es estado local y no se versiona.
<!-- loop-engineering:end -->
