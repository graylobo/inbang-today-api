import { IsOptional, IsDateString } from 'class-validator';

export class GetStreamerEloRankingDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
