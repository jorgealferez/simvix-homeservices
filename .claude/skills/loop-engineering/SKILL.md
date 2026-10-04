---
name: loop-engineering
description: Protocolo maestro de Loop Engineering, agnostico al proyecto - de la base real de un repositorio a una meta clara, fase a fase, con autonomia total y sin preguntas por el camino. Define el alcance multirepo (el repositorio de reglas es de solo lectura; se trabaja en los repositorios de trabajo, con un ledger y una carta por repositorio), el arranque de sesion, el encuadre que rellena OBJETIVO.<repo>.md desde la base del proyecto, la mecanica por fase (rama, gauntlet, benchmark, ADR, PR, squash merge, realineado), los roles Constructor/Critico, la lista cerrada de motivos para parar y el informe de cierre. Usar SIEMPRE al empezar una sesion en un repositorio con el loop instalado o que deba instalarse, al planificar o cerrar una fase, al escribir o revisar OBJETIVO.<repo>.md, al abrir un PR o hacer squash merge, cuando se este a punto de pedir permiso para avanzar, y cuando el usuario diga loop engineering, meta, objetivo, encuadre, fase, roadmap, plan, autonomia, hasta el final o no pares.
---

# Loop Engineering: de la base a la meta

Contrato: **se parte de la base real del repositorio, se fija una meta con criterios medibles y fases
ordenadas, y se avanza fase a fase, con PR y squash merge, sin pedir permiso, hasta que la meta esta
alcanzada con la mayor calidad y proyeccion posibles.** El Gauntlet Loop (skill `gauntlet-loop`) decide
si cada cambio esta terminado; la continuidad (skill `continuidad`) decide que se hace a continuacion;
esta skill decide a donde se va y como se cierra cada fase.

## 1. Alcance: donde se trabaja y donde no

- **Repositorio de reglas** (`loop-engineering-rules`, marcador `.loop-engineering-root` en su raiz):
  contiene este protocolo, las skills, los comandos, la capa mecanica canonica y el instalador. En una
  sesion de trabajo es **de solo lectura**: no se edita, no se commitea, no se pushea, no se "arregla
  de paso". Si esta adjunto a la sesion, sus reglas se cargan solas; si algo de el parece mal, se anota
  en el ledger del repositorio de trabajo como propuesta y se sigue. Unica excepcion: que el usuario
  pida **explicitamente** cambiar las reglas; entonces la primera linea de la respuesta es
  `Mantenimiento de reglas: ACTIVO (peticion explicita: "<cita del usuario>")` y el trabajo se hace con
  el propio gauntlet del repositorio de reglas. Un hook `PreToolUse` instalado en los repositorios de
  trabajo pide confirmacion humana ante cualquier escritura en el repositorio de reglas.
- **Repositorio de trabajo**: el repositorio principal de la sesion (`CLAUDE_PROJECT_DIR`), o los que
  el usuario haya pedido. Ahi vive todo: codigo, `PENDIENTES.<repo>.md`, `OBJETIVO.<repo>.md`,
  `docs/adr/`, `docs/benchmarks/`, la maquinaria instalada.
- **Varios repositorios de trabajo**: cada uno tiene su ledger y su carta, nombrados por repositorio.
  Nada se mezcla: un item vive en el ledger del repositorio cuyo cambio describe; una tarea que cruza
  dos repositorios tiene un item en cada uno con referencia cruzada. Los demas repositorios adjuntos son
  de **lectura** mientras la carta del repositorio de trabajo no los nombre en su cabecera
  `alcance: <repo-a>, <repo-b>`; el hook `PreToolUse` pide confirmacion humana ante una escritura en un
  repositorio git no declarado. Anadir uno al alcance es una linea en la carta, escrita a proposito.
- **Sin sistema instalado**: si el repositorio de trabajo no tiene `.claude/loop-engineering.json`, la
  primera accion es instalarlo desde el repositorio de reglas (`bin/loop-init <repo>`, skill
  `loop-init`) y commitearlo como primer paso de la Fase 0. No se pide permiso: instalar el loop es
  parte de la autorizacion de trabajar con el.

## 2. Arranque de sesion

1. `bin/loop-doctor <repo>` (desde el repositorio de reglas) o, si no esta adjunto,
   `bash .claude/loop-engineering/checks/enforcement.sh` en el repositorio de trabajo. Si algo esta
   roto, se arregla primero (`loop-init --update`); si no se puede, se escala por escrito.
2. Leer `OBJETIVO.<repo>.md` y `PENDIENTES.<repo>.md` (`/objetivo`, `/pendientes`).
3. Decidir la tarea sin preguntar:
   - el usuario ha pedido algo → entra como primer item de `## Activo` y se hace primero;
   - hay items activos sin reservar → reservar el primero y empezarlo;
   - `## Activo` vacio y carta `sin-encuadrar` → **encuadre** (seccion 3);
   - `## Activo` vacio y carta `en-curso` → planificar la siguiente fase sin marcar (seccion 4);
   - carta `alcanzado` → solo entran items nuevos del usuario; si no hay, se informa y se cierra.
