---
name: gauntlet-loop
description: Protocolo obligatorio de verificacion de Loop Engineering, agnostico al proyecto. Define el bucle cambio -> puertas -> causa raiz -> pasada completa en verde -> cierre, con las puertas de .claude/gauntlet.json, el runner bin/gauntlet y los comandos /gauntlet, /gauntlet-fast, /gauntlet-gate, /gauntlet-list y /gauntlet-status. Usar SIEMPRE, sin esperar a que nadie lo pida, en cuanto se vaya a modificar cualquier archivo versionado del repositorio de trabajo (codigo, assets, config, build, CI, docs) y antes de commitear, de cerrar una tarea o de afirmar que algo funciona. Usar tambien al empezar una tarea para declarar la confirmacion de conformidad, al anadir, cambiar o desactivar una puerta, al interpretar un veredicto VERDE/ROJO, si un hook avisa de que el turno no puede cerrarse, o cuando el usuario diga gauntlet, gauntlet loop, pasar el gauntlet, verificacion, puertas, quality gates o run the gauntlet.
---

# Gauntlet Loop

Contrato: **ningun cambio del repositorio de trabajo se considera terminado hasta que el gauntlet
completo termina en VERDE en una unica pasada posterior al ultimo cambio.**

Esta regla es permanente (`CLAUDE.md` del repositorio de reglas y seccion instalada en el `CLAUDE.md`
del repositorio de trabajo), se aplica por defecto y no necesita que nadie la invoque. Los comandos de
la seccion 3 existen para lanzarla a mano, no para activarla. Este documento es su definicion
operativa; la mecanica del runner y el esquema del manifiesto estan en `reference.md`.

## 1. Confirmacion obligatoria

En cuanto una tarea vaya a tocar un archivo versionado, **antes de la primera edicion**, declara en tu
primera linea de respuesta:

```
Gauntlet Loop: ACTIVO — perfil <fast|full> · puertas previstas: <ids>
```

No es una formula decorativa: es el compromiso de cerrar con el informe de la seccion 7. Si ya has
empezado a editar sin declararlo, declaralo en cuanto te des cuenta. Si la tarea no toca nada
versionado (una pregunta, una lectura), no declares nada: el gauntlet no aplica.

Al cerrar, el informe real del runner. Entre ambos, el bucle de la seccion 4. Confirmacion sin informe,
o informe sin ejecucion, es incumplimiento de la regla.

## 2. Alcance

| Naturaleza del cambio | Perfil minimo obligatorio |
|---|---|
| Codigo, assets, config, build, dependencias, CI, manifiesto, hooks | `full` |
| Solo documentacion o comentarios | `fast` |
| Sin cambios en el arbol de trabajo (solo lectura, respuesta a una pregunta) | ninguno |

No hay una cuarta fila. Si has escrito en un archivo versionado, el gauntlet te aplica. El ledger
`PENDIENTES.<repo>.md` es la unica excepcion: es estado de continuidad, no un entregable, y el guard
`Stop` lo exime (el pre-commit sigue pasando `fast` al commitearlo).

## 3. Comandos

### Comandos de barra (invocacion manual)

| Comando | Que hace |
|---|---|
| `/gauntlet [args]` | Pasada completa (`-p full`): **la que cierra una tarea** |
| `/gauntlet-fast [args]` | Perfil `fast`: lo que exige el pre-commit |
| `/gauntlet-gate <id> [id...]` | Una o varias puertas sueltas: iteracion rapida, ejecucion parcial |
| `/gauntlet-list` | Puertas declaradas, orden, perfiles y comando de cada una |
| `/gauntlet-status` | Veredicto de la ultima ejecucion y si sigue siendo valido |

### Linea de comandos

```bash
bin/gauntlet --list                  # envoltorio: funciona desde cualquier directorio
bin/gauntlet -g lint -g typecheck    # iteracion rapida (NO cuenta como pasada)
bin/gauntlet -p fast                 # puertas baratas
bin/gauntlet -p full                 # LA PASADA QUE CUENTA
bin/gauntlet -p full --no-bail       # no abortar en el primer fallo: ver todo el panorama
bin/gauntlet -p full --stream        # volcar la salida en vivo (depuracion)

# equivalente sin envoltorio:
python3 .claude/loop-engineering/gauntlet.py -p full
```

