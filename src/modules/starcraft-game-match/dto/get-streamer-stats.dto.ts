import { IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetStreamerStatsDto {
  @IsNumber()
  @Type(() => Number)
  streamerId: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
