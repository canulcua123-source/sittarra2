---
description: Plan de Implementación Mesa Feliz - Sistema Completo
---

# 📋 PLAN DE IMPLEMENTACIÓN MESA FELIZ

## 🎯 Estado Actual del Sistema

### ✅ Ya Implementado
- [x] Autenticación de clientes y admins
- [x] Gestión de Menú Digital (Admin)
- [x] Vista de restaurantes (lista básica)
- [x] Perfil público de restaurante
- [x] Dashboard admin (estructura base)
- [x] Base de datos Supabase configurada

### ⚠️ Parcialmente Implementado
- [ ] Flujo de reserva (falta selección visual de mesas)
- [ ] Gestión de reservas (falta estados completos)
- [ ] Sistema de calificaciones (falta modal post-visita)

### ❌ Por Implementar
- [ ] Mapa visual de mesas (cliente y admin)
- [ ] Sistema de anticipos/pagos
- [ ] Área de Staff
- [ ] Gestión de ofertas y promociones
- [ ] Galería de fotos
- [ ] Sistema de permisos

---

## 📦 FASE 1: FLUJO DE RESERVA COMPLETO (CRÍTICO)
**Prioridad: ALTA | Tiempo estimado: 1 sesión**

### 1.1 Selección de Mesa Visual
**Archivos a crear/modificar:**
- `src/pages/ReservationPage.tsx` - Rediseñar completamente
- `src/components/TableMap.tsx` - Nuevo componente de mapa
- `src/components/TableSelector.tsx` - Selector visual de mesas

**Funcionalidad:**
- Vista de mapa interactivo tipo cine
- Colores por estado (verde=disponible, rojo=ocupada, amarillo=pendiente)
- Solo permitir selección de mesas disponibles
- Filtrar por capacidad según número de personas

**Backend necesario:**
- `GET /api/restaurants/:id/tables/available` - Mesas disponibles por fecha/hora
- `POST /api/reservations/check-availability` - Verificar disponibilidad

### 1.2 Detalles de Reserva
**Archivos:**
- `src/components/reservation/ReservationDetails.tsx`
- `src/components/reservation/SpecialOccasions.tsx`

**Campos:**
- Nombre, teléfono, email
- Ocasión especial (dropdown)
- Comentarios especiales
- Mostrar si requiere anticipo

### 1.3 Sistema de Anticipos
**Archivos:**
- `src/pages/PaymentPage.tsx` - Ya existe, mejorar
- `src/components/payment/DepositPayment.tsx`
- `backend/src/routes/payments.ts` - Nuevo

**Funcionalidad:**
- Calcular anticipo según configuración del restaurante
- Integración con Stripe/PayPal
- Política de no-show visible
- Guardar estado de pago en reserva

### 1.4 Confirmación y Mis Reservas
**Archivos:**
- `src/pages/MyReservationsPage.tsx` - Mejorar
- `src/components/reservation/ReservationCard.tsx`
- `src/components/reservation/StatusBadge.tsx`

**Estados a mostrar:**
- Pendiente (amarillo)
- Confirmada (verde)
- Cancelada (gris)
- Completada (azul)
- No-show (rojo)

---

## 📦 FASE 2: GESTIÓN ADMIN COMPLETA
**Prioridad: ALTA | Tiempo estimado: 1 sesión**

### 2.1 Dashboard Mejorado
**Archivos:**
- `src/pages/admin/RestaurantDashboard.tsx` - Mejorar
- `src/components/admin/MetricsCards.tsx`
- `src/components/admin/ReservationsToday.tsx`
- `src/components/admin/RevenueChart.tsx`

**Métricas:**
- Reservas del día (pendientes, confirmadas, completadas)
- Ingresos por anticipos (hoy, semana, mes)
- Tasa de ocupación actual
- Calificación promedio
- Tasa de no-show

### 2.2 Gestión de Reservas
**Archivos:**
- `src/pages/admin/ReservationsManagementPage.tsx` - Mejorar
- `src/components/admin/ReservationTable.tsx`
- `src/components/admin/ReservationActions.tsx`

