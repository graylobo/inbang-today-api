import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { StreamerGender } from 'src/entities/types/streamer.type';

export class GetMonthlyRankingDto {
  /**
   * 조회할 연-월 (YYYY-MM 형식)
   * @example "2025-04"
   */
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: '날짜는 YYYY-MM 형식이어야 합니다.',
  })
  month: string;

  /**
   * 성별 필터 (선택적)
   * @example "Female"
   */
  @IsOptional()
  @IsEnum(StreamerGender)
  gender?: StreamerGender;
}
