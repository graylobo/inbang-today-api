import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AwsModule } from 'src/modules/aws/aws.module';
import { EditorController } from 'src/modules/editor/controllers/editor.controller';
import { EditorService } from 'src/modules/editor/services/editor.service';

@Module({
  imports: [AwsModule, ScheduleModule.forRoot()],
  controllers: [EditorController],
  providers: [EditorService],
})
export class EditorModule {}
