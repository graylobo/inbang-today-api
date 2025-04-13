# 빌드 단계: Node.js 애플리케이션 빌드
FROM node:18-slim AS builder

WORKDIR /app

# 빌드 의존성 설치
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# 모든 의존성 설치
RUN npm ci

COPY . .

RUN npm run build

# 실행 단계: 최신 Playwright 이미지 사용
FROM mcr.microsoft.com/playwright:v1.49.0-jammy AS production

WORKDIR /app

# 프로덕션 의존성 복사
COPY package*.json ./
RUN npm ci --omit=dev

# 빌드된 파일과 필요한 자산 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/global-bundle.pem ./global-bundle.pem
COPY .env.production ./

ARG ENVIRONMENT=production
ENV NODE_ENV=$ENVIRONMENT

# 컨테이너 실행 시 노출할 포트
EXPOSE 4000

# 애플리케이션 실행
CMD ["npm", "run", "start:prod"]
