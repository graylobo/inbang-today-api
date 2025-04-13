import { IsEnum, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { StreamerGender } from 'src/entities/types/streamer.type';

export class GetStreamerEloRankingDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(StreamerGender)
  gender?: StreamerGender;

  @IsOptional()
  @IsNumber()
  minMatchCount?: number; // 최소 경기 수 필터
}
