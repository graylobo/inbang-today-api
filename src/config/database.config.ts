import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['dist/**/*.entity{.ts,.js}'],
    ...(process.env.NODE_ENV === 'production' &&
      process.env.DISABLE_SSL !== 'true' && {
        ssl: {
          ca: 'global-bundle.pem',
        },
        extra: {
          ssl: { rejectUnauthorized: false },
        },
      }),
  };

  // 환경별 설정
  switch (process.env.NODE_ENV) {
    case 'development':
      return {
        ...baseConfig,
        synchronize: process.env.USE_SYNC === 'true', // 환경변수로 제어
        logging: ['error', 'schema'],
        // 개발자가 선택할 수 있도록
      };

    case 'test':
      return {
        ...baseConfig,
        synchronize: true, // 테스트는 sync 사용
        dropSchema: true, // 테스트 시마다 초기화
        logging: false,
      };

    case 'production':
      return {
        ...baseConfig,
        synchronize: false, // 프로덕션은 절대 sync 금지
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsRun: true,
        logging: ['error'],
      };

    default:
      return {
        ...baseConfig,
        synchronize: false,
        migrations: ['dist/migrations/*{.ts,.js}'],
        logging: ['error', 'schema'],
      };
  }
};
