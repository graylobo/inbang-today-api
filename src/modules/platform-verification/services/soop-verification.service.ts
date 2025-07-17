import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import {
  IPlatformVerificationService,
  VerificationResult,
} from '../interfaces/platform-verification.interface';
import { UserPlatformVerification } from '../../../entities/user-platform-verification.entity';

@Injectable()
export class SoopVerificationService implements IPlatformVerificationService {
  constructor(
    private httpService: HttpService,
    @InjectRepository(UserPlatformVerification)
    private userPlatformVerificationRepository: Repository<UserPlatformVerification>,
  ) {}

  async generateVerificationCode(
    username: string,
    userId: number,
  ): Promise<string> {
    // 인증 코드 생성은 PlatformVerificationService에서 처리
    // 이 메서드는 인터페이스 구현을 위한 것
    throw new Error('Method not implemented.');
  }

  async verify(username: string, userId: number): Promise<VerificationResult> {
    // 인증 코드 확인
    const verification = await this.userPlatformVerificationRepository.findOne({
      where: { userId, platformUsername: username },
      relations: ['platform'],
    });

    if (!verification || !verification.verificationCode) {
      return {
        success: false,
        message: '인증 코드를 찾을 수 없습니다.',
      };
    }

    // 인증 코드 유효성 검사 (30분 이내)
    const codeGeneratedAt = verification.verificationCodeGeneratedAt;
    if (
      !codeGeneratedAt ||
      Date.now() - codeGeneratedAt.getTime() > 30 * 60 * 1000
    ) {
      return {
        success: false,
        message: '인증 코드가 만료되었습니다.',
      };
    }

    let browser;
    try {
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

      // 인증 코드가 프로필 메시지에 포함되어 있는지 확인
      if (!profileMessage.includes(verification.verificationCode)) {
        return {
          success: false,
          message: '프로필 메시지에 인증 코드가 포함되어 있지 않습니다.',
        };
      }

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
}
