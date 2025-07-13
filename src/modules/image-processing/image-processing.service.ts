import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  maxSizeKB?: number; // 옵셔널 사이즈 제한
}

export interface ProcessedImage {
  buffer: Buffer;
  mimetype: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
}

@Injectable()
export class ImageProcessingService {
  /**
   * 크기 제한 압축 - 지정된 크기 이하가 될 때까지 품질 조정
   */
  private async processWithSizeLimit(
    file: Express.Multer.File,
    maxSizeKB: number,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const { width = 512, height = 512, fit = 'cover' } = options;

    const maxAttempts = 8;
    const minQuality = 20;
    const qualityStep = 10;

    // 품질 배열로 시도할 값들 미리 정의
    const qualityLevels = [];
    for (let q = 90; q >= minQuality; q -= qualityStep) {
      qualityLevels.push(q);
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const quality = qualityLevels[attempt] || minQuality;

      const processedBuffer = await sharp(file.buffer)
        .resize(width, height, { fit })
        .webp({ quality })
        .toBuffer();

      const currentSizeKB = processedBuffer.length / 1024;
      console.log(
        `🔄 압축 시도 ${attempt + 1}: ${quality}% 품질 → ${currentSizeKB.toFixed(1)}KB`,
      );

      // 목표 크기 달성 시 성공 반환
      if (processedBuffer.length <= maxSizeKB * 1024) {
        console.log(
          `✅ 크기 제한 성공: ${currentSizeKB.toFixed(1)}KB (목표: ${maxSizeKB}KB)`,
        );
        return {
          buffer: processedBuffer,
          mimetype: 'image/webp',
          originalSize: file.size,
          processedSize: processedBuffer.length,
          compressionRatio:
            ((file.size - processedBuffer.length) / file.size) * 100,
        };
      }

      // 마지막 시도면 경고 후 그대로 반환
      if (attempt === maxAttempts - 1) {
        console.warn(
          `⚠️  목표 크기 ${maxSizeKB}KB를 달성하지 못함. 최종 크기: ${currentSizeKB.toFixed(1)}KB`,
        );
        return {
          buffer: processedBuffer,
          mimetype: 'image/webp',
          originalSize: file.size,
          processedSize: processedBuffer.length,
          compressionRatio:
            ((file.size - processedBuffer.length) / file.size) * 100,
        };
      }
    }

    // 이론상 도달하지 않지만 타입 안전성을 위해
    throw new Error('Image processing failed unexpectedly');
  }

  /**
   * 프로필 이미지 처리 - WebP 형식으로 변환 및 압축
   */
  async processProfileImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      width = 512,
      height = 512,
      quality = 80,
      fit = 'cover',
      maxSizeKB,
    } = options;

    // 크기 제한이 있는 경우 크기 제한 압축 사용
    if (maxSizeKB) {
      return this.processWithSizeLimit(file, maxSizeKB, {
        width,
        height,
        fit,
      });
    }

    // 기본 압축 (현재 방식 유지)
    const processedBuffer = await sharp(file.buffer)
      .resize(width, height, { fit })
      .webp({ quality })
      .toBuffer();

    return {
      buffer: processedBuffer,
      mimetype: 'image/webp',
      originalSize: file.size,
      processedSize: processedBuffer.length,
      compressionRatio:
        ((file.size - processedBuffer.length) / file.size) * 100,
    };
  }

  /**
   * 썸네일 이미지 처리 - 작은 크기로 압축
   */
  async processThumbnail(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      width = 150,
      height = 150,
      quality = 70,
      format = 'webp',
      fit = 'cover',
    } = options;

    const processedBuffer = await sharp(file.buffer)
      .resize(width, height, { fit })
      .webp({ quality })
      .toBuffer();

    return {
      buffer: processedBuffer,
      mimetype: 'image/webp',
      originalSize: file.size,
      processedSize: processedBuffer.length,
      compressionRatio:
        ((file.size - processedBuffer.length) / file.size) * 100,
    };
  }

  /**
   * 일반 이미지 처리 - 게시판 이미지 등에 사용
   */
  async processGeneralImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      width = 1920,
      height = 1920,
      quality = 80,
      format = 'webp',
      fit = 'inside',
    } = options;

    const processedBuffer = await sharp(file.buffer)
      .resize(width, height, { fit, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return {
      buffer: processedBuffer,
      mimetype: 'image/webp',
      originalSize: file.size,
      processedSize: processedBuffer.length,
      compressionRatio:
        ((file.size - processedBuffer.length) / file.size) * 100,
    };
  }

  /**
   * 애니메이션 이미지 처리 (GIF → WebP)
   */
  async processAnimatedImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      width = 512,
      height = 512,
      quality = 80,
      format = 'webp',
      fit = 'inside',
    } = options;

    try {
      const processedBuffer = await sharp(file.buffer, { animated: true })
        .resize(width, height, { fit, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      return {
        buffer: processedBuffer,
        mimetype: 'image/webp',
        originalSize: file.size,
        processedSize: processedBuffer.length,
        compressionRatio:
          ((file.size - processedBuffer.length) / file.size) * 100,
      };
    } catch (error) {
      console.error(
        'Animation processing failed, falling back to static:',
        error,
      );
      // 애니메이션 처리 실패 시 정적 이미지로 처리
      return this.processGeneralImage(file, options);
    }
  }

  /**
   * 이미지 메타데이터 추출
   */
  async getImageMetadata(buffer: Buffer) {
    return await sharp(buffer).metadata();
  }

  /**
   * 이미지 타입 확인 및 처리 방식 결정
   */
  async processImageByType(
    file: Express.Multer.File,
    type: 'profile' | 'thumbnail' | 'general' = 'general',
  ): Promise<ProcessedImage> {
    const metadata = await this.getImageMetadata(file.buffer);

    // GIF 애니메이션 처리
    if (file.mimetype === 'image/gif') {
      return this.processAnimatedImage(file);
    }

    // 타입별 처리
    switch (type) {
      case 'profile':
        return this.processProfileImage(file);
      case 'thumbnail':
        return this.processThumbnail(file);
      case 'general':
      default:
        return this.processGeneralImage(file);
    }
  }

  /**
   * 파일 크기를 읽기 쉬운 형태로 변환
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 압축 결과 로깅
   */
  logCompressionResult(result: ProcessedImage, filename: string): void {
    console.log(`🖼️  Image Processing Result for ${filename}:`);
    console.log(
      `📏 Original size: ${this.formatFileSize(result.originalSize)}`,
    );
    console.log(
      `📦 Processed size: ${this.formatFileSize(result.processedSize)}`,
    );
    console.log(`📊 Compression ratio: ${result.compressionRatio.toFixed(1)}%`);
    console.log(`🔄 Format: ${result.mimetype}`);
  }
}
