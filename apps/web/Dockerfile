FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --include=dev --ignore-scripts

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build -w packages/shared && npm run build -w apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "apps/web"]
