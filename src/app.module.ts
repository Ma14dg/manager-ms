import { Module } from '@nestjs/common';
import { NatsModule } from './nats/nats.module';
import { ManagerModule } from './manager/manager.module';

@Module({
  imports: [NatsModule, ManagerModule],
})
export class AppModule {}
