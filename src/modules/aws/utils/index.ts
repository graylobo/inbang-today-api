import { format } from 'date-fns/format';
import * as crypto from 'node:crypto';
import { CdnConfig } from 'src/config/env/env.type';

export function generateS3ObjectName(fileName: string): string {
  const now = new Date();
  const dateString = format(now, 'yyyyMMddHHmmssSSS');
  const randomString = crypto.randomBytes(10).toString('hex');
  const extension = fileName.split('.').pop() || '';
  return `${dateString}-${randomString}.${extension}`;
}
export function selectCdnByBucketName(
  bucketName: string,
  cdnConfig: CdnConfig
): string {
  const cdnMap: Record<string, string> = {
    [process.env.AWS_S3_ARTST_APP_BUCKET_NAME]: cdnConfig.appCdn,
    [process.env.AWS_S3_ARTST_USERS_BUCKET_NAME]: cdnConfig.usersCdn,
    [process.env.AWS_S3_ARTST_DG_BUCKET_NAME]: cdnConfig.dgCdn
  };

  const cdnUrl = cdnMap[bucketName];

  if (!cdnUrl) {
    throw new Error(`Invalid bucket name: ${bucketName}`);
  }

  return cdnUrl;
}
export function selectDistributionIdByBucketName(
  bucketName: string,
  cdnConfig: CdnConfig
): string {
  const distributionMap: Record<string, string> = {
    [process.env.AWS_S3_ARTST_APP_BUCKET_NAME]: cdnConfig.appDistributionId,
    [process.env.AWS_S3_ARTST_USERS_BUCKET_NAME]: cdnConfig.usersDistributionId,
    [process.env.AWS_S3_ARTST_DG_BUCKET_NAME]: cdnConfig.dgDistributionId
  };

  const distributionId = distributionMap[bucketName];

  if (!distributionId) {
    throw new Error(`Invalid bucket name: ${bucketName}`);
  }

  return distributionId;
}