4. Declarar el gauntlet (`Gauntlet Loop: ACTIVO — ...`) si la tarea toca archivos versionados.

Los hooks `SessionStart` y `UserPromptSubmit` reinyectan este estado en cada turno. En sesiones donde
los hooks no disparan (por ejemplo, el directorio principal no es el repositorio), el protocolo se
aplica igual: `CLAUDE.md`, estas skills, el pre-commit de git y `loop-doctor` son suficientes.

## 3. Encuadre: fijar el inicio y la meta desde la base real

La carta `OBJETIVO.<repo>.md` nace con `estado: sin-encuadrar`. Encuadrar es la **Fase 0** de todo
repositorio y no se pregunta: se hace y se entrega como PR para que el usuario pueda corregirla.

1. **Leer la base real**, no imaginarla: README y docs, manifiestos y lockfiles, arbol de directorios,
   tests existentes y su resultado (`bin/gauntlet -p full` como punto de partida, con su informe), CI,
   issues o TODOs visibles, historial reciente (`git log`), la peticion del usuario y cualquier
   documento de especificacion del repositorio.
2. **Escribir `## Inicio`**: commit de partida, stack y toolchains, que funciona hoy (medido), que
   falta, deuda visible. Numeros, no adjetivos.
3. **Escribir `## Meta`**: el estado final en un parrafo, como "el proyecto esta terminado cuando...".
   Se deriva de la peticion del usuario y de lo que la base ya promete (README, especificaciones). Si el
   usuario dio la meta, esa es la meta; si no, se propone la mas ambiciosa que la base sostiene, y se
   escribe como suposicion revisable.
4. **Escribir `## Criterios de salida`**, cada uno medible:
   `- [ ] <criterio> — medida: <como se mide> — objetivo: <valor>`. Un criterio que no se puede medir no
   es un criterio. Lo que el entorno no puede medir se marca `NO VERIFICADO (<motivo>)` y sigue
   pendiente; lo que el usuario saque del alcance, `FUERA DE ALCANCE por decision del usuario (<fecha>)`.
5. **Escribir `## Fases`**, en orden de dependencia, una fase = un PR con squash merge, cada una
   acercando al menos un criterio y diciendo cual. Sin fases de relleno. Se pueden anadir fases al final
   mas adelante; nunca renumerar (si hace falta intercalar, se usan letras).
6. **Escribir `## Calidad y proyeccion`** (el liston del repositorio: puertas, ADR, benchmarks,
   presupuesto) y `## Decisiones del usuario` (lo que el usuario haya decidido, con fecha; por ejemplo
   "CI fuera de alcance mientras no haya cuota").
7. Poner `estado: en-curso`, **sembrar `## Activo`** del ledger con la Fase 1 (y sus subitems), quitar
   toda marca `(pendiente de encuadre)`, y cerrar la Fase 0 con el gauntlet en VERDE y un PR
   "Fase 0 — Encuadre" cuyo cuerpo lleve la carta resumida. Squash merge.

Las suposiciones **sobre lo que has leido** se escriben en la carta, no se preguntan: el usuario la
corrige cuando quiera y hasta entonces la carta manda. Lo que no puedes leer en ningun sitio, y muy en
particular **que quiere el usuario de su proyecto**, no es una suposicion: es una pregunta. Va a
`## Bloqueado` con `BLOQUEADO: falta la meta del proyecto` y se plantea la decision. Inventarla para
que un guard deje de bloquear es falsear la carta.

Por eso el guard de continuidad **no** exige el encuadre en un repositorio recien instalado sin
trabajo en el arbol: avisa y deja cerrar. El encuadre es obligatorio antes de **trabajar** en el
repositorio, no antes de responder una pregunta.

## 4. Mecanica por fase (autonomia total)

Autorizacion durable, que no caduca: avanzar a la siguiente fase, abrir el PR y hacerle squash merge.
No se pregunta "¿sigo con la Fase N+1?": se sigue.

```
1. git fetch origin <principal> && git checkout -B <rama> origin/<principal>
2. Reservar el item en el ledger (EN CURSO) y publicarlo (commit + push) antes de escribir codigo
3. Implementar la fase con el Gauntlet Loop (cambio -> puertas -> pasada full en VERDE)
   - Constructor: implementa el objetivo de la fase, el trozo mas pequeno coherente cada vez
   - Critico: audita codigo y numeros; veredicto APROBADO/RECHAZADO con defectos
     BLOQUEANTE/MAYOR/MENOR y prueba reproducible; se corrigen BLOQUEANTE y MAYOR antes del PR
4. Publicar numeros MEDIDOS en docs/benchmarks/fase_N.json (ids del presupuesto) y el ADR en docs/adr/
   por cada decision de diseño; anotar el avance como subitems del item
5. Commit y push a <rama>
6. Pull request contra <principal>, titulado "Fase N — <titulo>", con el veredicto real del gauntlet,
   las medidas, lo NO VERIFICADO con motivo y los pendientes en el cuerpo (tras el squash es el unico
   registro que queda de la fase)
7. Squash merge
8. Marcar la fase [x] en la carta con la referencia (#PR) y el item [x] en ## Hecho del ledger;
   sembrar ## Activo con la fase siguiente
9. Volver al paso 1
```

