import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Platform } from '../../entities/platform.entity';
import { UserPlatformVerification } from '../../entities/user-platform-verification.entity';
import {
  IPlatformVerificationService,
  VerificationResult,
} from './interfaces/platform-verification.interface';
import { SoopVerificationService } from './services/soop-verification.service';

@Injectable()
export class PlatformVerificationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @InjectRepository(UserPlatformVerification)
    private userPlatformVerificationRepository: Repository<UserPlatformVerification>,
    private soopVerificationService: SoopVerificationService,
  ) {}

  async generateAuthCode(
    platformName: string,
    username: string,
    userId: number,
  ): Promise<string> {
    // 사용자 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 플랫폼 확인
    const platform = await this.platformRepository.findOne({
      where: { name: platformName },
    });
    if (!platform) {
      throw new NotFoundException('플랫폼을 찾을 수 없습니다.');
    }

    // 인증 코드 생성 (8자리 랜덤 문자열)
    const authCode = this.generateRandomCode(8);

    // 기존 인증 정보 확인
    let verification = await this.userPlatformVerificationRepository.findOne({
      where: { userId, platformId: platform.id },
    });

    if (verification) {
      // 기존 인증 정보 업데이트
      await this.userPlatformVerificationRepository.update(verification.id, {
        platformUsername: username,
        verificationCode: authCode,
        verificationCodeGeneratedAt: new Date(),
        isVerified: false,
        verifiedAt: null,
      });
    } else {
      // 새로운 인증 정보 생성
      verification = this.userPlatformVerificationRepository.create({
        userId,
        platformId: platform.id,
        platformUsername: username,
        verificationCode: authCode,
        verificationCodeGeneratedAt: new Date(),
        isVerified: false,
      });
      await this.userPlatformVerificationRepository.save(verification);
    }

    return authCode;
  }

  async verifyPlatformAuth(
    platformName: string,
    username: string,
    userId: number,
  ): Promise<VerificationResult> {
    // 사용자 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 플랫폼 확인
    const platform = await this.platformRepository.findOne({
      where: { name: platformName },
    });
    if (!platform) {
      throw new NotFoundException('플랫폼을 찾을 수 없습니다.');
    }

    // 인증 정보 확인
    const verification = await this.userPlatformVerificationRepository.findOne({
      where: { userId, platformId: platform.id },
    });

    if (!verification) {
      return {
        success: false,
        message: '인증 정보를 찾을 수 없습니다.',
      };
    }

    // 플랫폼별 인증 로직 실행
    const verificationService =
      this.getPlatformVerificationService(platformName);
    if (!verificationService) {
      return {
        success: false,
        message: '지원하지 않는 플랫폼입니다.',
      };
    }

    const result = await verificationService.verify(username, userId);

    if (result.success) {
      // 인증 성공 시 상태 업데이트
      await this.userPlatformVerificationRepository.update(verification.id, {
        isVerified: true,
        verifiedAt: new Date(),
        verificationCode: null, // 인증 코드 삭제
      });
    }

    return result;
  }

  async getPlatformAuthStatus(
    userId: number,
    platformName: string,
  ): Promise<{
    isVerified: boolean;
    username?: string;
    verifiedAt?: string;
  }> {
    const platform = await this.platformRepository.findOne({
      where: { name: platformName },
    });
    if (!platform) {
      throw new NotFoundException('플랫폼을 찾을 수 없습니다.');
    }

    const verification = await this.userPlatformVerificationRepository.findOne({
      where: { userId, platformId: platform.id },
    });

    if (!verification) {
      return {
        isVerified: false,
      };
    }

    return {
      isVerified: verification.isVerified,
      username: verification.platformUsername,
      verifiedAt: verification.verifiedAt?.toISOString(),
    };
  }

  private getPlatformVerificationService(
    platformName: string,
  ): IPlatformVerificationService | null {
    // 플랫폼별 인증 서비스 반환
    if (platformName === 'soop') {
      return this.soopVerificationService;
    }
    return null;
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
