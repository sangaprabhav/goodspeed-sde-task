import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorCode } from '@repo/shared';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : (body as { message?: string | string[] }).message;

      response.status(status).json({
        code: this.mapStatusToCode(status),
        message: Array.isArray(message) ? message.join(', ') : message,
      });
      return;
    }

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: exception.issues
          .map((issue) => `${issue.path.join('.') || 'request'}: ${issue.message}`)
          .join(', '),
      });
      return;
    }

    console.error('Unhandled error:', exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ApiErrorCode.PROVIDER_ERROR,
      message: 'Internal server error',
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 401:
        return ApiErrorCode.UNAUTHORIZED;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 409:
        return ApiErrorCode.EMBEDDING_SPACE_MISMATCH;
      case 413:
        return ApiErrorCode.PAYLOAD_TOO_LARGE;
      case 429:
        return ApiErrorCode.RATE_LIMITED;
      case 400:
        return ApiErrorCode.VALIDATION_ERROR;
      default:
        return ApiErrorCode.PROVIDER_ERROR;
    }
  }
}
