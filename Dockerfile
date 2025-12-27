# =============================================================================
# Base Stage - Common setup with non-root user
# =============================================================================
FROM node:22-alpine AS base

RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# =============================================================================
# Builder Stage - Install dependencies and build
# =============================================================================
FROM base AS builder

RUN corepack enable

COPY --chown=nodejs:nodejs package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY --chown=nodejs:nodejs tsconfig.json tsoa.json ./
COPY --chown=nodejs:nodejs src/ ./src/

RUN yarn build
RUN yarn workspaces focus --production

# =============================================================================
# Production Stage - Final minimal image
# =============================================================================
FROM base AS production

ENV APP_ENV=production

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "/app/build/server.js"]
