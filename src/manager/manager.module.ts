import { Module, Injectable } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { NatsModule } from 'src/nats/nats.module';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports:[NatsModule],
  controllers: [ManagerController],
  providers: [ManagerService, PrismaService]
})
export class ManagerModule {}
