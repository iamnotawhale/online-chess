FROM node:20-alpine AS build
WORKDIR /app

# Copy public assets to be adjacent to app (for vite publicDir: '../public')
COPY public/ /public/

# Copy and install dependencies
COPY frontend/package*.json /app/
RUN npm ci

# Copy frontend source code
COPY frontend/ /app/

# Build frontend (vite will find ../public from /app)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
