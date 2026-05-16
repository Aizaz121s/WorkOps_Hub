FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_PATH=/app/data/hrms.db

EXPOSE 5000
CMD ["node", "dist/server.js"]
