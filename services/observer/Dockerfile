FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY index.js ./

ENV PORT=8082
ENV NODE_ENV=production

EXPOSE 8082

CMD ["node", "index.js"]
