import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../../entities/board.entity';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
  ) {}

  async findAll(): Promise<Board[]> {
    return this.boardRepository.find();
  }

  async findBySlug(slug: string): Promise<Board> {
    return this.boardRepository.findOne({ where: { slug } });
  }

  async findById(id: number): Promise<Board> {
    return this.boardRepository.findOne({ where: { id } });
  }

  async create(boardData: Partial<Board>): Promise<Board> {
    const board = this.boardRepository.create(boardData);
    return this.boardRepository.save(board);
  }

  async update(id: number, boardData: Partial<Board>): Promise<Board> {
    await this.boardRepository.update(id, boardData);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.boardRepository.delete(id);
  }
} 