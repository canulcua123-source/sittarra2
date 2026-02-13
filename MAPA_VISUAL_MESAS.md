# 🎯 MAPA VISUAL DE MESAS - SISTEMA COMPLETO

## ✅ Implementación Finalizada

He completado la implementación del **Mapa Visual de Mesas** tipo cine con las siguientes mejoras:

---

## 🔧 Componentes Implementados

### 1. **Backend - Endpoint de Disponibilidad**
**Archivo:** `backend/src/routes/restaurants.ts`

**Nuevo Endpoint:**
```
GET /api/restaurants/:id/tables/available?date=YYYY-MM-DD&time=HH:MM&guests=N
```

**Funcionalidad:**
- Filtra mesas por capacidad (>= número de invitados)
- Cruza con reservas existentes para marcar disponibilidad
- Retorna estados: `available`, `reserved`, `occupied`, `blocked`
- Incluye metadatos: total de mesas, mesas disponibles

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "number": 5,
      "capacity": 4,
      "status": "available",
      "availability_status": "available",
      "is_selectable": true
    }
  ],
  "meta": {
    "date": "2026-01-15",
    "time": "20:00",
    "guests": 2,
    "total_tables": 8,
    "available_tables": 5
  }
}
```

---

### 2. **Frontend - Componente Visual**
**Archivo:** `src/components/TableMap.tsx`

**Características:**
✅ Vista tipo cine con grid responsivo
✅ Colores por estado:
- 🟢 **Verde** = Disponible
- 🟡 **Amarillo** = Reservada
- 🔴 **Rojo** = Ocupada
- ⚪ **Gris** = Bloqueada

✅ **Solo mesas disponibles son seleccionables**
✅ Animaciones suaves con Framer Motion
✅ Indicador visual de selección (checkmark)
✅ Muestra capacidad de cada mesa
✅ Leyenda de colores
✅ Loading state mientras carga

---

### 3. **Hooks de React Query**
**Archivo:** `src/hooks/useData.ts`

**Hooks Agregados:**
```typescript
// Hook principal - mesas disponibles con filtros
useAvailableTables(restaurantId, date, time, guestCount)

// Hook básico - todas las mesas del restaurante
useTables(restaurantId)

// Hook de mutación - actualizar estado de mesa
useUpdateTableStatus()
```

**Características:**
- Auto-refresh cada 30 segundos (mesas)
- Cache de 1 minuto (disponibilidad)
- Invalidación automática al cambiar reservas

---

### 4. **Servicio API**
**Archivo:** `src/services/api.ts`

**Método Agregado:**
```typescript
tableService.getAvailable(restaurantId, date, time, guests)
```

---

### 5. **Página de Reserva**
**Archivo:** `src/pages/ReservationPage.tsx`

**Cambios:**
```tsx
// Antes (estático)
const { data: mesas } = useTables(restaurantId);

// Ahora (dinámico con disponibilidad)
const { data: availableTables, isLoading } = useAvailableTables(
  restaurantId,
  selectedDate,
  selectedTime,
  guestCount
);
```

---

## 🎨 Flujo de Usuario

### Paso 1: Selección de Fecha
Cliente elige la fecha de la reserva

### Paso 2: Selección de Hora
Cliente elige la hora deseada

### Paso 3: Cantidad de Personas
Cliente elige cantidad de comensales (2-12)

### Paso 4: **🆕 MAPA VISUAL DE MESAS**
El sistema:
1. Consulta al backend mesas disponibles
2. Filtra por capacidad (≥ personas seleccionadas)
3. Verifica reservas existentes
4. Muestra mapa coloreado:
   - **Verde**: Disponible → Cliente puede seleccionar
   - **Amarillo/Rojo/Gris**: No disponible → Deshabilitado

### Paso 5: Cliente selecciona mesa
Click en mesa verde → Se marca con ✅

### Paso 6: Confirmación
Cliente completa detalles y confirma

---

## 🧪 Cómo Probar

### 1. Iniciar Servidores
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd ..
npm run dev
```

### 2. Navegar a Reserva
```
http://localhost:8080/reservar/[ID_RESTAURANTE]
```

### 3. Completar Flujo
1. Seleccionar fecha (ej: mañana)
2. Seleccionar hora (ej: 20:00)
3. Seleccionar personas (ej: 4)
4. **Ver el mapa visual de mesas**
   - Solo aparecen mesas con capacidad ≥ 4
   - Colores indican disponibilidad
   - Solo las verdes se pueden seleccionar

