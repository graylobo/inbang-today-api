import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
export class IsDateRangeValidConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments) {
    const { object } = args;
    const startDate = (object as any).startDate;

    if (!startDate || !endDate) return false;

    const startNum = parseInt(startDate);
    const endNum = parseInt(endDate);

    return startNum <= endNum;
  }

  defaultMessage(args: ValidationArguments) {
    return '시작일은 종료일보다 클 수 없습니다.';
  }
}
