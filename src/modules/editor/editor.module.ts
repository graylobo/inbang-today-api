import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AwsModule } from 'src/modules/aws/aws.module';
import { EditorController } from 'src/modules/editor/controllers/editor.controller';
import { EditorService } from 'src/modules/editor/services/editor.service';
import { ImageProcessingModule } from 'src/modules/image-processing/image-processing.module';

@Module({
  imports: [AwsModule, ScheduleModule.forRoot(), ImageProcessingModule],
  controllers: [EditorController],
  providers: [EditorService],
})
export class EditorModule {}
