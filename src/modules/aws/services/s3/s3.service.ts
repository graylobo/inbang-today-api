import { Readable } from 'stream';

import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { CLOUDFRONT_CLIENT, S3_CLIENT } from 'src/common/constants/token';

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
      const cloudFrontDomain = this.configService.get<string>(
        'aws.cloudFrontDomain',
      );
      return `https://${cloudFrontDomain}/${key}`;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
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

  async deleteOldObjects({
    bucketName,
    prefix,
    olderThan,
  }: {
    bucketName: string;
    prefix: string;
    olderThan: number;
  }): Promise<void> {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    try {
      const response = await this.s3Client.send(command);
      const now = new Date();
      const deletePromises =
        response.Contents?.filter((obj) => {
          const age = now.getTime() - obj.LastModified.getTime();
          return age > olderThan;
        }).map((obj) => {
          return this.deleteS3Object({
            bucketName,
            key: obj.Key,
          });
        }) || [];

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error listing/deleting old files:', error);
      throw error;
    }
  }
}