Veredicto: `exit 0` = VERDE, `exit 1` = ROJO, `exit 2` = manifiesto o argumentos invalidos. Logs por
puerta en `.claude/.gauntlet/logs/<id>.log`; resumen en `.claude/.gauntlet/last-run.json`.

## 4. El bucle

**Fase 0 — Encuadre y confirmacion.** Declara la conformidad (seccion 1). Mira `/gauntlet-list` y
decide que puertas puede romper tu cambio. Si sospechas que el repo ya estaba rojo, ejecuta
`/gauntlet` *antes* de tocar nada: ese es tu punto de partida y lo que distinguira un fallo tuyo de
uno preexistente.

**Fase 1 — Un cambio, una intencion.** Implementa el trozo mas pequeno que sea coherente. No mezcles
el arreglo de una puerta con una refactorizacion oportunista.

**Fase 2 — Puertas dirigidas.** `/gauntlet-gate <puerta>` sobre las puertas que tu cambio toca. Es solo
iteracion rapida: el runner marca estas ejecuciones como parciales y **nunca** cierran la tarea.

**Fase 3 — Pasada completa.** `/gauntlet`, sin `-g`, desde la primera puerta. Debe salir VERDE de
principio a fin en una sola ejecucion.

**Fase 4 — Rojo: causa raiz.** Si la Fase 3 sale ROJO:
1. Lee el log completo de la puerta, no solo el resumen.
2. Nombra la causa raiz en una frase antes de escribir codigo. Si no puedes, sigue leyendo.
3. Aplica **un** arreglo dirigido a esa causa. Nada de arreglos en escopeta.
4. Vuelve a la **Fase 1**. La pasada completa se rehace desde el principio: arreglar la puerta 7 puede
   romper la 3, y un gauntlet reanudado a mitad no es un gauntlet.

**Fase 5 — Cierre.** Solo con la Fase 3 en VERDE: commit (el hook de pre-commit vuelve a pasar el
perfil `fast`) y reporta el veredicto con el formato de la seccion 7.

## 5. Reglas duras

Prohibido, sin excepciones y sin preguntar:

1. Declarar una tarea terminada, o afirmar que algo funciona, sin una pasada `full` en VERDE
   **posterior al ultimo cambio**. Si has editado despues del ultimo VERDE, ese VERDE ya no vale.
2. Reportar un veredicto de memoria, por deduccion o por parecido. El veredicto es la salida del
   runner en esta sesion; si no la tienes, ejecutalo.
3. Cerrar una puerta silenciandola: tests enfocados u omitidos (`only`, `skip`, `xit`, comentados),
   supresiones de conveniencia (`ts-ignore`, `any`, `eslint-disable`, `noqa`, `type: ignore`,
   `allow(...)`, `nolint`), bajar un umbral, aflojar un presupuesto o excluir un archivo del lint.
4. `git commit --no-verify`, desinstalar el hook, tocar `core.hooksPath`, desactivar un hook de
   `.claude/settings.json` o crear `.claude/.gauntlet/disable-*`. Todos los bypass son decisiones
   humanas explicitas, nunca una salida del agente.
5. Editar `.claude/gauntlet.json` para que una puerta en rojo deje de ejecutarse. Cambiar el manifiesto
   exige peticion explicita del usuario y va en su propio commit (seccion 8).
6. Llamar "flake" a un fallo. Se re-ejecuta una puerta **una sola vez** y solo si murio antes de
   ejecutar nada real (instalacion, checkout, runner caido). Un segundo fallo es un fallo real.
7. Ampliar el diff para arreglar un rojo preexistente. Si el fallo se reproduce en la rama por omision
   sin tus cambios: no lo arrastres, dilo en el informe y propon un arreglo aparte.

## 6. Escalado

Para el bucle y consulta al usuario cuando:

- la misma puerta falla en **3 ejecuciones consecutivas** (el runner lo avisa: `ESCALADO: ...`);
- la unica forma de pasar una puerta seria violar una regla de la seccion 5;
- el arreglo obliga a un cambio de arquitectura, de API publica o de presupuesto;
- el fallo es preexistente o del entorno, no de tu cambio;
- una puerta obligatoria no puede ejecutarse (toolchain ausente, manifiesto roto).

