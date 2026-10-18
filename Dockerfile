
FROM oven/bun:1 AS build

WORKDIR /app
COPY . .

RUN bun install --frozen-lockfile

RUN bun run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "start"]
