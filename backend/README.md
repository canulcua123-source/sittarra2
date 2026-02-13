# 🍽️ Mesa Feliz API

Backend API para el sistema de reservaciones de restaurantes Mesa Feliz.

## 🛠️ Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth (JWT)

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── config/           # Configuración
│   │   ├── env.ts        # Variables de entorno
│   │   └── supabase.ts   # Cliente de Supabase
│   │
│   ├── middleware/       # Middleware de Express
│   │   └── auth.ts       # Autenticación JWT
│   │
│   ├── routes/           # Rutas de la API
│   │   ├── restaurants.ts
│   │   ├── reservations.ts
│   │   └── ...
│   │
│   ├── services/         # Lógica de negocio
│   │
│   ├── types/            # Tipos TypeScript
│   │   └── database.ts   # Tipos de Supabase
│   │
│   └── index.ts          # Entry point
│
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Instalación

1. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   
   Edita `.env` con tus credenciales de Supabase.

3. **Iniciar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Build para producción:**
   ```bash
   npm run build
   npm start
   ```

## 🔌 Endpoints de la API

### Health Check
```
GET /health
```

### Restaurantes
```
GET    /api/restaurants           # Lista de restaurantes
GET    /api/restaurants/featured  # Restaurantes destacados
GET    /api/restaurants/:id       # Detalle de restaurante
GET    /api/restaurants/:id/tables   # Mesas del restaurante
GET    /api/restaurants/:id/menu     # Menú del restaurante
GET    /api/restaurants/:id/offers   # Ofertas del restaurante
```

### Reservaciones
```
POST   /api/reservations          # Crear reservación
GET    /api/reservations/my       # Mis reservaciones
GET    /api/reservations/:id      # Detalle de reservación
PATCH  /api/reservations/:id/status   # Actualizar estado
POST   /api/reservations/:id/cancel   # Cancelar reservación
POST   /api/reservations/:id/arrive   # Registrar llegada
```

## 🔐 Autenticación

La API usa JWT tokens de Supabase. Incluye el token en el header:

```
Authorization: Bearer <supabase_access_token>
```

## 📝 Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia la URL y las keys del proyecto
3. Ejecuta el script de creación de tablas (próximamente)

## 🗄️ Tablas de la Base de Datos

- `users` - Usuarios del sistema
- `restaurants` - Restaurantes
- `tables` - Mesas de los restaurantes
- `reservations` - Reservaciones
- `offers` - Ofertas y promociones
- `reviews` - Reseñas
- `waitlist` - Lista de espera
- `menu_items` - Platillos del menú

## 📄 Licencia

MIT
