# Plan de Migración: Web a App Móvil (React Native + Expo)

Este documento detalla la estrategia completa para migrar tu aplicación web "Yucatan Restaurant Booking" a una aplicación móvil nativa utilizando **React Native**, **Expo** y **NativeWind**.

## 1. Estrategia de Repositorio y Arquitectura

Como solicitaste, mantendremos el código web intacto en su repositorio actual y crearemos un **nuevo repositorio** para la aplicación móvil.

### Estructura Propuesta
- **Repo Actual (Web)**: Se mantiene para la administración web y el backend (si es un monorepo).
- **Nuevo Repo (Mobile)**: Contendrá únicamente el código de React Native (Frontend Móvil).

### ¿Por qué desplegar el Backend?
Para que tu aplicación móvil (en tu celular físico o emulador) pueda consumir datos, necesita acceder a tu API.
- **Localhost no funciona igual**: En un celular, `localhost` se refiere al propio celular, no a tu computadora.
- **Solución Recomendada**: Desplegar tu backend (Express + Postgres) en un servicio en la nube como **Render.com**. Esto te dará una URL pública (ej. `https://mi-api-restaurante.onrender.com`) que funcionará desde cualquier lugar (WiFi, 4G, etc.).

---

## 2. Configuración del Entorno Móvil (Expo)

### Paso 1: Iniciar el Proyecto
Usaremos **Expo** y **Expo Router** para una experiencia de desarrollo moderna y similar a la web.

```bash
# Crear la app con la plantilla de Expo Router
npx create-expo-app@latest yucatan-mobile --template tabs@5.0

# Entrar al directorio
cd yucatan-mobile
```

### Paso 2: Instalar NativeWind (Tailwind para RN)
Esto es crucial para reutilizar tus clases de utilidad actuales.

```bash
npm install nativewind
npm install --save-dev tailwindcss@3.3.2 
# (Nota: NativeWind v2 usa Tailwind 3. v4 está en beta, mejor asegurar compatibilidad)
```

