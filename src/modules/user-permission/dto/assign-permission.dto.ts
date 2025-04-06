import { IsNumber, IsPositive } from 'class-validator';

export class AssignPermissionDto {
  @IsNumber()
  @IsPositive()
  userId: number;

  @IsNumber()
  @IsPositive()
  crewId: number;
}
