export type DatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
};

export type RedisConfig = {
  host: string;
  port: number;
};

export type AwsConfig = {
  s3BucketName: string;
  cloudFrontDomain: string;
};

export type Configuration = {
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  soop: {
    loginUrl: string;
    id: string;
    pw: string;
    mainUrl: string;
  };
  aws: AwsConfig;
};

export default (): Configuration => {
  return {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      name: process.env.DB_NAME || 'database',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
    },
    soop: {
      loginUrl: process.env.SOOP_LOGIN_URL,
      id: process.env.SOOP_LOGIN_ID,
      pw: process.env.SOOP_LOGIN_PW,
      mainUrl: process.env.SOOP_MAIN_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    aws: {
      s3BucketName: process.env.AWS_S3_BUCKET_NAME || 'inbang-today',
      cloudFrontDomain:
        process.env.AWS_CLOUDFRONT_DOMAIN || 'file.inbangtoday.com',
    },
  };
};
