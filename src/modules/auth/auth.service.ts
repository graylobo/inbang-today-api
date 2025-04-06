import { BadRequestException, Injectable } from '@nestjs/common';
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
      const { password, ...result } = user;
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

    const { password, ...userInfo } = currentUser;

    return {
      access_token: token,
      user: userInfo,
    };
  }

  async googleLogin(code: string) {
    const accessToken = await this.googleClient.getToken(code);
    const userInfo = await this.googleClient.getUserInfo(accessToken);
    let user = await this.userService.findBySocialId(userInfo.socialId);
    if (!user) {
      user = await this.userService.create(userInfo);
    }
    return this.generateToken(user);
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

  private generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }
}
