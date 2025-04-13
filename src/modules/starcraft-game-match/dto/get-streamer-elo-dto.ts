import { IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StreamerGender } from 'src/entities/types/streamer.type';

export class GetStreamerEloDto {
  @IsNumber()
  @Type(() => Number)
  streamerId: number;

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
