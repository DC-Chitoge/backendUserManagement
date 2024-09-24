import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from 'src/exceptions/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    credentials: true,
  });
  const config = new DocumentBuilder()
    .setTitle('UserManagement')
    .setDescription('The user API description')
    .setVersion('1.0')
    .addTag('User route')
    .addTag('Rootadmin route')
    .addTag('Groups route')
    .addTag('Permissions route')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(8000);
}
bootstrap();
