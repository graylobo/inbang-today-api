import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum Order {
  DESC = 'desc',
  ASC = 'asc',
}

export class PaginationQueryDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '페이지 수',
    required: false,
  })
  @Transform(({ value }) => +value)
  page: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    description: '조회 아이템 개수',
    required: false,
  })
  @Transform(({ value }) => +value)
  perPage: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '정렬 규칙',
    enum: Order,
    required: false,
  })
  order: Order;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '정렬 Key',
    required: false,
  })
  orderKey: string;
}

export class CursorPaginationQueryDto {
  @ApiProperty({
    description: '커서 값 (마지막으로 조회된 항목의 ID)',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: '한 번에 가져올 데이터 개수',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => +value)
  limit?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '정렬 규칙',
    enum: Order,
    required: false,
  })
  order: Order;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '정렬 Key',
    required: false,
  })
  orderKey: string;
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: '페이지네이션된 항목들' })
  items: T[];

  @ApiProperty({ description: '총 항목 수' })
  total: number;

  @ApiProperty({ description: '총 페이지 수' })
  totalPages: number;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지 당 항목 수' })
  perPage: number;
  constructor(partial: Partial<PaginatedResponse<T>>) {
    Object.assign(this, partial);
  }
}

export class CursorPaginatedResponse<T> {
  @ApiProperty({ description: '페이지네이션된 항목들' })
  items: T[];

  @ApiProperty({ description: '더 많은 항목이 있는지 여부' })
  hasMore: boolean;

  @ApiProperty({ description: '다음 페이지를 위한 커서', required: false })
  nextCursor?: string;
}
