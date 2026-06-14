FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . ./

ENV PORT=8081
ENV NODE_ENV=production

EXPOSE 8081

CMD ["node", "index.js"]
