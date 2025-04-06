import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCrewPermission } from '../../entities/user-crew-permission.entity';
import { User } from '../../entities/user.entity';
import { Crew } from '../../entities/crew.entity';

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

    // Admin has permission for all crews
    if (user.isAdmin) {
      return true;
    }

    // Check specific permission
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
}