Al escalar, entrega: puerta, causa raiz identificada, lo que has probado, y dos opciones concretas con
su coste. No entregues un bucle abandonado sin diagnostico. Escalar no para el resto del trabajo: el
item pasa a `## Bloqueado` del ledger y se sigue con los demas (skill `continuidad`).

## 7. Informe final obligatorio

Cierra siempre con el veredicto real, en este formato:

```
Gauntlet (perfil full): VERDE — 6 PASS, 3 SKIP, 0 FAIL
  ejecutadas : hygiene, enforcement, ledger, py:compile, py:ruff, py:unittest:full
  omitidas   : ratchet (sin benchmarks publicados), sh:shellcheck (no instalado), py:pytest (proyecto sin pytest)
  iteraciones: 2
```

Las puertas omitidas se declaran **siempre** y con su motivo: un SKIP no es un PASS, y un gauntlet
mayoritariamente en SKIP es informacion que el usuario necesita para saber cuanta cobertura real tiene
el veredicto. Si el gauntlet quedo ROJO, el informe lo dice con la misma claridad: que puerta, que
causa raiz y que decision pide.

## 8. Cambiar las puertas

El manifiesto `.claude/gauntlet.json` es la unica fuente de verdad: el orden de la lista es el orden de
ejecucion, de lo mas barato a lo mas caro. Esquema completo, estados, plantillas por toolchain y
resolucion de problemas: `reference.md`.

Reglas al tocarlo:

- Anadir una puerta o hacerla mas estricta: se puede en cualquier momento; el propio cambio del
  manifiesto pasa el gauntlet.
- **Anadir una puerta es anadir su canario**: una puerta que nunca ha fallado no esta demostrada.
  Antes de darla por buena, provoca el fallo que debe detectar y comprueba que se pone en ROJO.
- Relajar, desactivar o eliminar una puerta: solo con peticion explicita del usuario, con
  `disabled_reason` escrito, y en un commit separado del cambio funcional. La puerta `enforcement`
  avisa cuando una puerta presente en HEAD desaparece o pasa a `enabled: false`.
- El `when` de una puerta comprueba que **el proyecto la declara** (script, seccion de configuracion,
  fichero de manifiesto), no que la herramienta este instalada. Herramienta ausente = FAIL = entorno que
  arreglar o `NO VERIFICADO` declarado, nunca un SKIP silencioso.
- Las puertas de contrato (`node:scripts-contract` y equivalentes) existen para que ninguna puerta
  desaparezca en silencio: si anades una puerta que depende de un script, anadelo al contrato.

## 9. Por que no se puede olvidar

Siete automatismos sostienen la regla sin que nadie la invoque:

| Automatismo | Efecto |
|---|---|
| `SessionStart` | Engancha el hook de git, instala dependencias en remoto y reinyecta la regla, el estado de la meta y las puertas |
| `UserPromptSubmit` | Recuerda en cada turno la confirmacion obligatoria, el comando de cierre y el primer item activo |
| `Stop` (gauntlet) | **Bloquea el cierre del turno** si hay cambios sin una pasada verde, completa, del perfil exigido y posterior al ultimo cambio; cota por progreso, no por cortesia |
| `Stop` (continuidad) | **Bloquea el cierre del turno** mientras el ledger tenga items activos o la meta no este alcanzada (skill `continuidad`) |
| `PreToolUse` | Pide confirmacion humana ante cualquier escritura en el repositorio de reglas o en la maquinaria del loop |
| `pre-commit` | Aborta el commit si el perfil `fast` sale en rojo |
| Puertas `enforcement` y `ledger` | Ponen el gauntlet en rojo si un hook desaparece, pierde el bit de ejecucion, deja de estar registrado, `core.hooksPath` se desengancha, el estado local deja de ignorarse, o el ledger y la carta no son fiables |

Si el hook `Stop` te bloquea, no lo rodees: ejecuta el gauntlet, o escala al usuario explicando por
que no puedes dejarlo en verde. El guard deja pasar tras dos bloqueos sin ningun cambio ni pasada
nueva, con un `ESCALADO` explicito: que te deje no significa que la regla se haya cumplido.
