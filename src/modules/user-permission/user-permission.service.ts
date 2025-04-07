import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCrewPermission } from '../../entities/user-crew-permission.entity';
import { User } from '../../entities/user.entity';
import { Crew } from '../../entities/crew.entity';
import { ErrorCode } from 'src/common/enums/error-codes.enum';

@Injectable()
export class UserPermissionService {
  constructor(
    @InjectRepository(UserCrewPermission)
    private userCrewPermissionRepository: Repository<UserCrewPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Crew)
    private crewRepository: Repository<Crew>,
  ) {}

  async assignCrewPermission(
    userId: number,
    crewId: number,
  ): Promise<UserCrewPermission> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const crew = await this.crewRepository.findOne({ where: { id: crewId } });
    if (!crew) {
      throw new NotFoundException(`Crew with ID ${crewId} not found`);
    }

    // Check if the permission already exists
    const existingPermission = await this.userCrewPermissionRepository.findOne({
      where: {
        user: { id: userId },
        crew: { id: crewId },
      },
    });

    if (existingPermission) {
      return existingPermission; // Permission already exists, return it
    }

    // Create a new permission
    const newPermission = this.userCrewPermissionRepository.create({
      user,
      crew,
    });

    return this.userCrewPermissionRepository.save(newPermission);
  }

  async removeCrewPermission(userId: number, crewId: number): Promise<void> {
    const permission = await this.userCrewPermissionRepository.findOne({
      where: {
        user: { id: userId },
        crew: { id: crewId },
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission not found for User ${userId} and Crew ${crewId}`,
      );
    }

    await this.userCrewPermissionRepository.remove(permission);
  }

  async getUserPermissions(userId: number): Promise<UserCrewPermission[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['crewPermissions', 'crewPermissions.crew'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user.crewPermissions;
  }

  async getCrewsWithPermission(userId: number): Promise<Crew[]> {
    if (!userId) {
      throw new BadRequestException(ErrorCode.NOT_FOUND_USER);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // SuperAdmin만 모든 크루에 접근 가능
    if (user.isSuperAdmin) {
      return this.crewRepository.find();
    }

    // 일반 사용자는 권한이 있는 크루만 접근 가능
    const permissions = await this.userCrewPermissionRepository.find({
      where: { user: { id: userId } },
      relations: ['crew'],
    });

    return permissions.map((permission) => permission.crew);
  }

  async getAllCrews(): Promise<Crew[]> {
    return this.crewRepository.find();
  }

  async hasPermissionForCrew(userId: number, crewId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // SuperAdmin은 모든 크루에 대한 권한 있음
    if (user.isSuperAdmin) {
      return true;
    }

    // 특정 크루 권한 확인
    const permission = await this.userCrewPermissionRepository.findOne({
      where: {
        user: { id: userId },
        crew: { id: crewId },
      },
    });

    return !!permission;
  }

  async checkCrewEditPermission(userId: number, crewId: number): Promise<void> {
    const hasPermission = await this.hasPermissionForCrew(userId, crewId);

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to edit this crew',
      );
    }
  }

  // SuperAdmin 권한 확인 메서드
  async isSuperAdmin(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user.isSuperAdmin;
  }
}
