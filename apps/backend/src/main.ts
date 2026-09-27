import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: Stripe signs the exact bytes it sent, so the dues webhook must
  // verify against the unparsed body (see PaymentWebhookController).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Helix X API')
    .setDescription('REST API for the Helix X platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  // Expose raw OpenAPI JSON (the input to the client SDK codegen)
  app.getHttpAdapter().get('/docs-json', (_req: any, res: any) => {
    res.json(document);
  });

  // Scalar API reference UI
  app.use(
    '/docs-scalar',
    apiReference({
      theme: 'alternate',
      url: '/docs-json',
    }),
  );

  SwaggerModule.setup('docs', app, document); 

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`Server:       http://localhost:${port}/api`);
  console.log(`Scalar UI:    http://localhost:${port}/docs`);
  console.log(`OpenAPI JSON: http://localhost:${port}/docs-json`);
}

bootstrap();
