---
description: Flujo de trabajo con Git Branches para desarrollo seguro
---

# 🌿 Git Workflow - Trabajo con Ramas

## Estrategia de Branches

```
main (producción)
  ├── develop (desarrollo)
  │   ├── feature/database-optimization
  │   ├── feature/waitlist-public
  │   ├── feature/notifications
  │   └── bugfix/reservation-time
```

---

## 📋 Comandos Principales

### 1. Ver ramas actuales
```bash
git branch -a
```

### 2. Crear nueva rama para feature
```bash
# Sintaxis: feature/nombre-descriptivo
git checkout -b feature/database-optimization
```

### 3. Ver en qué rama estás
```bash
git branch
# La rama actual tiene un asterisco *
```

### 4. Cambiar entre ramas
```bash
git checkout main           # Ir a main
git checkout develop        # Ir a develop
git checkout feature/xyz    # Ir a feature
```

### 5. Hacer commits en tu rama
```bash
git add .
git commit -m "feat: optimizar base de datos eliminando tablas innecesarias"
git push origin feature/database-optimization
```

### 6. Fusionar rama a main (cuando esté lista)
```bash
# Opción A: Merge local
git checkout main
git merge feature/database-optimization
git push origin main

# Opción B: Pull Request en GitHub (RECOMENDADO)
# 1. Pushear la rama
# 2. Ir a GitHub
# 3. Crear Pull Request
# 4. Revisar cambios
# 5. Merge desde GitHub
```

### 7. Eliminar rama después de merge
```bash
# Local
git branch -d feature/database-optimization

# Remoto
git push origin --delete feature/database-optimization
```

---

## 🚀 Workflow Recomendado para IA

### Cuando IA hace cambios:

**ANTES de empezar:**
```bash
# Crear rama específica para los cambios de IA
git checkout -b feature/ai-changes-$(date +%Y%m%d)
```

**Durante desarrollo:**
- IA hace todos los cambios en esta rama
- Puedes probar sin miedo
- Si algo falla, simplemente descartas la rama

**DESPUÉS de verificar:**
```bash
# Si todo funciona bien
git checkout main
git merge feature/ai-changes-20260126

# Si algo salió mal
git checkout main
git branch -D feature/ai-changes-20260126  # Elimina la rama
```

---

## 🎯 Convención de Nombres

```bash
feature/nombre-feature     # Nueva funcionalidad
bugfix/nombre-bug          # Corrección de bug
hotfix/nombre-urgente      # Arreglo urgente
refactor/nombre-refactor   # Refactorización
chore/nombre-tarea         # Tareas de mantenimiento
```

**Ejemplos:**
```bash
feature/database-optimization
feature/waitlist-public-endpoints
feature/notifications-system
bugfix/reservation-duplicate
refactor/menu-items-structure
```

---

## ⚠️ Reglas de Oro

1. **NUNCA** hacer cambios directamente en `main`
2. **SIEMPRE** crear una rama para nuevos cambios
3. **PROBAR** en la rama antes de merge
4. **HACER COMMIT** frecuentemente con mensajes descriptivos
5. **PULL** antes de empezar a trabajar

---

## 🔄 Flujo Diario

```bash
# 1. Actualizar main
git checkout main
git pull origin main

# 2. Crear rama para hoy
git checkout -b feature/todays-work

# 3. IA hace cambios...
# (archivos se modifican)

# 4. Commit frecuente
git add .
git commit -m "feat: agregar endpoints de waitlist público"

# 5. Push a GitHub
git push origin feature/todays-work

# 6. Si todo funciona bien, merge
git checkout main
git merge feature/todays-work
git push origin main

# 7. Limpiar rama
git branch -d feature/todays-work
```

---

## 🛡️ Protección contra Errores de IA

### Si IA rompe algo:

```bash
# Ver qué cambió
git diff

# Descartar cambio específico
git checkout -- archivo.ts

# Descartar TODOS los cambios (volver a último commit)
git reset --hard HEAD

# Volver a commit anterior
git reset --hard HEAD~1

# Eliminar rama completa y empezar de nuevo
git checkout main
git branch -D feature/rama-problematica
```

---

## 📊 Ver Historia

```bash
# Ver commits recientes
git log --oneline --graph --all

# Ver cambios de un commit específico
git show <commit-hash>

# Ver diferencias entre ramas
git diff main..feature/database-optimization
```

---

## 🎨 Commits Semánticos

Usar prefijos para claridad:

```bash
git commit -m "feat: agregar sistema de notificaciones"
git commit -m "fix: corregir bug en reservas duplicadas"
git commit -m "refactor: optimizar consultas de base de datos"
git commit -m "docs: actualizar documentación de API"
git commit -m "chore: eliminar tablas innecesarias"
git commit -m "test: agregar tests para waitlist"
```

**Prefijos:**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `refactor:` Refactorización de código
- `docs:` Documentación
- `test:` Tests
- `chore:` Tareas de mantenimiento
- `style:` Formato de código
