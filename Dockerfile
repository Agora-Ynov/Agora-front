# ─────────────────────────────────────────
# Stage 1 : Build Angular
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build:prod

# ─────────────────────────────────────────
# Stage 2 : Serve avec Nginx
# ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Copier la config Nginx custom
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build Angular
COPY --from=builder /app/dist/agora-front/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
