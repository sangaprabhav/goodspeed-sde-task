import { BadRequestException } from '@nestjs/common';
import { MAX_DOC_SIZE } from '@repo/shared';

// pdf-parse is CJS-only; default import compiles to .default which is undefined
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;

const PDF_MIMES = new Set(['application/pdf', 'application/x-pdf']);
const TEXT_MIMES = new Set(['text/plain', 'text/markdown']);

function isPdf(mimetype: string, filename: string): boolean {
  return PDF_MIMES.has(mimetype) || /\.pdf$/i.test(filename);
}

function isText(mimetype: string, filename: string): boolean {
  return TEXT_MIMES.has(mimetype) || /\.txt$/i.test(filename);
}

export async function extractTextFromUpload(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
): Promise<string> {
  let content: string;

  try {
    if (isPdf(mimetype, originalname)) {
      const parsed = await pdfParse(buffer);
      content = parsed.text?.trim() ?? '';
    } else if (isText(mimetype, originalname)) {
      content = buffer.toString('utf-8').trim();
    } else {
      throw new BadRequestException(
        'Only PDF and TXT files are supported. Use .pdf or .txt extension.',
      );
    }
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new BadRequestException(`Failed to extract text from file: ${message}`);
  }

  if (!content) {
    throw new BadRequestException(
      'No text could be extracted from this file. Try a text-based PDF or paste content manually.',
    );
  }

  if (content.length > MAX_DOC_SIZE) {
    throw new BadRequestException(
      `Extracted text exceeds ${MAX_DOC_SIZE} bytes. Try a smaller file.`,
    );
  }

  return content;
}

export function titleFromFilename(originalname: string): string {
  return originalname.replace(/\.(pdf|txt|md)$/i, '').trim() || 'Uploaded document';
}
