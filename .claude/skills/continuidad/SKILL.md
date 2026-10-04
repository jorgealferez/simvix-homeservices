---
name: continuidad
description: Regla permanente de continuidad de Loop Engineering, agnostica al proyecto, para que ningun agente se duerma ni haya que decirle "continua". Los agentes no piden permiso para seguir, no cierran el turno con trabajo activo en PENDIENTES.<repo>.md ni con la meta de OBJETIVO.<repo>.md sin alcanzar, reservan el item antes de empezarlo, programan un despertador cuando esperan algo externo y solo paran por escrito en el ledger. Un ledger por repositorio, nombrado por repositorio. Usar SIEMPRE al empezar o retomar una sesion, al terminar un item o una fase, antes de cerrar cualquier turno, cuando un hook Stop bloquee el cierre, cuando se este a punto de escribir "¿sigo?", "¿continuo?", "¿quieres que...?" o "avisame si...", cuando haya que esperar CI, una revision o un servicio, y cuando el usuario diga continua, sigue, pendientes, no te pares, agente dormido, despertador o continuidad.
---

# Continuidad: agentes que no se duermen

Contrato: **mientras `PENDIENTES.<repo>.md` tenga un item sin marcar en `## Activo`, o la meta de
`OBJETIVO.<repo>.md` no este alcanzada, el agente sigue trabajando. No pide permiso para seguir, no
pregunta si sigue, no cierra el turno.** Parar es una accion que se escribe en el ledger con motivo, no
un silencio.

Esta regla es permanente y complementa al Gauntlet Loop: el gauntlet decide *si un cambio esta
terminado*; la continuidad decide *que se hace a continuacion*, y la respuesta es siempre "el primer
item activo sin reservar" o, si no hay ninguno, "la siguiente fase de la carta".

## 1. El ledger: `PENDIENTES.<repo>.md`, uno por repositorio

Unica fuente de verdad del trabajo pendiente **de ese repositorio**, versionada, en su raiz. `<repo>`
es el nombre del repositorio (`origin`, o el directorio si no hay remoto); lo resuelve
`.claude/loop-engineering/checks/ledger.py --paths` y nadie lo cablea a mano.

**Aislamiento por repositorio.** En una sesion con varios repositorios hay un ledger por repositorio,
cada uno en el suyo. Un item se anota **solo** en el ledger del repositorio al que pertenece el cambio.
Si una tarea toca dos repositorios, hay un item en cada ledger con su parte y una referencia cruzada
`(ver PENDIENTES.<otro>.md)`. Prohibido crear un `PENDIENTES.md` sin nombre o un ledger global que
junte varios repositorios: la puerta `ledger` falla si aparece uno sin nombre junto al nombrado.
`/pendientes`, `/continuar` y los hooks operan sobre el repositorio de trabajo; para otro se indica
explicitamente y el comando dice en su primera linea de que repositorio habla.

```markdown
continuidad: activa            # o "pausada": solo lo escribe una persona

## Activo                      # en ORDEN DE EJECUCION; se toma siempre el primero sin reservar
- [ ] Fase 2 — ... EN CURSO (sesion-abc, 2026-09-20)   # reserva: otra sesion se lo salta
  - [ ] avance: ...            # subitems y notas de avance cuentan como progreso

## Esperando                   # depende de algo externo; exige despertador programado
- [ ] PR #12 — esperando CI (despertador: send_later 30 min)

## Bloqueado                   # solo con motivo de la lista "Cuando SI hay que parar"
- [ ] Entorno local — BLOQUEADO: no hay demonio de Docker en el contenedor

## Hecho
- [x] Fase 1 — ... (#4)

(una seccion vacia se escribe "(vacio)"; nunca se borra la seccion)
```

Reglas de escritura:

| Quien | Puede |
|---|---|
| Agente | Anadir items y subitems a `## Activo`; reservar con `EN CURSO`; anotar avance; mover a `## Esperando` (con despertador) o a `## Bloqueado` (con motivo valido); marcar `[x]` y mover a `## Hecho` **solo con el entregable mergeado o verificado** |
| Persona | Todo lo anterior, reordenar `## Activo`, borrar items y escribir `continuidad: pausada` |

Un agente **nunca** borra un item, reordena `## Activo` por conveniencia propia, ni escribe `pausada`.
Marcar `[x]` sin merge es falsear el ledger: misma gravedad que reportar un gauntlet verde de memoria.

