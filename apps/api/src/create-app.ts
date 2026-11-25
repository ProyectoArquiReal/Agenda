import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function validationMessage(errors: ValidationError[]): string {
  const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
  return messages.join(' ') || 'La solicitud contiene datos inválidos.';
}

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: validationMessage(errors),
        }),
    }),
  );
  app.enableCors();
  return app;
}
