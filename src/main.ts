import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { env } from './config';

async function bootstrap() {
  
  const logger = new Logger('Manager-ms');
  
  const app = await NestFactory.create(AppModule, {
    rawBody: true
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: env.natsServers,
    }
  }, {inheritAppConfig: true})

  await app.startAllMicroservices();
    app.useGlobalPipes(  
    new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
    }) 
  );
  logger.log(`Managment Microservice running on port:${env.port}`);
  await app.listen(env.port);
}
bootstrap();
