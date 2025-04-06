import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/modules/aws/services/s3/s3.service';

import { AwsProvider } from './providers/aws.provider';
import { CLOUDFRONT_CLIENT, S3_CLIENT } from 'src/common/constants/token';

@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        AwsProvider.getS3Client(configService),
    },
    {
      provide: CLOUDFRONT_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        AwsProvider.getCloudFrontClient(configService),
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class AwsModule {}
