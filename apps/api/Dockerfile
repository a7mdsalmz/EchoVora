FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/echovora

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build -w packages/shared && npm run prisma:generate -w apps/api && npm run build -w apps/api

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
