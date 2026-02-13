# 🔍 AUDITORÍA TÉCNICA — SITTARA WEB APPLICATION

> **Fecha:** Febrero 2026  
> **Alcance:** Backend API, Frontend Web (Client + Dashboard Admin), Integración, Seguridad  
> **Objetivo:** Identificar errores, inconsistencias y riesgos técnicos sin proponer soluciones  
> **Archivos Revisados:** ~30 archivos críticos en frontend y backend

---

## ÍNDICE

1. [🚨 Errores Críticos (Producción en Riesgo)](#1--errores-críticos-producción-en-riesgo)
2. [⚠️ Inconsistencias Frontend ↔ Backend](#2-️-inconsistencias-frontend--backend)
3. [🔐 Hallazgos de Seguridad](#3--hallazgos-de-seguridad)
4. [🪲 Errores de Lógica y Datos](#4--errores-de-lógica-y-datos)
5. [🔇 Error Handling Deficiente](#5--error-handling-deficiente)
6. [📡 Endpoints Fantasma (Frontend llama, Backend no tiene)](#6--endpoints-fantasma-frontend-llama-backend-no-tiene)
7. [🔄 Token Management y Autenticación](#7--token-management-y-autenticación)
8. [🏗 Inconsistencias Estructurales](#8--inconsistencias-estructurales)
9. [📊 Resumen de Severidad](#9--resumen-de-severidad)

---

## 1. 🚨 Errores Críticos (Producción en Riesgo)

### 1.1 — `StaffAuthContext` apunta a puerto incorrecto
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/contexts/StaffAuthContext.tsx:3` |
| **Problema** | `API_BASE_URL` hardcodeada a `http://localhost:3001/api` |
| **Impacto** | TODAS las llamadas del módulo Staff (login, reservas, mesas) fallan en producción |
| **Contexto** | Los otros dos contextos (`AuthContext`, `RestaurantAuthContext`) importan correctamente desde `@/services/api` donde el valor es `http://localhost:3002/api` o `VITE_API_URL` |

```typescript
// StaffAuthContext.tsx — LINE 3
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // ← Puerto 3001 ≠ 3002
```

> **Severidad:** 🔴 CRÍTICA — Staff no puede iniciar sesión si el backend está en puerto 3002.

---

### 1.2 — Endpoints `/auth/logout` y `/auth/me` no existen en el backend
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:1307-1324` — `authService.logout()` y `authService.getCurrentUser()` |
| **Backend** | `routes/auth.ts` — NO tiene rutas `POST /auth/logout` ni `GET /auth/me` |
| **Impacto** | `logout()` falla silenciosamente (fetch a ruta inexistente). `getCurrentUser()` siempre retorna `null` |

```typescript
// Frontend api.ts — Llama a endpoints que NO existen
async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' }); // ← 404
},
async getCurrentUser(): Promise<User | null> {
    const response = await fetch(`${API_BASE_URL}/auth/me`);       // ← 404
}
```

> El backend tiene `/auth/verify` (GET con token), pero el frontend no lo usa para revalidar sesiones.

---

### 1.3 — `optionalAuthMiddleware` no soporta JWT custom
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/middleware/auth.ts:177-212` |
| **Problema** | Solo intenta `supabase.auth.getUser(token)`, nunca `jwt.verify()` |
| **Contraste** | `authMiddleware` (línea 21-89) SÍ intenta JWT custom primero, luego Supabase |
| **Impacto** | En rutas como `GET /restaurants` (que usa `optionalAuthMiddleware`), el usuario autenticado con JWT custom NUNCA es detectado, por lo que funcionalidades como "mostrar favoritos en la lista" no funcionan |

```typescript
// optionalAuthMiddleware — Solo intenta Supabase, IGNORA JWT custom
export async function optionalAuthMiddleware(...) {
    const { data: { user } } = await supabase.auth.getUser(token); // ← Solo esto
    // FALTA: jwt.verify(token, env.jwtSecret) como en authMiddleware
}
```

---

### 1.4 — `restaurantOwnerMiddleware` usa `supabase` en vez de `supabaseAdmin`
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/middleware/auth.ts:148-152` |
| **Problema** | Usa `supabase` (cliente con RLS) en vez de `supabaseAdmin` |
| **Impacto** | Si RLS está configurado restrictivamente, la query `from('restaurants').select('id, owner_id')` puede retornar vacío, bloqueando incluso a dueños legítimos |
| **Contraste** | `staffRestaurantMiddleware` (línea 274-287) también usa `supabase` con el mismo riesgo |

---

## 2. ⚠️ Inconsistencias Frontend ↔ Backend

### 2.1 — API comment dice puerto 3001, código dice 3002
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:6` |
| **Problema** | Comentario dice `http://localhost:3001`, pero `API_BASE_URL` es `http://localhost:3002/api` |
| **Impacto** | Confusión para desarrolladores. Si alguien "corrige" basándose en el comentario, rompe todo |

```typescript
// api.ts — LINE 5-6
 * Connects to the real backend API at http://localhost:3001  // ← Comentario INCORRECTO
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'; // ← Real
```

---

### 2.2 — `reservationService.getByUser()` ignora el parámetro `userId`
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:484-489` — Recibe `userId` pero nunca lo usa |
| **Backend** | `GET /reservations/my` extrae el user del JWT (`req.user!.id`) |
| **Impacto** | El parámetro `userId` en la firma es engañoso. Si algún componente pasa un userId diferente esperando datos de otro usuario, recibirá los datos del usuario logueado |

```typescript
// Frontend — userId es completamente ignorado
async getByUser(userId: string): Promise<Reservation[]> {
    const data = await apiCall<any>('/reservations/my', { method: 'GET' });
    // ^ userId nunca se envía al backend
}
```

---

### 2.3 — `getByRestaurant()` llama a endpoint no protegido por admin
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:491-516` — `reservationService.getByRestaurant()` llama `GET /restaurants/{id}/reservations` |
| **Backend** | `routes/restaurants.ts` — Este endpoint NO existe en el archivo de rutas públicas |
| **Impacto** | La llamada retorna 404. El endpoint real está en `GET /admin/reservas/` (admin index router) |

---

### 2.4 — `dashboardService.getAISuggestions()` usa ruta con redirect
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:1143` — Llama a `GET /admin/ai-suggestions` |
| **Backend** | `admin/index.ts:48` — Esta ruta hace un `redirect(307, './ia/suggestions')` |
| **Impacto** | Funciona técnicamente, pero el redirect 307 puede causar problemas con CORS en producción. La ruta directa sería `/admin/ia/suggestions` |

---

### 2.5 — Doble ejecución de token parsing en cada request
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:36-83` |
| **Problema** | `apiCall()` parsea `localStorage.getItem('mesafeliz_restaurant_session')` hasta 3 veces por llamada (líneas 44, 62, 76) |
| **Impacto** | Ineficiencia menor, pero 3 `JSON.parse()` por request en JSON potencialmente grande es innecesario |

---

### 2.6 — `reviewService.create()` envía datos crudos sin transformar
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:965-974` — `reviewService.create()` envía `review` tal cual, sin mapear camelCase → snake_case |
| **Backend** | `routes/reviews.ts` — Espera campos como `restaurant_id`, `food_rating`, etc. |
| **Impacto** | Los campos `restaurantId`, `foodRating`, `serviceRating`, etc. del frontend NO coinciden con lo que espera el backend |

```typescript
// Frontend — Envía sin transformar
async create(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const data = await apiCall<any>('/reviews', {
        method: 'POST',
        body: JSON.stringify(review), // ← camelCase sin mapear a snake_case
    });
}
```

---

### 2.7 — `waitlistService.add()` usa endpoint admin para operación pública
| Detalle | |
|---------|---|
| **Frontend** | `api.ts:1034` — `POST /admin/waitlist` (requiere auth admin) |
| **Backend** | `routes/waitlist.ts` tiene `POST /` (público, sin auth para clientes walk-in) |
| **Impacto** | Un cliente walk-in NO puede unirse a la waitlist desde el frontend público, ya que la llamada exige token admin |

---

## 3. 🔐 Hallazgos de Seguridad

### 3.1 — No hay validación de token JWT expirado en el frontend
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/contexts/AuthContext.tsx:25-36`, `RestaurantAuthContext.tsx:26-38` |
| **Problema** | Al montar, ambos contextos leen de `localStorage` y confían ciegamente en los datos guardados sin verificar expiración del token |
| **Impacto** | Un usuario puede usar la app con token expirado. Las requests fallarán con 401, pero el frontend mostrará al usuario como "autenticado" |

```typescript
// AuthContext.tsx — No verifica expiración
useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
        setUser(JSON.parse(savedUser)); // ← Confía ciegamente, sin verificar token
    }
    setIsLoading(false);
}, []);
```

---

### 3.2 — Cancellation endpoint usa `supabase` (con RLS) inconsistentemente
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/reservations.ts:465, 510-519` |
| **Problema** | `POST /:id/cancel` — El fetch de la reservación usa `supabase` (RLS activo), pero la actualización también usa `supabase` |
| **Contraste** | `PATCH /:id/status` (línea 369) usa `supabaseAdmin` para el fetch |
| **Impacto** | Si RLS bloquea la lectura para admins que no son el user_id de la reservación, la cancelación por admin falla con "Reservation not found" en lugar de "forbidden" |

---

### 3.3 — Token incluido en `X-Restaurant-Id` header sin validación frontend
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:74-83` |
| **Problema** | El header `X-Restaurant-Id` se extrae del JSON almacenado en localStorage sin sanitización |
| **Impacto** | Si un atacante manipula `mesafeliz_restaurant_session` en localStorage, puede inyectar un `restaurantId` de otro restaurante. El backend SÍ valida esto en `authenticateAdmin`, pero las rutas públicas que usen este header podrían ser afectadas |

---

### 3.4 — `PATCH /auth/profile` no usa `authMiddleware`
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/auth.ts:473-525` |
| **Problema** | Implementa su propia verificación de JWT en lugar de usar `authMiddleware` |
| **Impacto** | Duplicación de lógica de autenticación. Si se actualiza `authMiddleware` (e.g., agregar blacklisting de tokens), esta ruta queda sin actualizar |

---

### 3.5 — `verification/request` permite spam de emails
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/auth.ts:637-661` |
| **Problema** | `POST /auth/verification/request` no tiene rate limiting específico ni requiere autenticación |
| **Impacto** | Un atacante puede enviar códigos de verificación ilimitados a cualquier email registrado |

---

## 4. 🪲 Errores de Lógica y Datos

### 4.1 — Table status se setea a "occupied" en confirmación (no en llegada)
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/reservations.ts:416-419` |
| **Problema** | Cuando una reservación se confirma (`status: 'confirmed'`), la mesa se marca como `occupied` |
| **Lógica correcta** | Una reservación confirmada debería marcar la mesa como `reserved`, no `occupied`. `occupied` debería ser solo para `arrived` |
| **Impacto** | Una mesa confirmada para las 8pm aparece como "ocupada" desde la confirmación (posiblemente horas antes), bloqueando otras reservaciones |

```typescript
case 'confirmed':
    tableStatus = 'occupied'; // ← Debería ser 'reserved'
    break;
case 'arrived':
    tableStatus = 'occupied'; // ← Esto sí es correcto
    break;
```

---

### 4.2 — `transformRestaurant` retorna objeto vacío en lugar de `null`
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:114` |
| **Problema** | `if (!data) return {} as Restaurant;` — Retorna un objeto vacío tipeado como `Restaurant` |
| **Impacto** | Componentes que hacen `if (restaurant)` recibirán `true` para un objeto vacío, mostrando UI con datos indefinidos en lugar de un estado de error |

---

### 4.3 — Reservation creation fija `status: 'pending'` pero table se pone `'pending'`
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/reservations.ts:85, 106-109` |
| **Problema** | Si `depositPaid` es true, la reservación se crea como `confirmed`, pero la mesa SIEMPRE se marca como `pending` |
| **Impacto** | Inconsistencia: una reservación ya confirmada (con depósito pagado) tiene su mesa en estado `pending` |

---

### 4.4 — `cancelReservation` modifica `special_request` como log
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/reservations.ts:513-516` |
| **Problema** | El motivo de cancelación se escribe dentro del campo `special_request` del cliente |
| **Impacto** | Si la reservación se repite, el motivo de cancelación anterior se arrastra como "solicitud especial" |

```typescript
special_request: reservation.special_request
    ? `${reservation.special_request}\n\n[Cancelled: ${reason || 'No reason provided'}]`
    : `[Cancelled: ${reason || 'No reason provided'}]`,
```

---

### 4.5 — Reservación repetida no verifica que la mesa siga existiendo
| Detalle | |
|---------|---|
| **Archivo** | `backend/src/routes/reservations.ts:231-298` |
| **Problema** | `POST /repeat/:id` copia `table_id` de la original sin verificar que la mesa siga activa o capacity siga siendo adecuada |
| **Impacto** | Si la mesa fue eliminada o deshabilitada, la nueva reservación se crea apuntando a una mesa inexistente |

---

## 5. 🔇 Error Handling Deficiente

### 5.1 — `loginCustomer()` retorna `null` en vez de propagar el error
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:1253-1266` |
| **Problema** | Si la API retorna un error con mensaje (ej: "Cuenta bloqueada"), se pierde y retorna `null` |
| **Impacto** | El usuario ve "Credenciales inválidas" (mensaje genérico de `AuthContext.tsx:49`) sin importar el error real |

---

### 5.2 — `offerService.getAll()` y `getByRestaurant()` tragan errores
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:640-660` |
| **Problema** | Si `json.success` es false, retorna `[]` sin lanzar error ni loguear |
| **Impacto** | Si hay un error de servidor (500), la UI muestra "No hay ofertas" en lugar de un error |

---

### 5.3 — `reservationService.getByRestaurant()` retorna `[]` en error
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:511-513` |
| **Problema** | Un 500 del servidor se muestra como "No hay reservaciones" |
| **Impacto** | El administrador pierde visibilidad de reservaciones reales durante fallas del backend |

---

### 5.4 — `waitlistService.remove()` no verifica respuesta
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:1070-1079` |
| **Problema** | `DELETE /admin/waitlist/:id` no parsea ni verifica la respuesta |
| **Impacto** | Si el DELETE falla (403, 404, 500), el frontend no se entera y la UI puede quedar desincronizada |

---

## 6. 📡 Endpoints Fantasma (Frontend llama, Backend no tiene)

| # | Frontend llama a | Existe en Backend | Estado |
|---|---|---|---|
| 1 | `POST /auth/logout` | ❌ No | Error silencioso (404) |
| 2 | `GET /auth/me` | ❌ No (`/auth/verify` existe pero no se usa) | Siempre retorna `null` |
| 3 | `GET /restaurants/:id/reservations` | ❌ No (está en `/admin/reservas/`) | 404 — Admin reservas no funciona vía esta ruta |
| 4 | `GET /restaurants/:id/reviews` | ⚠️ Parcial — Existe en `reviews.ts` como `GET /restaurant/:id` (singular) | Puede haber mismatch |

---

## 7. 🔄 Token Management y Autenticación

### 7.1 — Tres sistemas de token separados, NO interoperables
| Sistema | Storage Key | Usado por |
|---------|-------------|-----------|
| Customer | `mesafeliz_token` + `mesafeliz_user` | `AuthContext` |
| Restaurant Admin | `mesafeliz_restaurant_session` (JSON con token, user, restaurant) | `RestaurantAuthContext` |
| Staff | `staff_token` + `staff_user` + `staff_restaurant` | `StaffAuthContext` |

**Problema:** Los tres contextos se montan SIMULTÁNEAMENTE en `App.tsx` (líneas 55-57), lo que significa que las tres sesiones coexisten sin coordinación. Si un admin inicia sesión como customer, el token de customer puede interferir con operaciones admin.

### 7.2 — `apiCall()` tiene lógica de selección de token frágil
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/services/api.ts:36-70` |
| **Problema** | La decisión de cuál token usar se basa en si el endpoint contiene `/restaurants/`, `/offers/`, o `/admin/` Y el método es mutador |
| **Impacto** | `GET /admin/dashboard` NO se considera operación admin (no es POST/PATCH/PUT/DELETE), por lo que usa token de customer en lugar del token admin |

```typescript
// Esta condición EXCLUYE GET requests a rutas admin
const isAdminOperation = (endpoint.includes('/admin/')) &&
    (options?.method === 'POST' || options?.method === 'PATCH' || ...);  // ← GET no está
```

> Sin embargo, las funciones de dashboard/settings usan `fetch()` directo con manejo manual de token, evitando este bug por accidente.

---

## 8. 🏗 Inconsistencias Estructurales

### 8.1 — Mezcla de `fetch()` directo y `apiCall()` wrapper
| Patrón | Archivos que lo usan |
|--------|---------------------|
| `apiCall()` | `reservationService.create()`, `cancel()`, `completeService()`, `notificationService.*`, `reviewService.create()` |
| `fetch()` directo | `restaurantService.getAll()`, `getFeatured()`, `tableService.*`, `menuService.*`, `reviewService.getByRestaurant()`, `waitlistService.*`, `dashboardService.*`, `settingsService.*`, `favoriteService.*`, `authService.*` |

**Impacto:** Los servicios que usan `fetch()` directo reimplementan la lógica de token management cada vez, con variaciones inconsistentes. Algunos olvidan manejar errores HTTP, otros sí.

---

### 8.2 — Nomenclatura bilingüe en admin routes
| Ruta Backend | Idioma |
|---|---|
| `/admin/reservas` | Español |
| `/admin/mesas` | Español |
| `/admin/ofertas` | Español |
| `/admin/opiniones` | Español |
| `/admin/waitlist` | **Inglés** |
| `/admin/menu` | **Inglés** |
| `/admin/settings` | **Inglés** |
| `/admin/payments` | **Inglés** |
| `/admin/analytics` | **Inglés** |
| `/admin/reports` | **Inglés** |
| `/admin/config` | **Inglés** |

Y hay aliases duplicados:
- `/admin/settings` y `/admin/configuracion` → mismo router
- `/admin/reportes` y `/admin/reports` → mismo router

---

### 8.3 — `RestaurantAuthProvider.logout()` llama a `authService.logout()` que es un 404
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/contexts/RestaurantAuthContext.tsx:62` |
| **Problema** | Llama a `authService.logout()` que hace POST a `/auth/logout` (no existe) |
| **Impacto** | Error silencioso en cada logout de admin. El logout "funciona" sólo por borrar localStorage |

---

### 8.4 — `AuthContext.register()` no usa `authService.register()`
| Detalle | |
|---------|---|
| **Archivo** | `frontend/src/contexts/AuthContext.tsx:58-82` vs `api.ts:1292-1305` |
| **Problema** | `AuthContext.register()` hace `fetch()` directo. `authService.register()` también existe pero retorna `User | null` (sin token) |
| **Impacto** | Dos implementaciones de registro que se comportan diferente. `authService.register()` es un dead code que además no extrae el token de la respuesta |

---

## 9. 📊 Resumen de Severidad

| Severidad | Cantidad | Categoría |
|-----------|----------|-----------|
| 🔴 **CRÍTICA** | 4 | `StaffAuth` puerto incorrecto, endpoints fantasma `logout`/`me`, `optionalAuth` no soporta JWT, `restaurantOwner` usa `supabase` con RLS |
| 🟠 **ALTA** | 8 | Status de mesa incorrecto en confirmación, review sin transform, waitlist usa endpoint admin, token selection excluye GET, cancel modifica special_request, repeat no valida mesa |
| 🟡 **MEDIA** | 7 | Token expirado no verificado, error swallowing, fetch/apiCall inconsistencia, comentario de puerto incorrecto, doble JSON.parse |
| 🔵 **BAJA** | 4 | Nomenclatura bilingüe, duplicación de registro, transformRestaurant retorna `{}`, dead code en authService |

---

### Total de hallazgos: **23 issues documentados**

| Métrica | Valor |
|---------|-------|
| Endpoints Fantasma | 4 |
| Inconsistencias de datos | 6 |
| Errores de seguridad | 5 |
| Error handling deficiente | 4 |
| Inconsistencias estructurales | 4 |

---

> **Nota:** Este reporte documenta el estado actual del código sin modificar archivos ni proponer refactoring. Cada hallazgo incluye la ubicación exacta del archivo y línea para facilitar la verificación independiente.
