FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . ./

ENV PORT=8081
ENV NODE_ENV=production

EXPOSE 8081

CMD ["node", "index.js"]
