import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import * as puppeteer from 'puppeteer';
import { User } from '../../entities/user.entity';
// import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
// import { GetUser } from '../../modules/auth/decorators/get-user.decorator';

@Injectable()
export class SoopAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private httpService: HttpService,
  ) {}

  async generateAuthCode(username: string, userId: number): Promise<string> {
    // 사용자 확인
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 인증 코드 생성 (8자리 랜덤 문자열)
    const authCode = this.generateRandomCode(8);

    // 사용자 정보에 인증 코드 저장
    await this.userRepository.update(userId, {
      soopAuthCode: authCode,
      soopUsername: username,
      soopAuthCodeGeneratedAt: new Date(),
    });

    return authCode;
  }

  async verifySoopAuth(
    username: string,
    userId: number,
  ): Promise<{
    success: boolean;
    message: string;
    userInfo?: { username: string; profileMessage: string };
  }> {
    let browser;
    try {
      // 사용자 확인
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // Puppeteer 브라우저 시작
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // User-Agent 설정
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      );

      // 페이지 로드 및 JavaScript 실행 대기
      const profileUrl = `https://ch.sooplive.co.kr/${username}`;
      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 프로필 정보가 로드될 때까지 대기
      await page.waitForSelector('.bs-infomation', { timeout: 10000 });

      // 프로필 메시지 파싱
      const profileMessage = await page.evaluate(() => {
        const explanationElement = document.querySelector(
          '.bs-infomation .explanation p span',
        );
        return explanationElement?.textContent?.trim() || '';
      });

      if (!profileMessage) {
        return {
          success: false,
          message: '프로필 메시지를 찾을 수 없습니다.',
        };
      }

      // 인증 코드 확인
      if (profileMessage !== user.soopAuthCode) {
        return {
          success: false,
          message:
            '인증 코드가 일치하지 않습니다. 프로필 메시지를 확인해주세요.',
        };
      }

      // 인증 성공 - 사용자 정보 업데이트
      await this.userRepository.update(userId, {
        soopVerified: true,
        soopVerifiedAt: new Date(),
        soopAuthCode: null, // 인증 코드 삭제
      });

      return {
        success: true,
        message: '숲 인증이 완료되었습니다.',
        userInfo: {
          username: username,
          profileMessage: profileMessage,
        },
      };
    } catch (error) {
      console.error('숲 인증 확인 중 오류:', error);
      return {
        success: false,
        message: '인증 확인 중 오류가 발생했습니다.',
      };
    } finally {
      // 브라우저 종료
      if (browser) {
        await browser.close();
      }
    }
  }

  async getSoopAuthStatus(userId: number): Promise<{
    isVerified: boolean;
    username?: string;
    verifiedAt?: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return {
      isVerified: user.soopVerified || false,
      username: user.soopUsername,
      verifiedAt: user.soopVerifiedAt?.toISOString(),
    };
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
