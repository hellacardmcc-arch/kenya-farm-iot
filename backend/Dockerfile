# Kenya Farm IoT - Backend
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build (copy source and compile)
COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript --no-save && npm run build:tsc && npm uninstall typescript

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
