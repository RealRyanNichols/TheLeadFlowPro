# syntax=docker/dockerfile:1.7
#
# The LeadFlow Pro web app for the DigitalOcean droplet. Built on the droplet
# by deploy/droplet/deploy.sh; see docs/infrastructure/droplet.md.
#
# The build stage runs the same gate Vercel runs (calculations, facts, tools,
# visuals, social, then next build) with the production variables from
# /etc/theleadflowpro/web.env, passed in as a BuildKit secret so no value is
# written into an image layer.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=webenv,required=true \
    NODE_OPTIONS=--max-old-space-size=3072 \
    node deploy/droplet/with-env.mjs /run/secrets/webenv -- npm run build

FROM node:22-bookworm-slim AS web
WORKDIR /app
ARG GIT_SHA=unknown
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    GIT_SHA=${GIT_SHA}
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