**Reserva.** Antes de empezar un item se le anade `EN CURSO (<sesion>, <fecha>)` y se publica el ledger
(commit y push) *antes* de escribir codigo. Otra sesion que vea una reserva viva se salta ese item y
toma el siguiente sin reservar. Una reserva caduca si su rama remota no se mueve en 24 h. Nacio de un
caso real: dos sesiones implementaron la misma fase en paralelo sin saberlo y hubo que tirar una
entrega entera. La reserva sirve para quien la lee antes de arrancar; que dos sesiones no trabajen a la
vez sobre el mismo plan lo decide una persona, no el ledger.

## 2. Ciclo del agente

**Al empezar o retomar una sesion.** Ejecuta `bin/loop-doctor` (o lee `/pendientes` y `/objetivo`). Si
hay items activos sin reservar, el primero es tu tarea: resevalo y empiezalo sin esperar instruccion,
incluso si el usuario solo ha hecho una pregunta (responde la pregunta y sigue). Si el usuario pide otra
cosa, esa otra cosa entra como primer item de `## Activo` y se hace primero; el resto sigue en cola. Si
`## Activo` esta vacio y la carta no esta alcanzada, la tarea es planificar la siguiente fase de
`## Fases` como items del ledger (skill `loop-engineering`). Si la carta esta `sin-encuadrar`, la tarea
es el encuadre.

**Durante el trabajo.** Anota el avance como subitems del item activo cuando cierres un paso
significativo. No es burocracia: es lo que el guard usa para distinguir "avanza" de "atascado".

**Al terminar un item.** Marca `[x]`, muevelo a `## Hecho` con la referencia (PR, commit), toma el
siguiente de `## Activo` y sigue. Terminar una fase no es motivo para parar: es motivo para empezar la
siguiente (regla de fases sin pedir permiso).

**Antes de cerrar el turno.** Solo se cierra limpiamente si `## Activo` esta vacio **y** la meta esta
alcanzada, o si cada item restante esta reflejado en `## Esperando` (con despertador) o en
`## Bloqueado` (con motivo). Si no, el hook `Stop` devuelve el turno y hay que seguir.

## 3. Esperar sin dormirse: el despertador

Si un item depende de algo externo (CI, una revision, un servicio que tarda, una PR ajena):

1. Muevelo a `## Esperando` indicando que espera.
2. **Programa un despertador antes de cerrar el turno**, con el mecanismo que tenga la sesion:
   - Sesion remota (Claude Code on the web): `send_later` (herramienta `claude-code-remote`) a
     **30–60 minutos**, con un mensaje que diga que revisar
     (`"Continuidad: revisa ## Esperando de PENDIENTES.<repo>.md y retoma el primer activo"`).
   - `/loop` o `ScheduleWakeup` si la sesion los ofrece.
   - PR propio: ademas `subscribe_pr_activity`, que despierta la sesion con cada evento de CI o revision.
3. Anota en el item que el despertador esta programado y para cuando.
4. Al despertar: comprueba el estado, actua, y **vuelve a armar** el despertador si sigue esperando. La
   espera termina cuando el item vuelve a `## Activo` o pasa a `## Hecho`.

Si la sesion **no tiene ningun mecanismo de despertador**, el item no se mueve a `## Esperando`: o se
sondea desde dentro del turno (un bucle de espera o comprobaciones espaciadas), o se sigue con el
siguiente item de `## Activo` y se vuelve a comprobar despues. Cerrar el turno "a ver si el usuario
vuelve" es exactamente el agente dormido que esta regla prohibe.

## 4. Prohibido, sin excepciones

1. Preguntar si se sigue o pedir permiso ya concedido: "¿quieres que continue?", "¿sigo con la Fase
   N?", "¿procedo?", "avisame si quieres que...", "cuando quieras seguimos", "dime y sigo". La
   autorizacion de avanzar, abrir PR y hacer squash merge esta dada y no caduca.
2. Cerrar el turno con un resumen y quedarse esperando mientras `## Activo` tiene items o la meta no
   esta alcanzada.
3. Cerrar el turno con items en `## Esperando` sin despertador programado.
4. Mover un item a `## Bloqueado` con un motivo que no este en la lista "Cuando SI hay que parar". "Es
   largo", "es mejor confirmar", "por si acaso" y "el usuario querra revisar" no son motivos.
5. Marcar `[x]` sin el PR mergeado o el entregable verificado; borrar o reordenar items; escribir
   `continuidad: pausada`; crear `.claude/.gauntlet/disable-continuity-guard`.
6. Rodear el hook `Stop`: si te bloquea, tiene razon; sigue o escala por escrito.
7. Usar la continuidad para saltarse el Gauntlet Loop: seguir con el siguiente item **no** exime de
   cerrar el anterior con la pasada `full` en VERDE.
