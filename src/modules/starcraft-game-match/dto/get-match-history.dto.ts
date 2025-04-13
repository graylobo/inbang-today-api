import { IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StreamerGender } from 'src/entities/types/streamer.type';

export class GetMatchHistoryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  streamerId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mapId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(StreamerGender)
  gender?: StreamerGender;
}
