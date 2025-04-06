// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorCode = null;
    let message = '';

    if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      errorCode = message;
    } else {
      message = exceptionResponse;
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      errorCode: errorCode,
      timestamp: new Date().toISOString(),
    });
  }
}
