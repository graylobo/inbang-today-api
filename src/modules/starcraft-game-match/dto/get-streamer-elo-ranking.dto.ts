import { IsEnum, IsOptional, IsDateString } from 'class-validator';
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
}
