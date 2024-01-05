FROM node:16-alpine as ts-environment
WORKDIR /usr/app

COPY package.json ./

# COPY package-lock.json ./
COPY tsconfig*.json ./

RUN npm install

COPY . ./

RUN npm run build

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080/tcp

CMD ["node", "dist/src/index.js"]