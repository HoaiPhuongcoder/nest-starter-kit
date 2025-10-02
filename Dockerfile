# =================================================================
# STAGE 1: BUILDER - Thay đổi phiên bản ở đây
# =================================================================
FROM node:22-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production


# =================================================================
# STAGE 2: PRODUCTION - Và thay đổi cả ở đây
# =================================================================
FROM node:22-alpine

WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

CMD [ "node", "dist/main" ]