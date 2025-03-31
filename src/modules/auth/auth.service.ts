import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { GoogleClient } from 'src/modules/auth/client/google.client';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserService } from 'src/modules/user/user.service';

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
    console.log('googleLogin1:::');
    const accessToken = await this.googleClient.getToken(code);
    console.log('googleLogin2:::');
    const userInfo = await this.googleClient.getUserInfo(accessToken);
    console.log('googleLogin3:::');
    let user = await this.userService.findBySocialId(userInfo.socialId);
    console.log('googleLogin4:::');
    if (!user) {
      console.log('googleLogin5:::');
      user = await this.userService.create(userInfo);
    }
    console.log('googleLogin6:::');
    return this.generateToken(user);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  async createUser(userData: Partial<User>): Promise<User> {
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
