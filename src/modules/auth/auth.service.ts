import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ErrorCode } from 'src/common/enums/error-codes.enum';
import { GoogleClient } from 'src/modules/auth/client/google.client';
import { UserService } from 'src/modules/user/user.service';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly googleClient: GoogleClient,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateUser(name: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { name } });
    if (!user) {
      throw new BadRequestException(ErrorCode.INVALID_USERNAME_OR_PASSWORD);
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      const result = { ...user };
      delete result.password;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const currentUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    console.log('Login User:', currentUser);

    const payload = { name: currentUser.name, sub: currentUser.id };
    console.log('Token Payload:', payload);
    console.log('JWT Secret:', process.env.JWT_SECRET);

    const token = this.jwtService.sign(payload);

    const userInfo = { ...currentUser };
    delete userInfo.password;

    return {
      access_token: token,
      user: userInfo,
    };
  }

  async googleLogin(code: string) {
    const accessToken = await this.googleClient.getToken(code);
    const socialUserInfo = await this.googleClient.getUserInfo(accessToken);

    // 기존 사용자인지 확인
    const existingUser = await this.userService.findBySocialId(
      socialUserInfo.socialId,
    );

    if (existingUser) {
      // 기존 사용자면 로그인 처리
      const token = this.generateToken(existingUser);
      return {
        access_token: token,
        isNewUser: false,
      };
    } else {
      // 새로운 사용자면 임시 토큰 생성 (사용자 정보는 아직 저장하지 않음)
      const tempToken = this.generateTempToken(socialUserInfo);
      return {
        access_token: tempToken,
        isNewUser: true,
        tempUserInfo: socialUserInfo, // 클라이언트에서 사용할 수 있도록 필요한 정보만 포함
      };
    }
  }

  // 임시 토큰 생성 (사용자 정보를 포함하지만 DB에 저장되지 않은 상태)
  private generateTempToken(socialUserInfo: any) {
    const payload = {
      email: socialUserInfo.email,
      socialId: socialUserInfo.socialId,
      // sub 필드가 없음 (아직 DB에 저장되지 않았으므로 ID 없음)
      isTempUser: true, // 임시 사용자 표시
    };

    // 짧은 만료 시간 설정 (예: 30분)
    return this.jwtService.sign(payload, { expiresIn: '30m' });
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async createUser(userData: Partial<User>): Promise<User> {
    // Check if user with the same name or email already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ name: userData.name }, { email: userData.email }],
    });

    if (existingUser) {
      throw new BadRequestException(ErrorCode.DUPLICATE_NAME);
    }

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async isNicknameAvailable(nickname: string): Promise<boolean> {
    const existingUser = await this.userRepository.findOne({
      where: { name: nickname },
    });
    return !existingUser;
  }

  // 닉네임 설정과 함께 소셜 로그인 사용자 최종 생성
  async createSocialUserWithNickname(
    socialUserInfo: any,
    nickname: string,
  ): Promise<User> {
    // 닉네임 중복 체크
    const isAvailable = await this.isNicknameAvailable(nickname);
    if (!isAvailable) {
      throw new BadRequestException(ErrorCode.DUPLICATE_NAME);
    }

    // 이미 같은 소셜 ID로 가입된 사용자가 있는지 한번 더 확인
    const existingUser = await this.userService.findBySocialId(
      socialUserInfo.socialId,
    );
    if (existingUser) {
      throw new BadRequestException('이미 가입된 사용자입니다.');
    }

    // 새 사용자 생성
    const newUser = await this.userService.create({
      ...socialUserInfo,
      name: nickname,
    });

    return newUser;
  }

  async updateUserNickname(userId: number, nickname: string): Promise<User> {
    // First check if the nickname is available
    const isAvailable = await this.isNicknameAvailable(nickname);
    if (!isAvailable) {
      throw new BadRequestException(ErrorCode.DUPLICATE_NAME);
    }

    // Find the user by ID
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.NOT_FOUND_USER);
    }

    // Update the nickname
    user.name = nickname;
    await this.userRepository.save(user);

    const userInfo = { ...user };
    delete userInfo.password;
    return userInfo as User;
  }

  private generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }
}
