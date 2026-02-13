# Roadmap de Migración Modular: Web a App Móvil

Este plan está diseñado para migrar la funcionalidad de la web a React Native (Expo) de manera incremental, asegurando pantallas funcionales en cada etapa sin romper la lógica del negocio.

## Fase 1: Cimientos y Conectividad (El "Motor")
*Objetivo: Tener la estructura base y conexión real con la API de Render.*

1.  **Configuración de Entorno**: Expo Router + NativeWind + Axios.
2.  **Sincronización de Tipos**: Copiar las interfaces de TypeScript de la Web para mantener consistencia.
3.  **Cliente API**: Crear la base de comunicación apuntando a `https://sittarra2.onrender.com`.
4.  **Estado Global (Auth)**: Implementar el `AuthContext` utilizando Supabase Auth (copiando la lógica de la web).

## Fase 2: Autenticación (Pantalla Funcional 1)
*Objetivo: Que el usuario pueda entrar a su cuenta.*

1.  **Pantalla de Login**: Traducción del componente web a Native con `TextInput` y `TouchableOpacity`.
2.  **Pantalla de Registro**: Formulario de creación de cuenta.
3.  **Persistencia**: Guardar el token de sesión de forma segura.

## Fase 3: Exploración (Pantalla Funcional 2)
*Objetivo: Ver los restaurantes disponibles.*

1.  **Pantalla de Inicio (Home)**: Lista de restaurantes (FlatList de alto rendimiento).
2.  **Card de Restaurante**: Adaptación del diseño web a móvil usando NativeWind.
3.  **Filtros de Búsqueda**: Barra de búsqueda y categorías.

## Fase 4: Reservas (Pantalla Funcional 3)
*Objetivo: La función principal - Reservar una mesa.*

1.  **Detalle del Restaurante**: Información, imágenes y menú.
2.  **Flujo de Reserva**:
    *   Selector de Fecha (Calendario nativo).
    *   Selector de Hora (Time slots).
    *   Confirmación y envío a la API.

## Fase 5: Gestión de Usuario (Pantalla Funcional 4)
*Objetivo: Ver mis reservas y perfil.*

1.  **Mis Reservas**: Lista de reservas pasadas y futuras.
2.  **Perfil de Usuario**: Editar datos y cerrar sesión.
3.  **Notificaciones**: (Opcional en esta etapa) Ver alertas de confirmación.

---

## Estrategia de Implementación "Espejo"
Para cada pantalla, seguiremos este proceso:
1.  **Análisis**: Abro el archivo `.tsx` de la Web.
2.  **Traducción Táctica**:
    *   `div` -> `View`
    *   `span/p/h1` -> `Text`
    *   `button` -> `TouchableOpacity`
    *   `img` -> `Image`
3.  **Inyección de Lógica**: Copio los `useEffect` y funciones de la web casi sin cambios.
4.  **Ajuste Flexbox**: React Native usa `flex-direction: column` por defecto; ajustamos las clases de Tailwind necesarias.

---

## 🚨 Consideraciones de Error (Preventivo)
*   **LocalStorage**: En la web usamos `localStorage`, en móvil usaremos `AsyncStorage`.
*   **Formularios**: React Native no usa el evento `onSubmit` de HTML; usaremos manejadores `onPress` en botones.
*   **Estilos**: No todos los selectores complejos de CSS funcionan en NativeWind. Usaremos clases atómicas.