**Acciones:**
- Aceptar/Rechazar reserva pendiente
- Reasignar mesa
- Cambiar estado manualmente
- Enviar recordatorio
- Marcar como no-show
- Filtros por fecha, estado, mesa

### 2.3 Editor de Mapa de Mesas
**Archivos:**
- `src/pages/admin/TableMapEditor.tsx` - Nuevo
- `src/components/admin/DraggableTable.tsx`
- `src/components/admin/TableProperties.tsx`

**Funcionalidad:**
- Arrastrar y soltar mesas
- Definir posición X, Y
- Editar capacidad
- Cambiar forma (cuadrada, redonda, rectangular)
- Guardar layout en BD
- Preview de cómo se ve en cliente

### 2.4 Mapa Operativo (Tiempo Real)
**Archivos:**
- `src/pages/admin/TableMapOperativePage.tsx` - Mejorar

**Estados en tiempo real:**
- Disponible → Reservada (al confirmar)
- Reservada → Ocupada (al llegar cliente)
- Ocupada → Disponible (al liberar)
- Cualquier estado → Bloqueada (mantenimiento)

---

## 📦 FASE 3: SISTEMA DE STAFF
**Prioridad: MEDIA | Tiempo estimado: 1 sesión**

### 3.1 Rutas y Autenticación
**Archivos:**
- `src/contexts/StaffAuthContext.tsx` - Nuevo
- `src/pages/staff/*` - Nuevo directorio
- `backend/src/middleware/staffAuth.ts` - Nuevo

**Rutas:**
- `/staff/login`
- `/staff/reservas`
- `/staff/mesas`

### 3.2 Vista de Reservas (Staff)
**Archivos:**
- `src/pages/staff/ReservationsPage.tsx`
- `src/components/staff/ReservationList.tsx`

**Permisos:**
- Ver reservas del día
- Marcar llegada de cliente
- Ver detalles básicos
- NO puede crear/cancelar

### 3.3 Mapa de Mesas (Staff)
**Archivos:**
- `src/pages/staff/TableMapPage.tsx`

**Permisos:**
- Cambiar estado: ocupada ↔ disponible
- Ver información de reserva
- NO puede editar layout
- NO puede bloquear mesas

---

## 📦 FASE 4: MEJORAS DE CLIENTE
**Prioridad: MEDIA | Tiempo estimado: 1 sesión**

### 4.1 Home Mejorado
**Archivos:**
- `src/pages/Index.tsx` - Mejorar
- `src/components/RestaurantGrid.tsx`
- `src/components/SearchFilters.tsx`

**Mejoras:**
- Buscador potente (nombre, tipo de comida, zona)
- Filtros avanzados
- Ordenar por: calificación, precio, distancia
- Destacados
- Ofertas activas

### 4.2 Perfil de Restaurante Completo
**Archivos:**
- `src/pages/RestaurantProfilePage.tsx` - Mejorar
- `src/components/restaurant/PhotoGallery.tsx`
- `src/components/restaurant/ReviewsList.tsx`
- `src/components/restaurant/OffersSection.tsx`

**Secciones:**
- Galería de fotos (carrusel)
- Información detallada
- Ofertas activas
- Menú completo
- Opiniones con respuestas
- Botón fijo "Reservar mesa"

### 4.3 Modal de Calificación Post-Visita
**Archivos:**
- `src/components/rating/RatingModal.tsx` - Nuevo
- `src/hooks/usePostVisitRating.ts` - Nuevo

**Trigger:**
- Automático 2 horas después de hora de reserva
- Si estado = "completada"

**Contenido:**
- Calificación general (1-5 estrellas)
- Calificaciones específicas:
  - Comida
  - Servicio
  - Ambiente
  - Relación calidad-precio
- Comentario opcional
- Subir fotos (opcional)
- Tags predefinidos (ej: "Romántico", "Familiar", "Ruidoso")

---

## 📦 FASE 5: GESTIÓN DE OFERTAS Y CONTENIDO
**Prioridad: BAJA | Tiempo estimado: 1 sesión**

