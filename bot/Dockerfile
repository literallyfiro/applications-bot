FROM denoland/deno:latest

RUN mkdir -p /app/applications-bot/bot
WORKDIR /app/applications-bot/bot

COPY . ./

RUN deno cache src/index.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "src/index.ts"] 