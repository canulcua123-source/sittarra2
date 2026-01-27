# 🍽️ Sittara - Sistema de Reservas para Restaurantes

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green.svg)
![Status](https://img.shields.io/badge/status-stable-success.svg)
![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg?logo=docker&logoColor=white)

**Sittara** es una plataforma integral para la gestión de restaurantes, diseñada para modernizar la experiencia de reservas y la administración operativa. Con una arquitectura modular y escalable, permite a los dueños de restaurantes gestionar mesas, reservas, menús y personal desde un panel unificado.

---

## 🚀 Características Principales

### 📱 Para Clientes
- **Reservas en Tiempo Real**: Disponibilidad de mesas sincronizada al instante.
- **Perfil de Usuario**: Historial de visitas, preferencias y gestión de favoritos.
- **Menú Digital**: Exploración visual de platillos y ofertas especiales.

### 🏢 Para Administradores (Panel Modular)
El backend ha sido refactorizado en **11 módulos especializados**:
- **📊 Dashboard**: Métricas clave y estado del restaurante en vivo.
- **📅 Reservas**: Ciclo completo (Solicitud -> Confirmación -> Check-in -> Finalización).
- **🪑 Mesas**: Mapa interactivo y gestión de disponibilidad.
- **⏳ Waitlist**: Gestión eficiente de clientes en espera.
- **👩‍🍳 Staff**: Control de acceso y roles para meseros/gerentes.
- **🤖 AI Insights**: Sugerencias operativas basadas en inteligencia artificial.
- **📈 Reportes**: Análisis detallado de rendimiento y ventas.
- **⚙️ Configuración**: Ajustes globales del restaurante.

---

## 🛠️ Stack Tecnológico

**Backend**
- **Runtime**: Node.js & Express
- **Lenguaje**: TypeScript (Strict Mode)
- **Base de Datos**: Supabase (PostgreSQL)
- **Seguridad**: JWT Auth, Helmet, Rate Limiting

**Frontend**
- **Framework**: React + Vite
- **UI/UX**: TailwindCSS, Shadcn/UI, Framer Motion
- **Integraciones**: HTML5-QRCode, Stripe (Pagos)

**Infraestructura**
- **Contenedores**: Docker & Docker Compose
- **CI/CD**: GitHub Actions Ready

---

## 🔧 Instalación y Despliegue

### Prerrequisitos
- Node.js v20+
- Docker & Docker Compose (Opcional, recomendado)

### Opción A: Despliegue Rápido con Docker (Recomendado)

El proyecto incluye configuración completa para despliegue en contenedores.

```bash
# 1. Clonar el repositorio
git clone https://github.com/canulcua123-source/sittarra2.git
cd sittarra2

# 2. Configurar variables de entorno
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# (Edita los archivos .env con tus credenciales de Supabase)

# 3. Levantar servicios
docker-compose up --build -d
```
> **Nota**: Se ha parcheado la dependencia `html5-qrcode` para garantizar builds exitosos en producción.

### Opción B: Ejecución Local (Desarrollo)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (En otra terminal)
cd frontend
npm install
npm run dev
```

---

## 📖 Documentación de API

El backend expone una API RESTful organizada por dominios. La autenticación se maneja vía Bearer Tokens.

| Módulo | Endpoint Base | Descripción |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Login, registro y recuperación de contraseña. |
| **Dashboard** | `/api/admin/dashboard` | KPIs y estadísticas en tiempo real. |
| **Reservas** | `/api/admin/reservations` | CRUD completo de reservas. |
| **Mesas** | `/api/admin/tables` | Estado y configuración de mesas. |
| **AI** | `/api/admin/ia` | Sugerencias inteligentes para optimización. |

---

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, sigue el flujo de trabajo estándar:

1. Haz un Fork del proyecto.
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`).
3. Haz Commit de tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`).
4. Haz Push a la rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---
*Desarrollado con ❤️ por el equipo de Sittara.*
