# syntax=docker/dockerfile:1
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY index.html vite.config.ts openapi-ts.config.ts tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY scripts/build-deploy.mjs scripts/check-bundle-budget.mjs scripts/validate-build-env.mjs scripts/validate-build-env.d.mts scripts/load-environment.mjs scripts/load-environment.d.mts ./scripts/
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE
ARG VITE_API_BASE_URL
ARG DEPLOY_ENV=test
RUN MOODLY_ENV=$DEPLOY_ENV npm run build:deploy

FROM nginx:1.30.6-alpine@sha256:583b7f2fce1cdb8da5ad5c39ebd3c33b98b87d493190e548bdee1fa8c619c311 AS runtime
ARG DEPLOY_ENV=test
ARG SOURCE_REVISION=unknown
ARG IMAGE_VERSION=local
LABEL org.opencontainers.image.title="Moodly frontend" \
      org.opencontainers.image.source="https://github.com/tlavu2004/moodly-frontend" \
      org.opencontainers.image.revision=$SOURCE_REVISION \
      org.opencontainers.image.version=$IMAGE_VERSION \
      io.moodly.environment=$DEPLOY_ENV
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
