import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { Board } from '../../entities/board.entity';
import { AdminGuard } from '../../guards/admin.guard';

@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  async findAll(): Promise<Board[]> {
    return this.boardService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Board> {
    return this.boardService.findById(+id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Board> {
    return this.boardService.findBySlug(slug);
  }

  @UseGuards(AdminGuard)
  @Post()
  async create(@Body() boardData: Partial<Board>): Promise<Board> {
    return this.boardService.create(boardData);
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() boardData: Partial<Board>,
  ): Promise<Board> {
    return this.boardService.update(+id, boardData);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.boardService.delete(+id);
  }
} 