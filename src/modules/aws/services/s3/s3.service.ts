import { Readable } from 'stream';

import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { CLOUDFRONT_CLIENT, S3_CLIENT } from 'src/constants/token';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  constructor(
    @Inject(S3_CLIENT) private s3Client: S3Client,
    @Inject(CLOUDFRONT_CLIENT) private cloudFront: CloudFrontClient,
    private configService: ConfigService,
  ) {}

  async uploadFile({
    file,
    bucketName,
    key,
  }: {
    file: Express.Multer.File;
    bucketName: string;
    key: string;
  }): Promise<string> {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      return this.configService.get<string>('APP_CDN_URL') + `/${key}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
    }
  }

  async getS3Object({
    key,
    bucketName,
  }: {
    key: string;
    bucketName: string;
  }): Promise<{
    Body: Readable;
    ContentType: string;
    ContentLength: number;
  }> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      return {
        Body: response.Body as Readable,
        ContentType: response.ContentType,
        ContentLength: response.ContentLength,
      };
    } catch (error) {
      console.error('Error downloading file from S3:', error);
    }
  }

  async deleteS3Object({
    key,
    bucketName,
  }: {
    key: string;
    bucketName: string;
  }): Promise<void> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('Error deleting file from S3:', error);
    }
  }
}
