import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';

/**
 * 첫 번째 슈퍼 관리자를 생성하거나 기존 사용자를 슈퍼 관리자로 승격하는 스크립트
 *
 * 사용법:
 * 1. 이메일로 승격시키기: ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts email@example.com
 * 2. 사용자 ID로 승격시키기: ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts --id 1
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    const args = process.argv.slice(2);
    let user: User = null;

    if (args.length === 0) {
      console.error(
        '사용법: ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts [이메일 또는 --id 사용자ID]',
      );
      process.exit(1);
    }

    // ID로 사용자 찾기
    if (args[0] === '--id' && args[1]) {
      const userId = parseInt(args[1], 10);
      user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error(`ID가 ${userId}인 사용자를 찾을 수 없습니다.`);
        process.exit(1);
      }
    }
    // 이메일로 사용자 찾기
    else {
      const email = args[0];
      user = await userRepository.findOne({ where: { email } });
      if (!user) {
        console.error(`이메일이 ${email}인 사용자를 찾을 수 없습니다.`);
        process.exit(1);
      }
    }

    // 이미 슈퍼 관리자인 경우
    if (user.isSuperAdmin) {
      console.log(
        `사용자 ${user.name}(${user.email})는 이미 슈퍼 관리자입니다.`,
      );
      process.exit(0);
    }

    // 슈퍼 관리자로 승격
    user.isSuperAdmin = true;
    user.isAdmin = true; // 슈퍼 관리자는 관리자 권한도 가짐

    await userRepository.save(user);

    console.log(
      `사용자 ${user.name}(${user.email})가 슈퍼 관리자로 승격되었습니다.`,
    );
  } catch (error) {
    console.error('슈퍼 관리자 생성 중 오류 발생:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
