import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { extractTextFromUpload, titleFromFilename } from './file-extract';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, AccessToken, AuthUser } from '../common/decorators/current-user.decorator';
import { createDocumentSchema, updateDocumentSchema, MAX_DOC_SIZE } from '@repo/shared';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @AccessToken() token: string) {
    return this.documentsService.list(user.id, token);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOC_SIZE },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }

    const content = await extractTextFromUpload(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    return this.documentsService.create(
      user.id,
      { title: titleFromFilename(file.originalname), content, tags: [] },
      token,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Body() body: unknown,
  ) {
    const input = createDocumentSchema.parse(body);
    return this.documentsService.create(user.id, input, token);
  }

  @Get(':id/chunks/:chunkIndex')
  async getChunk(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
    @Param('chunkIndex') chunkIndex: string,
  ) {
    const index = parseInt(chunkIndex, 10);
    if (Number.isNaN(index) || index < 0) {
      throw new BadRequestException('Invalid chunk index');
    }
    const chunk = await this.documentsService.getChunk(user.id, id, index, token);
    if (!chunk) throw new NotFoundException('Chunk not found');
    return chunk;
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
  ) {
    const doc = await this.documentsService.get(user.id, id, token);
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateDocumentSchema.parse(body);
    const doc = await this.documentsService.update(user.id, id, input, token);
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthUser,
    @AccessToken() token: string,
    @Param('id') id: string,
  ) {
    await this.documentsService.remove(user.id, id, token);
    return { success: true };
  }
}