8. **Fabricar contenido para que un guard deje de bloquear.** Si el guard pide el encuadre y no sabes
   cual es la meta del proyecto, se pregunta (`## Bloqueado` con `BLOQUEADO: falta la meta del
   proyecto` y la decision planteada). Inventarse Meta o Criterios es falsear la carta. El guard
   tampoco lo exige: con la carta `sin-encuadrar` y sin trabajo en el arbol, avisa y deja cerrar.
8. Anotar en el ledger de un repositorio un item cuyo cambio vive en otro, o crear ledgers sin nombre
   de repositorio.

## 5. Cuando SI se para, y como

Las causas son exactamente las de "Cuando SI hay que parar y preguntar" (`CLAUDE.md`): pasar una puerta
exigiria violar una prohibicion del gauntlet; hay que relajar, desactivar o eliminar una puerta o bajar
un objetivo de la carta; el arreglo contradice una decision de `## Decisiones del usuario` o exige un
cambio de arquitectura o de presupuesto; se necesita un permiso que el entorno no concede y no hay
alternativa; hay que reescribir historia publicada.

Como se para:

1. El item pasa a `## Bloqueado` con `BLOQUEADO: <motivo>` de esa lista, y debajo: `QUE PASA:`,
   `QUE SE HA HECHO MIENTRAS:`, `DOS OPCIONES: A) ... B) ...` con su coste y una recomendada.
2. Se le plantea al usuario **la decision concreta**. Nunca "¿como quieres proceder?" a secas.
3. Si quedan otros items en `## Activo` que no dependen del bloqueado, **se sigue con ellos**. Un
   bloqueo en un item no es una pausa del proyecto.

Un bloqueo de entorno (Docker ausente, sin GPU, sin red a un dominio) tampoco es motivo de parada: se
declara `NO VERIFICADO (<motivo>)` en el criterio de la carta, en el benchmark de la fase y en el PR, y
se sigue.

## 6. El guard `Stop` de continuidad

`.claude/loop-engineering/hooks/stop-continuity-guard.py` se ejecuta cada vez que el agente intenta
cerrar el turno:

- Hay items sin marcar en `## Activo` → **bloquea** y devuelve el primero sin reservar.
- `## Activo` vacio y la carta `sin-encuadrar` → **bloquea** con la instruccion de encuadre.
- `## Activo` vacio, carta `en-curso` con fases o criterios pendientes, nada en `## Esperando` ni en
  `## Bloqueado` → **bloquea** nombrando la siguiente fase sin marcar: terminar no es motivo para parar.
- Cota por **progreso**: cada bloqueo guarda un hash del texto de `## Activo` y de la carta. Si no
  cambian en 3 bloqueos seguidos, deja cerrar con un `ESCALADO` y exige `BLOQUEADO: <motivo>` o una
  pregunta concreta. Cualquier cambio (marcar, anadir subitem, nota de avance, avanzar la carta)
  reinicia el contador. Por diseno **no honra `stop_hook_active`**: honrarlo dejaria cerrar a la
  segunda.
- `## Activo` vacio con items en `## Esperando` → deja cerrar y recuerda el despertador. Con items en
  `## Bloqueado` → deja cerrar recordando que la decision es del usuario.
- Meta `alcanzado`, carta `pausado`, `continuidad: pausada` o la valvula local → deja cerrar (solo
  personas).

El guard del gauntlet (`stop-gauntlet-guard.py`) **exime a `PENDIENTES.<repo>.md`**: actualizar el
ledger no exige una pasada del gauntlet (el pre-commit sigue pasando `fast` al commitearlo).

## 7. Comandos

| Comando | Que hace |
|---|---|
| `/pendientes [repo]` | Estado del ledger: activos, esperando, bloqueados, hechos y el siguiente paso |
| `/continuar` | Toma el primer item sin reservar de `## Activo` y lo ejecuta ahora, sin preguntar |
| `/objetivo [repo]` | Estado de la carta: meta, fases y criterios pendientes |

Ninguno es necesario para que la regla aplique: existen para lanzarla a mano.

## 8. Informe de cierre de turno

Todo turno que haya tocado el ledger termina, ademas del informe del gauntlet, con el estado, nombrando
el fichero para que quede claro de que repositorio se habla:

```
Continuidad (PENDIENTES.<repo>.md): activo 4 · esperando 0 · bloqueado 1 · hecho 5
  siguiente : Fase 3 — <titulo>
  despertador: no necesario (nada en Esperando)
Objetivo (OBJETIVO.<repo>.md): en-curso — fases pendientes 3 · criterios pendientes 4
```

Si el turno se cierra con items activos, el informe dice por que (motivo de `## Bloqueado` o
`ESCALADO` del guard). Si no puede decirlo, el turno no debia cerrarse.