### 4. Probar Estados
Para ver diferentes estados, crea reservas manualmente en la BD:

```sql
-- Mesa Reservada (amarillo)
INSERT INTO reservations (restaurant_id, table_id, date, time, status)
VALUES ('restaurant-id', 'table-id', '2026-01-15', '20:00', 'pending');

-- Mesa Bloqueada (gris)
UPDATE tables SET status = 'disabled' WHERE id = 'table-id';
```

---

## 📊 Estados de Mesa

| Estado Backend | Estado Visual | Color | Seleccionable |
|---------------|---------------|-------|---------------|
| `available`   | Disponible    | 🟢 Verde | ✅ Sí |
| `reserved`    | Reservada     | 🟡 Amarillo | ❌ No |
| `occupied`    | Ocupada       | 🔴 Rojo | ❌ No |
| `disabled`    | Bloqueada     | ⚪ Gris | ❌ No |

---

## 🚀 Mejoras Implementadas

### Ventajas del Nuevo Sistema:

✅ **Disponibilidad en Tiempo Real**
- Antes: Cliente veía todas las mesas, podía reservar ocupadas
- Ahora: Solo ve mesas realmente disponibles

✅ **Filtrado Inteligente**
- Antes: Cliente seleccionaba cualquier mesa
- Ahora: Solo mesas con capacidad suficiente

✅ **UX Tipo Cine**
- Visual claro con colores
- Feedback inmediato
- Animaciones suaves

✅ **Performance**
- Cache inteligente
- Auto-refresh solo cuando necesario
- Loading states

---

## 🎯 Próximos Pasos (Fase 2)

Según el plan de implementación, lo siguiente sería:

1. **Sistema de Anticipos** (si aplica)
   - Detectar si requiere depósito
   - Integrar pasarela de pago
   - Guardar estado de pago

2. **Detalles de Reserva**
   - Ocasión especial (cumpleaños, romántica, etc.)
   - Comentarios especiales
   - Confirmar política de no-show

3. **Confirmación y Estados**
   - Email de confirmación
   - Estado: pendiente → confirmada
   - Página "Mis Reservas" mejorada

---

## 📱 Ejemplo de Uso Real

**Escenario:** Cliente quiere reservar para 6 personas el viernes a las 21:00

1. Entra a `/reservar/restaurant-id`
2. Selecciona: Viernes 17 de enero
3. Selecciona: 21:00 hrs
4. Selecciona: 6 personas
5. **Sistema consulta:**
   - `GET /api/restaurants/123/tables/available?date=2026-01-17&time=21:00&guests=6`
6. **Sistema muestra:**
   - Mesa 1 (4 pers) → ❌ No aparece (capacidad insuficiente)
   - Mesa 2 (6 pers) → 🟢 Disponible
   - Mesa 3 (8 pers) → 🟡 Reservada
   - Mesa 4 (8 pers) → 🟢 Disponible
7. Cliente selecciona Mesa 2 o Mesa 4
8. Continúa con confirmación

---

## 🐛 Troubleshooting

### Problema: "No hay mesas disponibles"
**Causa:** No hay mesas con capacidad suficiente o todas están reservadas
**Solución:** Probar con otra fecha/hora o menos personas

### Problema: El mapa no carga
**Causa:** Falta seleccionar fecha, hora o personas
**Solución:** El hook solo se ejecuta si todos los parámetros están presentes

### Problema: Todas las mesas están bloqueadas
**Causa:** No hay mesas creadas en la BD para ese restaurante
**Solución:** Ejecutar el script de seed o crear mesas manualmente

---

## ✅ Checklist de Implementación

- [x] Endpoint de disponibilidad (Backend)
- [x] Componente TableMap (Frontend)
- [x] Hook useAvailableTables
- [x] Servicio API actualizado
- [x] Página de reserva integrada
- [x] Estados visuales (colores)
- [x] Validación de capacidad
- [x] Loading states
- [x] Animaciones
- [ ] Testing end-to-end
- [ ] Sistema de anticipos
- [ ] Modal de confirmación mejorado

---

**¿Listo para probar?** 🎉

Navega a la página de reservas y verás el nuevo selector visual en acción.
