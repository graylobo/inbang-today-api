import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

// 환경변수 로드
ConfigModule.forRoot({
  envFilePath: (() => {
    switch (process.env.NODE_ENV) {
      case 'development':
        return '.env.development';
      case 'production':
        return '.env.production';
      default:
        return '.env';
    }
  })(),
});

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // 엔티티 경로
  entities: ['src/**/*.entity.ts'],

  // 마이그레이션 설정
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',

  // 개발환경 설정
  synchronize: false,
  logging: ['error', 'migration'],
});
