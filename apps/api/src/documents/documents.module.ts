import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { ReindexController } from './reindex.controller';
import { DocumentsService } from './documents.service';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [IngestionModule],
  controllers: [DocumentsController, ReindexController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
