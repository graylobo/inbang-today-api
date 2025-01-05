import { IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMatchHistoryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  streamerId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mapId?: number;
}
