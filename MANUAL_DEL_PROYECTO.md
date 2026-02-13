# Manual Técnico del Proyecto: Sittara / Mesa Feliz

Este documento proporciona una visión general completa, arquitectura, configuración y guía de despliegue para el sistema de reservas de restaurantes **Sittara / Mesa Feliz**.

---

## 📋 Descripción General
**Sittara** es una plataforma integral para la gestión de reservas de restaurantes, que incluye un panel administrativo, gestión de mesas, integración de pagos y notificaciones automatizadas.

### 🛠 Tech Stack (Tecnologías)

#### **Frontend** (`/frontend`)
- **Framework**: React 18 + Vite
- **Lenguaje**: TypeScript
- **UI Discovery/Components**: Shadcn/UI, Radix UI
- **Estilos**: Tailwind CSS + Tailwind Animate
- **Estado/Data Fetching**: Tanstack Query (React Query)
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Pagos**: Stripe Elements
- **QR**: html5-qrcode, react-qr-code

#### **Backend** (`/backend`)
- **Runtime**: Node.js v20
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: JWT + Bcrypt
- **Pagos**: Stripe API
- **Emails**: Nodemailer + Google APIs
- **Validación**: Zod
- **Seguridad**: Helmet, Colors, Rate Limiting

#### **Infraestructura y Automatización**
- **Contenedores**: Docker & Docker Compose
- **Automatización**: n8n (Integrado via Docker)
- **Proxy Inverso**: Nginx (Frontend)

---

## 📂 Estructura del Proyecto

```text
/
├── backend/                # API RESTful (Express + TS)
│   ├── src/                # Código fuente
│   ├── Dockerfile          # Configuración de imagen Docker Backend
│   └── package.json        # Dependencias y scripts
├── frontend/               # Cliente Web (React + Vite)
│   ├── src/                # Componentes, Páginas, Hooks
│   ├── Dockerfile          # Configuración de imagen Docker Frontend
│   └── package.json        # Dependencias y scripts
├── database/               # Scripts y esquemas SQL
├── docker-compose.yml      # Orquestación de servicios (Back, Front, n8n)
├── MANUAL_DEL_PROYECTO.md  # Este archivo
└── *.md                    # Documentación adicional (Deploy, Migración, etc.)
```

---

## 🚀 Configuración y Ejecución

### 1. Requisitos Previos
- Docker y Docker Compose instalados.
- Node.js v20+ (para desarrollo local).
- Claves de API para Stripe, Supabase y Google (Gmail).

### 2. Variables de Entorno
Asegúrese de configurar los archivos `.env` en `backend/` y `frontend/`. 
Ejemplo básico para `backend/.env`:
```env
PORT=3000
DATABASE_URL=postgres://...
SUPABASE_URL=...
SUPABASE_KEY=...
STRIPE_SECRET_KEY=...
JWT_SECRET=...
```

### 3. Ejecución con Docker (Recomendado)
El proyecto está totalmente dockerizado. Para iniciar todo el ecosistema:

```bash
# Construir y levantar servicios en segundo plano
docker-compose up -d --build
```

**Puertos Expuestos:**
- **Frontend**: http://localhost:8081
- **Backend API**: http://localhost:3002
- **n8n Automation**: http://localhost:5678

### 4. Desarrollo Local (Sin Docker)
Si desea ejecutar los servicios individualmente:

**Backend:**
```bash
cd backend
npm install
npm run dev
# Corre en puerto 3000 o el definido en .env
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Corre en puerto 5173 por defecto
```

---

## 📡 API y Scripts de Base de Datos

El backend incluye scripts utilitarios en `backend/package.json`:

- `npm run db:generate`: Genera las tablas en la base de datos (usando `src/scripts/generate-tables.ts`).
- `npm run db:seed`: Puebla la base de datos con datos iniciales de prueba.
- `npm run dev`: Inicia el servidor en modo desarrollo (watch).
- `npm run build`: Compila el TypeScript a JavaScript en `dist/`.

---

## 🐳 Detalles de Dockerización

### **Backend (`backend/Dockerfile`)**
- **Multi-stage build**: Usa una etapa `builder` para compilar TS y una etapa `production` ligera.
- **Base Image**: `node:20-alpine`.
- **Healthcheck**: Configurado en `docker-compose` para verificar `/health`.

### **Frontend (`frontend/Dockerfile`)**
- Implementa un servidor web (posiblemente Nginx o serve) para servir los estáticos de React.
- Expuesto en el puerto 80 interna, mapeado al 8081 externamente.

### **n8n (`docker-compose.yml`)**
- Servicio de automatización de flujos de trabajo.
- Persistencia de datos mediante volumen `n8n_data`.

---

## 📝 Documentación Adicional
Consulte los siguientes archivos para temas específicos:
- `DEPLOY_RENDER_GUIDE.md`: Guía para desplegar en Render.com.
- `MIGRATION_PLAN_MOBILE.md`: Plan de migración a React Native.
- `MAPA_VISUAL_MESAS.md`: Detalles sobre la gestión visual de mesas.
