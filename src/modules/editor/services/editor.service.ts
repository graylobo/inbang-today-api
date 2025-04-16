import { Injectable } from '@nestjs/common';
import { generateS3ObjectName } from 'src/modules/aws/utils';
import { S3Service } from '../../aws/services/s3/s3.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EditorService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async uploadImage(file: Express.Multer.File) {
    const fileName = generateS3ObjectName(file.originalname);
    const bucketName = this.configService.get<string>('aws.s3BucketName');

    try {
      const url = await this.s3Service.uploadFile({
        file,
        bucketName,
        key: `board-post/${fileName}`,
      });

      return {
        uploaded: true,
        url,
      };
    } catch (error) {
      console.log(error);
    }
  }

  @Cron('0 0 * * *')
  async cleanupTempFiles() {
    try {
      const bucketName = this.configService.get<string>('aws.s3BucketName');
      await this.s3Service.deleteOldObjects({
        bucketName,
        prefix: 'board-post/',
        olderThan: 24 * 60 * 60 * 1000,
      });
      console.log('Temp files cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}
