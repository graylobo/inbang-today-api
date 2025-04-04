FROM node:18-alpine AS builder

WORKDIR /app

# 빌드 의존성 설치
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 모든 의존성 설치 (네이티브 모듈을 컨테이너 환경에서 빌드)
RUN npm ci

COPY . . 

RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

# 프로덕션 의존성만 설치 (네이티브 모듈을 현재 환경에서 다시 빌드)
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/global-bundle.pem ./global-bundle.pem
COPY .env.production ./ 

ARG ENVIRONMENT=production
ENV NODE_ENV=$ENVIRONMENT

EXPOSE 4000

CMD ["npm", "run", "start:prod"]
