# 📊 Análisis MVP - Mesa Feliz
## Componentes Faltantes para Datos 100% Reales

---

## ✅ YA FUNCIONAL (Datos Reales)

### Backend API Endpoints
| Endpoint | Estado | Descripción |
|----------|--------|-------------|
| `/api/restaurants` | ✅ | CRUD restaurantes |
| `/api/reservations` | ✅ | Crear, listar, actualizar reservas |
| `/api/offers` | ✅ | CRUD ofertas |
| `/api/reviews` | ✅ | CRUD reseñas |
| `/api/admin/dashboard` | ✅ | Estadísticas del día |
| `/api/admin/reservas` | ✅ | Gestión de reservas admin |
| `/api/admin/mesas` | ✅ | CRUD mesas |
| `/api/auth` | ✅ | Login/registro restaurantes |
| `/api/verification` | ✅ | Verificación de email |
| `/api/geocode` | ✅ | Autocompletado direcciones |
| `/api/staff` | ✅ | Gestión de personal |
| `/api/upload` | ✅ | Subida de imágenes |

### Admin Panel
| Página | Estado | Observaciones |
|--------|--------|---------------|
| RestaurantDashboard | ✅ | Consume `/api/admin/dashboard` |
| ReservationsManagementPage | ✅ | Consume reservas reales |
| TableMapOperativePage | ✅ | CRUD mesas real |
| OffersManagementPage | ✅ | CRUD ofertas real |
| RestaurantLoginPage | ✅ | Auth funcional |
| RestaurantRegisterPage | ✅ | Con verificación email |

### Cliente
| Página | Estado | Observaciones |
|--------|--------|---------------|
| RestaurantsPage | ✅ | Lista restaurantes reales |
| RestaurantProfilePage | ⚠️ | Reviews: comentario "mock for now" |
| ReservationPage | ✅ | Crea reservas reales |
| OffersPage | ✅ | Consume ofertas reales |

---

## ❌ PENDIENTE - Mock Data a Eliminar

### 1. **ClientProfilePage.tsx** - Perfil de Usuario
```typescript
// Línea 25-26: Mock user data que necesita conectar a API
const mockUser = {
    name: 'María García',
    email: 'maria@example.com',
    ...
}
```
**Solución:** Consumir datos del usuario desde sesión/API

---

### 2. **AdminLayout.tsx** - Notificaciones
```typescript
// Línea 43: Mock de notificaciones
const mockNotifications = [
    { id: 1, type: 'reservation', message: '...', time: '...' }
]
```
**Solución:** Crear endpoint `/api/admin/notifications` o usar sistema en tiempo real

---

### 3. **RestaurantProfilePage.tsx** - Reseñas
```typescript
// Línea 25: Comentario indica "mock for now"
// Fetch reviews (mock for now)
```
**Solución:** Ya existe `/api/reviews` - solo necesita conectar

---

## 🔧 ENDPOINTS FALTANTES

### 1. Sistema de Usuarios/Clientes
Actualmente solo existe auth para restaurantes. Falta:

| Endpoint | Propósito |
|----------|-----------|
| `POST /api/auth/client/register` | Registro de clientes |
| `POST /api/auth/client/login` | Login de clientes |
| `GET /api/users/:id/profile` | Perfil del usuario |
| `PATCH /api/users/:id/profile` | Actualizar perfil |
| `GET /api/users/:id/reservations` | Historial de reservas |
| `GET /api/users/:id/favorites` | Restaurantes favoritos |

---

### 2. Sistema de Notificaciones
| Endpoint | Propósito |
|----------|-----------|
| `GET /api/admin/notifications` | Lista notificaciones |
| `PATCH /api/admin/notifications/:id/read` | Marcar como leída |
| `DELETE /api/admin/notifications/:id` | Eliminar notificación |

---

### 3. Sistema de Menú (MenuManagementPage)
| Endpoint | Propósito |
|----------|-----------|
| `GET /api/admin/menu` | Lista items del menú |
| `POST /api/admin/menu` | Crear item |
| `PATCH /api/admin/menu/:id` | Actualizar item |
| `DELETE /api/admin/menu/:id` | Eliminar item |
| `GET /api/restaurants/:id/menu` | Menú público |

---

### 4. Sistema de Reportes (ReportsPage)
| Endpoint | Propósito |
|----------|-----------|
| `GET /api/admin/reports/reservations` | Reporte de reservas |
| `GET /api/admin/reports/revenue` | Reporte de ingresos |
| `GET /api/admin/reports/reviews` | Reporte de reseñas |

---

### 5. Pagos (PaymentPage)
| Endpoint | Estado |
|----------|--------|
| Integración Stripe/MercadoPago | ❌ No implementado |

---

## 📋 PRIORIDADES MVP

### 🔴 Alta Prioridad
1. **Auth de Clientes** - Sin esto no hay sesión de usuario
2. **Conectar reseñas** en RestaurantProfilePage
3. **Eliminar mockUser** en ClientProfilePage

### 🟡 Media Prioridad  
4. **Notificaciones admin** - Mejora UX pero no bloquea
5. **Menú management** - Útil pero no esencial para reservas

### 🟢 Baja Prioridad
6. **Reportes avanzados** - Nice to have
7. **Sistema de pagos** - Puede ser manual inicialmente

---

## 🎯 RESUMEN

| Categoría | Listo | Pendiente |
|-----------|-------|-----------|
| Endpoints Backend | 85% | 15% |
| Admin Panel | 90% | 10% |
| Cliente Web | 75% | 25% |
| **Total MVP** | **~85%** | **~15%** |

### Para tener MVP 100% funcional:

1. ✅ Crear auth de clientes (register/login)
2. ✅ Conectar ClientProfilePage a API
3. ✅ Conectar reviews en RestaurantProfilePage
4. ✅ Crear endpoint notificaciones o remover mock
5. ✅ Endpoint de menú (si se usa MenuManagementPage)
