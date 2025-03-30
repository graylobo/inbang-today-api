import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
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
      select: ['id', 'socialId', 'email', 'name', 'createdAt', 'updatedAt'],
    });
    return user;
  }
}
