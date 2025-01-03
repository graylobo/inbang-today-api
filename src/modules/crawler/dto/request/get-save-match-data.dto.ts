import { IsString, Matches, Validate } from 'class-validator';
import { IsDateRangeValidConstraint } from 'src/utils/date-validator.utils';

export class GetSaveMatchDataDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: '날짜는 YYYYMMDD 형식이어야 합니다.' })
  startDate: string;

  @IsString()
  @Matches(/^\d{8}$/, { message: '날짜는 YYYYMMDD 형식이어야 합니다.' })
  @Validate(IsDateRangeValidConstraint)
  endDate: string;
}
