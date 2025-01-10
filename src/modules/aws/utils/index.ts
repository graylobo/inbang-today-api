import { format } from 'date-fns/format';
import * as crypto from 'node:crypto';

export function generateS3ObjectName(fileName: string): string {
  const now = new Date();
  const dateString = format(now, 'yyyyMMddHHmmssSSS');
  const randomString = crypto.randomBytes(10).toString('hex');
  const extension = fileName.split('.').pop() || '';
  return `${dateString}-${randomString}.${extension}`;
}
