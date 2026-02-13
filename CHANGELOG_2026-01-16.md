# 📋 Documentación de Cambios - Mesa Feliz
## Sesión del 16 de Enero 2026

---

## 🎯 Objetivo
Implementar **verificación de email** y **autocompletado de direcciones** para mejorar el proceso de registro de restaurantes.

---

## 📧 Sistema de Verificación de Email

### ¿Cómo Funciona?

```
Usuario ingresa email → Click "Continuar" → Backend genera código 6 dígitos
                                                     ↓
                              Código se almacena en memoria (10 min expira)
                                                     ↓
                              Email enviado via Resend (o mostrado en dev)
                                                     ↓
Usuario ingresa código en modal → Backend verifica → ✅ Email confirmado
```

### Archivos del Backend

#### `backend/src/routes/verification.ts`
```typescript
// Almacén en memoria para códigos
const verificationCodes = new Map<string, {
    code: string;      // Código de 6 dígitos
    expires: Date;     // Expira en 10 minutos
    attempts: number;  // Máximo 5 intentos
}>();

// POST /api/verification/send-code
// - Genera código aleatorio de 6 dígitos
// - Lo guarda en memoria asociado al email
// - Envía email con Resend
// - Devuelve devCode en desarrollo para pruebas

// POST /api/verification/verify-code
// - Recibe email y código
// - Verifica si existe, si no expiró, si hay intentos
// - Si es correcto: borra el código y retorna success

// POST /api/verification/resend-code
// - Genera nuevo código y reemplaza el anterior
```

#### `backend/src/services/email.ts`
```typescript
// Usa Resend para enviar emails con templates HTML
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// sendVerificationCode({ to, code })
// - Envía email bonito con el código
// - Template HTML con estilos inline
```

### Archivos del Frontend

#### `src/pages/admin/RestaurantRegisterPage.tsx`
```typescript
// Estados para verificación
const [emailVerified, setEmailVerified] = useState(false);
const [showVerifyModal, setShowVerifyModal] = useState(false);
const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
const [devCode, setDevCode] = useState<string | null>(null);

// Flujo:
// 1. Usuario llena paso 1 y da "Continuar"
// 2. Si email no verificado → llama handleSendVerificationCode()
// 3. Abre modal con 6 inputs para el código
// 4. En dev, muestra el código en cuadro amarillo
// 5. Usuario ingresa código → handleVerifyCode()
// 6. Si correcto → emailVerified = true → avanza al paso 2
```

---

## 🗺️ Sistema de Autocompletado de Direcciones

### ¿Cómo Funciona?

```
Usuario escribe "Calle 60" → Debounce 800ms → Backend proxy
                                                    ↓
                             Nominatim OpenStreetMap API
                                                    ↓
                             Resultados con coordenadas y zona
                                                    ↓
Dropdown con sugerencias → Usuario selecciona → Dirección + lat/lon guardados
```

### ¿Por qué un Proxy?
Nominatim bloquea peticiones directas desde el navegador (CORS). 
El backend actúa como intermediario.

### Archivos del Backend

#### `backend/src/routes/geocode.ts`
```typescript
// GET /api/geocode/search?q=calle 60
// - Recibe query del frontend
// - Agrega ", Yucatán, México" al query
// - Hace fetch a Nominatim con User-Agent válido
// - Devuelve resultados JSON al frontend

// GET /api/geocode/reverse?lat=20.9&lon=-89.6
// - Geocodificación inversa (coordenadas → dirección)
```

### Archivos del Frontend

#### `src/components/AddressAutocomplete.tsx`
```typescript
// Componente reutilizable para buscar direcciones

// Props:
// - value: string (dirección actual)
// - onChange: (address, {lat, lon, zone}) => void
// - placeholder, className, error

// Características:
// - Debounce de 800ms para no saturar API
// - Dropdown con resultados
// - Navegación con teclado (↑↓ Enter Esc)
// - Extrae "zone" del suburb o city
// - Icono de búsqueda y botón limpiar
```

**Uso en RestaurantRegisterPage:**
```tsx
<AddressAutocomplete
    value={formData.address}
    onChange={handleAddressChange}
    placeholder="Busca la dirección de tu restaurante..."
    error={!!errors.address}
/>

// handleAddressChange actualiza:
// - formData.address (texto)
// - formData.latitude, formData.longitude (coordenadas)
// - formData.zone (zona/barrio si disponible)
```

---

## 📁 Resumen de Archivos

### Creados
| Archivo | Propósito |
|---------|-----------|
| `backend/src/routes/verification.ts` | Rutas de verificación de email |
| `backend/src/routes/geocode.ts` | Proxy para OpenStreetMap |
| `backend/src/services/email.ts` | Servicio de envío de emails |
| `src/components/AddressAutocomplete.tsx` | Componente de autocompletado |

### Modificados
| Archivo | Cambios |
|---------|---------|
| `backend/src/index.ts` | +2 routers (verification, geocode) |
| `backend/package.json` | +resend dependency |
| `backend/.env` | +RESEND_API_KEY |
| `src/pages/admin/RestaurantRegisterPage.tsx` | Modal de verificación + autocomplete |

---

## ⚙️ Configuración

### Variable de Entorno
```env
# En backend/.env
RESEND_API_KEY=re_WeAZwZSE_FiFEx6wwxhbME1ek1gren4KF
```

### Dependencia
```bash
# Ya agregada al package.json
npm install resend
```

---

## 🧪 Pruebas Manuales

1. **Ir a**: `http://localhost:8081/admin/registro`

2. **Paso 1 - Verificación de Email:**
   - Llenar nombre, email, teléfono, contraseña
   - Dar clic en "Continuar"
   - Aparece modal con inputs para código
   - En desarrollo: código visible en cuadro amarillo
   - Ingresar código → "Verificar código"
   - ✅ Email verificado, avanza al paso 2

3. **Paso 2 - Autocompletado:**
   - Escribir dirección (ej: "Calle 60")
   - Esperar 800ms → aparece dropdown
   - Seleccionar dirección
   - Zona se autocompleta si está disponible

---

## 📌 Notas de Producción

1. **Resend**: 
   - El dominio `onboarding@resend.dev` solo envía al email de la cuenta
   - Para producción: verificar dominio propio en panel de Resend

2. **Código de Desarrollo**:
   - El `devCode` se muestra en el modal solo para pruebas
   - En producción: remover esta funcionalidad

3. **OpenStreetMap**:
   - Nominatim tiene rate limit: 1 request/segundo
   - El debounce de 800ms respeta este límite
