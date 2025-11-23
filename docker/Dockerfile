FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Créer l'utilisateur AVANT de copier les fichiers
RUN addgroup -g 1001 -S nodejs && adduser -S bot -u 1001

# Mettre à jour les packages Alpine et installer les dépendances
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache libc6-compat python3 build-base g++ make && \
    corepack enable && corepack prepare pnpm@10.20.0 --activate

# Copier package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Installer les dépendances directement dans Alpine (nécessaire pour les binaires natifs)
RUN pnpm install --frozen-lockfile --prod

# Copier les fichiers compilés depuis le builder
COPY ./dist ./dist

# Changer la propriété de tous les fichiers copiés
RUN chown -R bot:nodejs /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/dist

USER bot

CMD ["node", "dist/index.js"]