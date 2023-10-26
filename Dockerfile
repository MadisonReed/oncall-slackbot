FROM oven/bun:latest

COPY package.json ./
COPY bun.lockb ./
COPY src/ ./src/
COPY tsconfig.json ./

RUN bun install
CMD ["bun", "start"]
