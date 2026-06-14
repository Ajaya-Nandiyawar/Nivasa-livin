import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Define a type for postgres errors since we don't have a specific error class like Prisma
interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  constraint?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
      code = 'HTTP_EXCEPTION';
    } else {
      const dbError = exception as DatabaseError;
      
      // Node-postgres error codes
      if (dbError.code) {
        switch (dbError.code) {
          case '23505': // unique_violation
            status = HttpStatus.CONFLICT;
            message = `Unique constraint failed: ${dbError.detail || 'unknown'}`;
            code = 'DB_UNIQUE_VIOLATION';
            break;
          case '23503': // foreign_key_violation
            status = HttpStatus.BAD_REQUEST;
            message = `Foreign key constraint failed: ${dbError.detail || 'unknown'}`;
            code = 'DB_FK_VIOLATION';
            break;
          case '23502': // not_null_violation
            status = HttpStatus.BAD_REQUEST;
            message = `Not null constraint failed on column: ${(dbError as any).column || 'unknown'}`;
            code = 'DB_NOT_NULL_VIOLATION';
            break;
          default:
            // For other database errors, do not expose details in production but log them
            status = HttpStatus.BAD_REQUEST;
            message = 'Database error occurred.';
            code = `DB_ERROR_${dbError.code}`;
            break;
        }
      } else {
        this.logger.error(
          `Unhandled exception: ${exception instanceof Error ? exception.message : exception}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      }
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
