import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { TransformInterceptor } from '@/shared/interceptors/tranform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const formattedErrors = validationErrors.map((error) => ({
          field: error.property,
          message: Object.values(
            error.constraints as Record<string, string>,
          ).join(),
        }));
        return new BadRequestException({
          statusCode: 400,
          messages: formattedErrors,
          error: 'Bad Request',
        });
      },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.enableShutdownHooks();
  const config = new DocumentBuilder()
    .setTitle('Social Media')
    .setDescription('Twitter Clone')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