Configura el `tailwind.config.js` para escanear tus archivos de React Native:
```javascript
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## 3. Plan de Migración Paso a Paso

No migraremos todo de golpe. Seguiremos este orden lógico:

### Fase 1: Núcleo y Tipos (Día 1)
1.  **Copiar Tipos**: Copia la carpeta `frontend/src/types` a `mobile/types`. Esto asegura que `User`, `Reservation`, etc., sean idénticos.
2.  **Configurar API Client**:
    *   Crea un archivo de configuración para la URL base.
    *   *Reto*: Configurar la URL dinámica.
    *   *Código*:
        ```typescript
        // mobile/constants/Api.ts
        export const API_URL = __DEV__ 
          ? "http://192.168.1.XX:3002" // Tu IP local para desarrollo
          : "https://mi-api.onrender.com"; // Producción
        ```

### Fase 2: Servicios y Hooks (Día 2)
1.  **Copiar Servicios**: Mueve `frontend/src/services` a `mobile/services`.
    *   *Ajuste*: Reemplaza cualquier referencia a `localStorage` por `AsyncStorage` o `SecureStore` (de Expo).
    *   *Ajuste*: Si usas `axios`, asegúrate de que la `baseURL` venga de tu constante `API_URL`.
2.  **Copiar Hooks**: Mueve `frontend/src/hooks` a `mobile/hooks`.
    *   La mayoría de la lógica de React (`useState`, `useEffect`) funcionará tal cual.

### Fase 3: Componentes UI Base (Día 3)
Crea tus "bloques de lego". No migres páginas enteras todavía.
*   `Button.tsx` (web) -> `Button.tsx` (móvil con `TouchableOpacity`).
*   `Input.tsx` (web) -> `Input.tsx` (móvil con `TextInput`).
*   `Card.tsx` (web) -> `Card.tsx` (móvil con `View` y sombras nativas).

**Regla de Traducción:**
| HTML Web | React Native | Notas |
| :--- | :--- | :--- |
| `<div>` | `<View>` | El contenedor básico. |
| `<h1>`, `<p>`, `<span>` | `<Text>` | **Siempre** debe haber texto dentro de `<Text>`. No puedes poner texto suelto en un `<View>`. |
| `<button>` | `<TouchableOpacity>` | Para áreas tocables con feedback visual. |
| `<input>` | `<TextInput>` | No tiene cierre (self-closing). Maneja `projects` diferente. |
| `<img>` | `<Image>` | Requiere `source={{ uri: ... }}` y dimensiones explícitas. |
| `<ul>`, `<ol>` | `<View>` | No existen listas semánticas, usa Vistas. |

### Fase 4: Navegación y Pantallas (Día 4-5)
Expo Router usa el sistema de archivos (igual que Next.js).
*   `frontend/src/pages/Home.tsx` -> `mobile/app/index.tsx`
*   `frontend/src/pages/Login.tsx` -> `mobile/app/auth/login.tsx`
*   `frontend/src/pages/Dashboard.tsx` -> `mobile/app/(tabs)/dashboard.tsx`

---

## 4. Retos y Errores Comunes a Considerar

### 1. El Error "Text strings must be rendered within a <Text> component"
*   **Web**: `<div>Hola mundo</div>` (Válido)
*   **Mobile**: `<View>Hola mundo</View>` (ERROR CRÍTICO)
*   **Corrección**: `<View><Text>Hola mundo</Text></View>`

### 2. Estilos CSS no compatibles
React Native usa Flexbox para todo, pero hay diferencias:
*   `display: block` o `inline` no existen. Todo es `flex`.
*   La dirección por defecto es `flex-direction: column` (en web es `row` por defecto).
*   No existe herencia de estilos de texto (ej. poner color en el padre no afecta a los hijos automáticamente en todos los casos, aunque NativeWind ayuda).
*   `z-index` funciona diferente (depende del orden en el árbol de componentes).

### 3. Formularios
*   En web usas `<form onSubmit={...}>`.
*   En móvil **no existen los formularios** como tal. Tienes que manejar el botón "Enviar" con un `onPress` que llame a tu función de envío.

### 4. Almacenamiento Local
*   Si tu código web usa `localStorage.getItem('token')`, fallará.
*   Debes instalar `@react-native-async-storage/async-storage` y crear un adaptador si quieres mantener el mismo código de servicios.

### 5. Las Imágenes
*   En web: `<img src="/logo.png" />` funciona relativo.
*   En móvil: Debes importar imagenes locales (`require('../../assets/logo.png')`) o usar URIs remotas completas (`https://...`).

---

## 5. Deployment del Backend en Render (Guía Rápida)

Para solucionar el problema de conexión, desplegaremos tu backend actual.

1.  Crea una cuenta en [Render.com](https://render.com).
2.  Conecta tu repositorio actual de GitHub.
3.  Crea un **Web Service** para el Backend:
    *   **Build Command**: `npm install && npm run build` (ajusta según tu `package.json`).
    *   **Start Command**: `npm start` o `node dist/index.js`.
    *   **Environment Variables**: Copia tus variables del `.env` (DB_URL, SUPABASE_KEY, etc.).
4.  Crea un **PostgreSQL** (si no usas Supabase gestionado) o simplemente conecta tu app de Render a tu base de datos Supabase existente usando la URL de conexión.

Una vez desplegado, obtendrás una URL que usarás en tu app móvil.

---

## 6. Siguientes Pasos Inmediatos para Ti

1.  **Confírmame** si deseas que genere el comando para inicializar el proyecto de Expo ahora mismo (asumiendo que tienes Node instalado).
2.  O si prefieres, **pásame el código de un componente sencillo** (ej. un `Button` o `Badge`) para mostrarte el ejemplo de traducción exacta.
