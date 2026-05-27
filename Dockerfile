# Etapa 1: Build Angular
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build -- --configuration production

# Etapa 2: Nginx
FROM nginx:1.25-alpine

COPY --from=build /app/dist/clinica-navarro-frontend-admin/browser /usr/share/nginx/html

# Angular 20 genera index.csr.html
RUN mv /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html

# Config SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]