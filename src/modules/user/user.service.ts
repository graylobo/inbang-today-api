import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/enums/error-codes.enum';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Service } from 'src/modules/aws/services/s3/s3.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {}

  async create(data: Partial<User>) {
    const user = await this.userRepository.save(data);
    return user;
  }

  async findBySocialId(socialId: string) {
    const user = await this.userRepository.findOne({
      where: { socialId },
    });
    return user;
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    return user;
  }

  async findAll() {
    return this.userRepository.find({
      select: ['id', 'name', 'email', 'isAdmin', 'isSuperAdmin'],
      order: { name: 'ASC' },
    });
  }

  async updateAdminStatus(userId: number, isAdmin: boolean) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorCode.NOT_FOUND_USER);
    }

    user.isAdmin = isAdmin;
    await this.userRepository.save(user);

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  async updateSuperAdminStatus(userId: number, isSuperAdmin: boolean) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorCode.NOT_FOUND_USER);
    }

    user.isSuperAdmin = isSuperAdmin;

    // 슈퍼 관리자는 자동으로 관리자 권한도 부여
    if (isSuperAdmin) {
      user.isAdmin = true;
    }

    await this.userRepository.save(user);

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  async updateProfileImage(userId: number, file: Express.Multer.File) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(ErrorCode.NOT_FOUND_USER);
    }

    const fileExtension = file.originalname.split('.').pop();
    const key = `profile-images/${userId}-${Date.now()}.${fileExtension}`;
    const bucketName = this.configService.get<string>('aws.s3BucketName');

    try {
      const imageUrl = await this.s3Service.uploadFile({
        file,
        bucketName,
        key,
      });

      user.profileImage = imageUrl;
      await this.userRepository.save(user);

      return {
        success: true,
        data: {
          profileImage: imageUrl,
        },
      };
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      throw error;
    }
  }
}
