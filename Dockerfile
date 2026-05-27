
# BUILD ANGULAR

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production


#  SERVIDOR NGINX
FROM nginx:1.25-alpine

# Limpiamos los archivos por defecto de NGINX
RUN rm -rf /usr/share/nginx/html/*

# Copiamos los archivos compilados de Angular al servidor NGINX
COPY --from=build /app/dist/clinica-navarro-frontend-admin/browser /usr/share/nginx/html

# Configuracion inyectada usando COMILLAS SIMPLES para no corromper las variables $uri
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]