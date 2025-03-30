# Docker 배포 가이드 - inbang-today-server

## 사전 준비사항

- Docker 설치
- Docker Compose 설치
- `.env.production` 파일 설정 (민감한 정보 업데이트)

## 배포 절차

1. 프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 이미지를 빌드하고 컨테이너를 시작합니다:

```bash
docker-compose up -d
```

2. 애플리케이션, PostgreSQL 및 Redis 컨테이너가 정상적으로 실행되고 있는지 확인합니다:

```bash
docker-compose ps
```

3. 로그를 확인하려면 다음 명령어를 사용합니다:

```bash
docker-compose logs -f app
```

## 환경 변수 설정

다음 환경 변수를 `.env.production` 파일에서 업데이트하세요:

- `DB_USERNAME`: PostgreSQL 사용자 이름
- `DB_PASSWORD`: PostgreSQL 비밀번호
- `DB_NAME`: 데이터베이스 이름
- `JWT_SECRET`: JWT 토큰 비밀키
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키 ID
- `AWS_SECRET_ACCESS_KEY`: AWS 비밀 액세스 키
- `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿
- `CLIENT_URL`: 클라이언트 애플리케이션 URL
- `API_URL`: API 서버 URL

## 컨테이너 관리

- 컨테이너 중지: `docker-compose stop`
- 컨테이너 재시작: `docker-compose restart`
- 컨테이너 삭제 및 볼륨 유지: `docker-compose down`
- 컨테이너 삭제 및 볼륨 제거: `docker-compose down -v`

## 데이터 백업

PostgreSQL 데이터를 백업하려면:

```bash
docker exec inbang-postgres pg_dump -U postgres inbang > backup.sql
```

## 트러블슈팅

1. 데이터베이스 연결 문제

   - 환경 변수 설정이 올바른지 확인
   - PostgreSQL 컨테이너가 실행 중인지 확인

2. Redis 연결 문제

   - Redis 컨테이너가 실행 중인지 확인
   - 환경 변수 설정이 올바른지 확인

3. 이미지 빌드 실패
   - 로그를 확인하여 빌드 오류 식별
   - Node.js 버전 호환성 확인
