# Etapa 1: gerar o build do React
FROM node:22-alpine AS build

WORKDIR /app

# O Vite incorpora estas variáveis no JavaScript durante o build.
# Elas devem ser informadas como build args no Portainer/Compose.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Etapa 2: servir com Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
