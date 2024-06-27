import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const documentOptions = new DocumentBuilder()
    .setTitle('Coupon API')
    .setVersion('1.0')
    .addServer('http://localhost:8080')
    .addTag('Coupon API Tag')
    .build()
  const document = SwaggerModule.createDocument(app, documentOptions)
  SwaggerModule.setup('api-docs', app, document)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )

  // app.use(passport.initialize())
  // app.use(passport.session())
  app.enableCors()

  await app.listen(8080)
}

void bootstrap()
