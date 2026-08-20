# Development Workflow

Guia para trabajar en este frontend con branches pequenos, commits profesionales y validacion local antes de subir cambios.

## Estrategia De Branches

Usar branches con prefijo segun el tipo de trabajo:

```text
chore/*
feature/*
fix/*
test/*
docs/*
```

Uso recomendado:

- `chore/*`: configuracion, scaffolding, dependencias, ajustes de tooling.
- `feature/*`: funcionalidad nueva.
- `fix/*`: correcciones de bugs.
- `test/*`: cobertura de pruebas.
- `docs/*`: documentacion.

Primeros branches sugeridos:

```text
chore/scaffold-react-frontend
chore/frontend-docs
feat/auth-login
feat/app-shell
feat/dashboard-summary
feat/students-list
```

Si el filesystem del volumen externo falla con branches que usan `/`, usar nombres planos equivalentes:

```text
chore-scaffold-react-frontend
docs-frontend-docs
feat-auth-login
```

## Reglas De Commits

Formato recomendado:

```text
type(scope): message
```

El scope es opcional si el cambio es general.

Ejemplos:

```text
chore: scaffold react frontend
feat(auth): add login page
feat(dashboard): connect dashboard summary
fix(api): handle expired token
test(auth): add login form tests
docs: add frontend workflow
```

Reglas practicas:

- Un commit debe tener una intencion clara.
- No mezclar docs, features y fixes en el mismo commit si se pueden separar.
- No commitear archivos generados innecesarios.
- No commitear `.env.local` ni secretos reales.
- Revisar `git status --short` antes de commitear.
- Los commits quedan firmados unicamente por el autor git configurado (JoseMunozO). No agregar trailers de coautoria de IA (`Co-Authored-By: Claude ...`) en ningun commit, sea cambio grande o fix chico.

## Branch Por Cambio

- Cualquier modificacion o cosa nueva se hace en un branch dedicado: uno nuevo (segun la convencion de prefijos de arriba) o uno existente que ya corresponda al mismo trabajo en curso.
- No commitear directo sobre `main` ni mezclar trabajo de distinta intencion en un branch que no le corresponde.

## Checklist Antes De Cada Commit

Ejecutar:

```bash
npm run lint
npm run build
git status --short
```

Confirmar:

- No subir `.env.local`.
- No subir credenciales, tokens o secretos.
- No subir archivos `._*`.
- No subir cambios ajenos a la tarea.
- El commit corresponde al branch actual.

## Flujo Recomendado

1. Crear branch desde `main`.
2. Hacer cambios pequenos.
3. Ejecutar lint y build.
4. Revisar `git diff`.
5. Crear commit claro.
6. Subir branch y abrir PR.
7. Esperar CI verde antes de merge.
