import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../../entities/board.entity';

@Injectable()
export class BoardSeedService {
  constructor(
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
  ) {}

  async seed() {
    const defaultBoards = [
      {
        name: '자유게시판',
        slug: 'free',
        description: '자유롭게 소통하는 공간입니다.',
        isAnonymous: false,
      },
      {
        name: '사건/사고',
        slug: 'incident',
        description: '사건/사고 관련 정보를 공유하는 공간입니다.',
        isAnonymous: false,
      },
      {
        name: '익명게시판',
        slug: 'anonymous',
        description: '익명으로 자유롭게 소통하는 공간입니다.',
        isAnonymous: true,
      },
    ];

    for (const boardData of defaultBoards) {
      const existingBoard = await this.boardRepository.findOne({
        where: { slug: boardData.slug },
      });

      if (!existingBoard) {
        await this.boardRepository.save(boardData);
      }
    }
  }
}
