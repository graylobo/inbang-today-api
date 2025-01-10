import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EditorService } from '../services/editor.service';

@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('upload'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.editorService.uploadImage(file);
  }
}
