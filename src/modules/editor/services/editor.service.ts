import { Injectable } from '@nestjs/common';
import { generateS3ObjectName } from 'src/modules/aws/utils';
import { S3Service } from '../../aws/services/s3/s3.service';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ImageProcessingService } from 'src/modules/image-processing/image-processing.service';

@Injectable()
export class EditorService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async uploadImage(file: Express.Multer.File) {
    const bucketName = this.configService.get<string>('aws.s3BucketName');

    try {
      // 이미지 처리 (Sharp로 압축 및 WebP 변환)
      const processedImage =
        await this.imageProcessingService.processImageByType(file, 'general');

      // 압축 결과 로깅
      this.imageProcessingService.logCompressionResult(
        processedImage,
        file.originalname,
      );

      // WebP 확장자로 파일명 생성
      const fileName = generateS3ObjectName(file.originalname).replace(
        /\.[^/.]+$/,
        '.webp',
      );

      // 처리된 이미지로 파일 객체 생성
      const processedFile: Express.Multer.File = {
        ...file,
        buffer: processedImage.buffer,
        mimetype: processedImage.mimetype,
        size: processedImage.processedSize,
      };

      const url = await this.s3Service.uploadFile({
        file: processedFile,
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
