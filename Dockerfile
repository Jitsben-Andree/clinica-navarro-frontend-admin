
#  BUILD ANGULAR

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production


# SERVIDOR NGINX
FROM nginx:1.25-alpine
# Copiamos los archivos compilados de Angular al servidor NGINX
COPY --from=build /app/dist/clinica-navarro-frontend-admin/browser /usr/share/nginx/html

# Configuracion inyectada directamente para evitar el error de nginx.conf faltante
RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]