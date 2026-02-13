# Guía de Instalación: Node.js para React Native

Parece que **Node.js** no está instalado o configurado en tu terminal. Sin esta herramienta, no podemos crear la aplicación móvil ni ejecutar comandos básicos de desarrollo.

Sigue estos pasos para solucionarlo en 5 minutos:

## Opción 1: Instalador Oficial (Recomendada y Fácil)
1.  Entra a la página oficial: **[https://nodejs.org/es](https://nodejs.org/es)**
2.  Descarga la versión **LTS (Recomendada para la mayoría)** (actualmente la v20 o v22).
3.  Abre el archivo `.pkg` descargado y sigue las instrucciones de "Siguiente, Siguiente...".
4.  **IMPORTANTE**: Cuando termine, **cierra completamente VS Code y tu Terminal** y vuélvelos a abrir. Esto es necesario para que reconozcan el nuevo comando.

## Opción 2: Verificación
Una vez instalado y reiniciado tu VS Code:
1.  Abre la terminal.
2.  Escribe:
    ```bash
    node -v
    ```
    *Debería salir algo como `v20.10.0`.*
3.  Escribe:
    ```bash
    npm -v
    ```
    *Debería salir un número de versión.*

---

## 🚀 Volviendo al Plan Móvil
Una vez que tengas Node instalado, repite estos pasos para crear tu app:

1.  Abre la terminal en la carpeta donde quieres guardar el proyecto.
2.  Ejecuta el comando creador:
    ```bash
    npx create-expo-app@latest sittara-mobile --template tabs
    ```
3.  Entra a la carpeta:
    ```bash
    cd sittara-mobile
    ```
4.  Abre VS Code ahí:
    ```bash
    code .
    ```

¡Avísame cuando tengas Node listo para pasarte la configuración de conexión a la API!
