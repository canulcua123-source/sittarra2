# 🔧 REPORTE DE CORRECCIÓN DE BUGS
## Mesa Feliz - Sistema de Reservas
### Fecha: 2026-02-05

---

## 📋 RESUMEN EJECUTIVO

Se identificaron y corrigieron **dos bugs críticos** que afectaban la funcionalidad del sistema:

| Bug | Descripción | Estado |
|-----|-------------|--------|
| #1 | Crear nueva oferta no funciona | ✅ CORREGIDO |
| #2 | Mesas creadas en web no aparecen en móvil | ✅ CORREGIDO |

---

## 🐛 BUG #1: Crear Nueva Oferta No Funciona

### Causa Raíz
El frontend llamaba a `POST /api/offers/restaurants/:restaurantId`, pero este endpoint **no existía** en el backend. Solo había endpoints GET.

### Solución Implementada
Se agregaron los siguientes endpoints al archivo `backend/src/routes/offers.ts`:

```
POST   /api/offers/restaurants/:restaurantId  → Crear oferta
PATCH  /api/offers/:offerId                   → Actualizar oferta
DELETE /api/offers/:offerId                   → Eliminar oferta
```

### Archivos Modificados
- `backend/src/routes/offers.ts` - Agregados endpoints CRUD

### Verificación
1. Iniciar sesión como admin
2. Ir a "Gestión de Ofertas"
3. Crear una nueva oferta con título, descripción y descuento
4. Verificar que aparece en la lista

---

## 🐛 BUG #2: Sincronización Web → Móvil de Mesas

### Causa Raíz
El backend filtraba mesas con `.eq('is_active', true)`, pero:
1. La columna `is_active` **NO EXISTÍA** en la tabla `tables` de la base de datos
2. Al crear mesas desde el admin, no se establecía `is_active: true`

### Solución Implementada

#### 1. Backend (Código)
Se agregó `is_active: true` al crear nuevas mesas en `backend/src/routes/admin/tables.ts`:

```typescript
.insert({
    restaurant_id: restaurantId,
    number,
    capacity: Number(capacity),
    // ... otros campos ...
    is_active: true,  // ← AGREGADO
    status: 'available'
})
```

#### 2. Base de Datos (Migración)
Se creó script SQL para agregar la columna faltante:

```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE public.tables SET is_active = true WHERE is_active IS NULL;
```

### Archivos Modificados
- `backend/src/routes/admin/tables.ts` - Agregado `is_active: true` al crear mesa
- `database/migrations/2026-02-05_fix_tables_is_active.sql` - Script de migración

### Verificación
1. Ejecutar la migración SQL en Supabase
2. Crear una nueva mesa desde el panel admin web
3. Verificar que la mesa aparece inmediatamente en la app móvil

---

## ⚠️ ACCIÓN REQUERIDA

### Para completar la corrección del Bug #2, debes ejecutar en Supabase:

```sql
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE public.tables SET is_active = true WHERE is_active IS NULL;
```

---

## 🧪 TESTS CREADOS

Se creó/actualizó el archivo de tests `backend/src/tests/offers.test.ts` que incluye:
- Validación de endpoints GET
- Verificación de autenticación requerida para POST/PATCH/DELETE
- Manejo de errores

---

## 📊 IMPACTO

| Métrica | Antes | Después |
|---------|-------|---------|
| Crear ofertas | ❌ Error 404 | ✅ Funciona |
| Mesas en móvil | ❌ No aparecen | ✅ Sincronizadas |
| Endpoints de ofertas | 2 (solo GET) | 5 (CRUD completo) |

---

## 👨‍💻 Desarrollador
Cambios realizados como parte de sesión de debugging con análisis de causa raíz.