`<rama>` es la rama designada de la sesion; `<principal>` es la rama por omision del repositorio
(`git symbolic-ref refs/remotes/origin/HEAD`, normalmente `main`). Tras un squash merge esa rama queda
consumida: la fase siguiente **se rearranca desde `origin/<principal>`** con el mismo nombre, nunca
apilando commits sobre historia ya mergeada.

**Realinear la rama remota tras el squash.** El squash crea un commit nuevo en la rama principal, asi
que la rama remota se queda apuntando a historia divergente. Se realinea con `git push
--force-with-lease`, pero **solo despues de comprobar que el squash no perdio nada**, acotado a los
ficheros que esa rama tocaba:

```bash
git fetch --prune origin
base=$(git merge-base <rama-remota-previa> origin/<principal>)
mias=$(git diff --name-only "$base" <rama-remota-previa>)      # lo que la fase cambio
git diff --name-only <rama-remota-previa> origin/<principal> -- $mias   # ESTO tiene que salir vacio
git push --force-with-lease -u origin <rama>
```

Si ese ultimo `git diff` devuelve algun fichero, NO se fuerza: el squash no recogio todo lo que la rama
cambiaba y hay que averiguar por que. Se acota a `$mias` porque un diff del arbol entero devuelve
tambien lo que otras ramas mergearon mientras tanto, y una alarma que salta en falso de rutina es como
se acaba ignorando la de verdad.

**Lo que la autonomia NO relaja.** El Gauntlet Loop sigue intacto: ningun PR sin pasada `full` en VERDE
posterior al ultimo cambio, ningun merge con el gauntlet en ROJO. Ningun criterio se da por cumplido sin
medirlo. El Ratchet: un numero publicado es suelo minimo para las fases siguientes (puerta `ratchet`).
CI, si existe y funciona, es el segundo veredicto; si no, la pasada local es el unico y se dice.

## 5. Calidad y proyeccion

- **Un ADR por decision de diseño** (`docs/adr/NNNN-titulo-declarativo.md`): contexto, decision,
  alternativas, consecuencias, verificacion. Un ADR aceptado no se edita: se sustituye.
- **Un benchmark medido por fase** (`docs/benchmarks/fase_N.json`): solo salida de ejecucion, nunca
  numeros estimados; cada medida existe en `presupuesto.json`; lo no medible se declara.
- **Proyeccion**: cada fase deja escrito en su benchmark (`pendientes`) lo que abre para las
  siguientes; al cerrar la ultima fase de la carta, si la base sostiene mas, se proponen fases nuevas al
  final de `## Fases` (con sus criterios) en vez de declarar la meta alcanzada por agotamiento. La meta
  se declara `alcanzado` solo cuando **todos** los criterios estan medidos y cumplidos (o fuera de
  alcance por decision del usuario), y se dice en el informe con los numeros.
- **Nada de relleno**: una fase que no acerca ningun criterio no existe.

## 6. Cuando SI hay que parar y preguntar

Lista cerrada. Se para solo si:

- pasar una puerta exigiria violar una prohibicion del Gauntlet Loop;
- hay que **relajar, desactivar o eliminar** una puerta, o bajar un objetivo de la carta o del
  presupuesto;
- el arreglo contradice una decision de `## Decisiones del usuario` o exige un cambio de arquitectura o
  de presupuesto que la carta no contempla;
- se necesita un permiso que el entorno no concede (politica de red, credenciales, servicios externos) y
  no existe alternativa dentro de lo permitido;
- hay que borrar o reescribir historia ya publicada (mas alla del realineado con `--force-with-lease`
  verificado de la seccion 4).

Se para **por escrito** (skill `continuidad`, seccion 5): el item pasa a `## Bloqueado` con
`BLOQUEADO: <motivo>`, se plantea la decision concreta con dos opciones y su coste, y se sigue con los
demas items. Un bloqueo de entorno no es motivo para parar: se declara `NO VERIFICADO` y se sigue. "Es
largo", "mejor confirmar" y "el usuario querra revisar" no son motivos.

## 7. Informe de cierre

Todo turno que toque archivos versionados cierra con los tres bloques, nombrando los ficheros:

```
Gauntlet (perfil full): VERDE — N PASS, M SKIP, 0 FAIL
  ejecutadas : ...
  omitidas   : ... (motivo)
  iteraciones: N
Continuidad (PENDIENTES.<repo>.md): activo N · esperando N · bloqueado N · hecho N
  siguiente : ...
  despertador: ...
Objetivo (OBJETIVO.<repo>.md): <estado> — fases pendientes N · criterios pendientes N
```

Si el turno cierra una fase: ademas el PR, el resultado del squash merge y la fase siguiente ya
sembrada en `## Activo`.