### 5.1 Ofertas y Promociones
**Archivos:**
- `src/pages/admin/OffersManagementPage.tsx` - Mejorar
- `backend/src/routes/offers.ts` - Mejorar

**Funcionalidad:**
- Crear oferta manual
- Título, descripción, descuento
- Días/horarios de aplicación
- Fecha de expiración
- Activar/desactivar
- Se muestra automáticamente en web pública

### 5.2 Galería de Fotos
**Archivos:**
- `src/pages/admin/PhotosPage.tsx` - Nuevo
- `src/components/admin/PhotoUploader.tsx`

**Funcionalidad:**
- Subir múltiples fotos
- Arrastrar para reordenar
- Definir foto principal
- Eliminar fotos
- Se actualiza en web pública automáticamente

---

## 📦 FASE 6: SISTEMA DE PERMISOS Y USUARIOS
**Prioridad: BAJA | Tiempo estimado: 1 sesión**

### 6.1 Gestión de Usuarios
**Archivos:**
- `src/pages/admin/UsersPage.tsx` - Nuevo
- `backend/src/routes/users.ts` - Nuevo

**Funcionalidad:**
- Crear usuario staff
- Asignar rol (admin, staff)
- Definir permisos específicos
- Activar/desactivar acceso
- Historial de actividad

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### Tablas a modificar:
```sql
-- Agregar campos a 'reservations'
ALTER TABLE reservations ADD COLUMN occasion VARCHAR(100);
ALTER TABLE reservations ADD COLUMN requires_deposit BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN deposit_status VARCHAR(20) DEFAULT 'pending';

-- Agregar campos a 'tables' para layout editor
ALTER TABLE tables ADD COLUMN shape VARCHAR(20) DEFAULT 'round';
ALTER TABLE tables ADD COLUMN color VARCHAR(20);

-- Nueva tabla para fotos
CREATE TABLE restaurant_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  url VARCHAR(500),
  is_primary BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nueva tabla para permisos
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  permission_key VARCHAR(50),
  granted BOOLEAN DEFAULT true
);
```

---

## 📱 ENDPOINTS DE API NUEVOS

### Reservas:
- `GET /api/restaurants/:id/tables/available?date=&time=&guests=`
- `POST /api/reservations/check-availability`
- `PATCH /api/reservations/:id/status`
- `POST /api/reservations/:id/reassign-table`

### Pagos:
- `POST /api/payments/create-deposit`
- `POST /api/payments/process`
- `GET /api/payments/status/:reservationId`

### Mesas:
- `PATCH /api/restaurants/:id/tables/layout` (guardar posiciones)
- `PATCH /api/tables/:id/status`

### Staff:
- `POST /api/auth/staff/login`
- `GET /api/staff/reservations/today`
- `PATCH /api/staff/tables/:id/status`

### Calificaciones:
- `POST /api/reviews`
- `POST /api/reviews/:id/photos`
- `POST /api/reviews/:id/response` (admin)

---

## ⚡ PRIORIDAD DE IMPLEMENTACIÓN

1. **CRÍTICO (Esta semana)**
   - Flujo de reserva con mapa visual
   - Gestión de reservas (admin)
   - Mapa operativo en tiempo real

2. **IMPORTANTE (Próxima semana)**
   - Sistema de anticipos
   - Dashboard mejorado
   - Modal de calificación

3. **DESEABLE (Mes 1)**
   - Sistema de staff
   - Editor de mapa de mesas
   - Gestión de ofertas

4. **FUTURO (Mes 2+)**
   - Galería de fotos
   - Sistema de permisos granular
   - Reportes avanzados

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. ✅ Confirmar prioridades con el equipo
2. 🔨 Comenzar Fase 1.1: Componente de mapa visual
3. 🔨 Implementar endpoint de disponibilidad
4. 🔨 Integrar selección de mesa en flujo de reserva
5. ✅ Testing del flujo completo

---

**Última actualización:** 2026-01-14
**Responsable:** Equipo Mesa Feliz
