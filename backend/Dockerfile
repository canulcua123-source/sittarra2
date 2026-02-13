# ============================================
# BACKEND DOCKERFILE - Sittara API
# ============================================

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY src ./src

# Compilar TypeScript a JavaScript
RUN npm run build

# Etapa 2: Production
FROM node:20-alpine

WORKDIR /app

# Copiar solo lo necesario para producción
COPY package*.json ./
RUN npm install --omit=dev

# Copiar código compilado desde la etapa builder
COPY --from=builder /app/dist ./dist

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/index.js"]
