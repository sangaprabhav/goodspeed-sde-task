import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiErrorCode } from '@repo/shared';
import { GlobalExceptionFilter } from './http-exception.filter';

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  };

  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  it('maps Zod validation failures to a structured 400 response', () => {
    const { host, status, json } = createHost();
    const result = z.object({ title: z.string().min(1) }).safeParse({ title: '' });

    if (result.success) throw new Error('Expected validation failure');
    new GlobalExceptionFilter().catch(result.error, host as never);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ApiErrorCode.VALIDATION_ERROR,
      }),
    );
  });

  it('does not expose internal exception messages', () => {
    const { host, json } = createHost();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    new GlobalExceptionFilter().catch(
      new Error('database credentials leaked here'),
      host as never,
    );

    expect(json).toHaveBeenCalledWith({
      code: ApiErrorCode.PROVIDER_ERROR,
      message: 'Internal server error',
    });
    consoleError.mockRestore();
  });
});
