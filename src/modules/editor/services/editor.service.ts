import { Injectable } from '@nestjs/common';
import { generateS3ObjectName } from 'src/modules/aws/utils';
import { S3Service } from '../../aws/services/s3/s3.service';
import { Cron } from '@nestjs/schedule';
@Injectable()
export class EditorService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadImage(file: Express.Multer.File) {
    const fileName = generateS3ObjectName(file.originalname);

    try {
      const url = await this.s3Service.uploadFile({
        file,
        bucketName: 'artst-app',
        key: `temp/${fileName}`,
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
      await this.s3Service.deleteOldObjects({
        bucketName: 'artst-app',
        prefix: 'temp/',
        olderThan: 24 * 60 * 60 * 1000,
      });
      console.log('Temp files cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}
