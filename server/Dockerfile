FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY *.js schema.sql ./
COPY zones/ ./zones/

EXPOSE 8081

CMD ["node", "server.js"]
