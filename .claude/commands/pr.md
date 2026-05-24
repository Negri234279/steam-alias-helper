---
description: Commitea lo pendiente, sube la rama actual y abre un PR a main
argument-hint: [título opcional del PR]
allowed-tools: Bash(git:*), Bash(gh:*)
---

## Contexto

- Rama actual: !`git branch --show-current`
- Estado del working tree: !`git status --short`
- Commits por delante de main: !`git log --oneline main..HEAD`

## Tarea

Asegura que la rama actual está completamente subida a `origin` y abre un Pull
Request hacia `main`.

`$ARGUMENTS` (opcional): título deseado para el PR. Si está vacío, deriva el
título a partir de los commits de la rama.

Pasos:

1. **Rama.** Si la rama actual es `main`, detente y avisa de que hay que trabajar
   en una rama de feature. No hagas nada más.
2. **Commit.** Si el working tree tiene cambios sin commitear, haz `git add -A` y
   crea un commit con un mensaje estilo *conventional commit* que resuma el
   trabajo. Si no hay cambios pendientes, omite este paso.
3. **Push.** Sube la rama a `origin`. Si la rama no tiene upstream configurado,
   usa `git push -u origin <rama>`.
4. **Pull Request:**
   - Si el comando `gh` está disponible: crea el PR con `gh pr create --base main`,
     con un título claro y un cuerpo que incluya un resumen de los cambios y un
     breve plan de prueba, derivados de los commits de la rama. Si ya existe un PR
     abierto para esta rama, no crees otro: muestra su URL.
   - Si `gh` NO está disponible: obtén la URL del repo con
     `git remote get-url origin`, normalízala a formato `https` (sin `.git`) y
     construye la URL de comparación:
     `https://github.com/<owner>/<repo>/compare/main...<rama>?expand=1`
     Muéstrasela al usuario para que abra el PR desde el navegador.
5. **Salida.** Muestra al usuario la URL final del PR (o la de comparación).
