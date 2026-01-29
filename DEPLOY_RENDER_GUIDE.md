# Guía de Despliegue en Render para Mesa Feliz (Yucatán Restaurant Booking)

Esta guía paso a paso te ayudará a desplegar tu API (Backend) en Render, asegurando que sirva tanto a tu aplicación web actual como a tu futura aplicación móvil.

---

## 🏗️ Configuración del Servicio en Render

Sigue estos pasos en el formulario "New Web Service" de Render que tienes abierto:

### 1. Detalles Básicos
*   **Name**: `mesa-feliz-api` (o el nombre que prefieras).
*   **Language**: `Node` (Tu proyecto es Node.js/TypeScript, NO selecciones Docker a menos que quieras usar específicamente el `Dockerfile`, pero el entorno nativo de Node suele ser más sencillo).
    *   *Nota*: Si seleccionas `Docker`, Render usará tu archivo `Dockerfile`. Si seleccionas `Node`, Render usará los comandos de tu `package.json`. **Recomendación: Selecciona `Node` para empezar, es más fácil de depurar.**
*   **Branch**: `main` (o la rama donde tengas tu código estable).
*   **Region**: `Oregon (US West)` (Está bien, o elige la más cercana a tus usuarios, ej. Ohio o Frankfurt si estuvieras en Europa).

### 2. Directorios y Comandos (CRÍTICO)
Como tienes un Monorepo (carpetas `frontend` y `backend` juntas), esta parte es vital:

*   **Root Directory**: `backend`
    *   *Explicación*: Esto le dice a Render: "Entra a la carpeta backend e ignora todo lo demás".
*   **Build Command**: `npm install && npm run build`
    *   *Explicación*: Instala las dependencias y compila tu TypeScript a JavaScript.
*   **Start Command**: `npm start`
    *   *Explicación*: Ejecuta el servidor compilado (`node dist/index.js` según tu package.json).

### 3. Variables de Entorno (Environment Variables)
Esta es la parte que me pediste "ayúdame con esto". Debes copiar las variables de tu archivo `.env` local y pegarlas en Render una por una o usando la opción de "pegar .env file" si la tienen.

**IMPORTANTE**: Usa los valores REALES de tu archivo `.env`, no los del `.env.example` ni los que tienen `localhost`.

| Clave (Key) | Valor (Value) | Notas |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Obligatorio para rendimiento. |
| `PORT` | `10000` | Render asigna puertos automáticamente, pero por si acaso. |
| `FRONTEND_URL` | `*` o la URL de tu frontend | Tu backend probablemente usa esto para CORS. Pon `*` para permitir móvil y web, o pon la lista de dominios separados por coma. |
| `SUPABASE_URL` | `https://dxekhdiomzpfcwitzhbj.supabase.co` | Copia EXACTA de tu `.env` local. |
| `SUPABASE_KEY` | `eyJhbGciOiJIUz...` | Tu llave **ANON** (pública) de Supabase. |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUz...` | Tu llave **SERVICE_ROLE** (privada) de Supabase. |
| `JWT_SECRET` | `(Tu secreto real)` | Usa un string largo y seguro. |
| `RESEND_API_KEY` | `re_WeAZwZSE...` | Tu llave de email actual. |

**⚠️ Advertencia sobre CORS:**
Para que tu App Móvil (desde cualquier IP) y tu Web (desde Vercel/Netlify) puedan conectarse, tu backend debe permitir las peticiones. Revisa en tu código `index.ts` que la configuración de CORS acepte orígenes dinámicos o `*` si quieres simplificarlo al inicio (menos seguro, pero funcional).

---

## 📱 ¿Cómo conectar esto a la App Móvil y Web?

Una vez que le des **"Create Web Service"**, Render te dará una URL (ej. `https://mesa-feliz-api.onrender.com`).

1.  **En tu App Móvil (Futura):**
    En tu código React Native, usarás esa URL:
    ```typescript
    export const API_BASE_URL = "https://mesa-feliz-api.onrender.com";
    ```

2.  **En tu App Web (Actual en Producción):**
    Si despliegas tu frontend en Vercel/Netlify, configurarás su variable de entorno:
    ```env
    VITE_API_URL=https://mesa-feliz-api.onrender.com
    ```

---

## 🚨 Checklist de Errores Comunes

1.  **Puerto Incorrecto**: Render exige que tu app escuche en el puerto que ellos asignan (variable `process.env.PORT`). Asegúrate de que tu `src/index.ts` tenga algo como:
    ```typescript
    const port = process.env.PORT || 3001;
    app.listen(port, () => ...);
    ```
2.  **Dependencias Faltantes**: Si usas librerías en `backend` que instalaste en la raíz del proyecto por error, fallará. Asegúrate de que `backend/package.json` tenga TODO lo necesario.
3.  **Typescript**: El comando `build` debe ejecutar `tsc`. Si hay errores de tipado, el despliegue fallará. Verifica corriendo `npm run build` dentro de la carpeta `backend` en tu computadora antes de subir.

---

¡Listo! Con estos valores puedes llenar el formulario en Render y tener tu API volando en minutos.
