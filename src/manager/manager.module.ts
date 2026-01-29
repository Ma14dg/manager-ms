import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { NatsModule } from 'src/nats/nats.module';
import { PrismaService } from 'src/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { JiraService } from './services/jira.service';
import { TicketCopyService } from './services/ticket-copy.service';
import { TicketMappingService } from './services/ticket-mapping.service';
import { TicketPersistenceService } from './services/ticket-persistence.service';
import { TicketCreationService } from './services/ticket-creation.service';
import { TicketUpdateService } from './services/ticket-update.service';

@Module({
  imports: [NatsModule, HttpModule],
  controllers: [ManagerController],
  providers: [
    ManagerService,
    PrismaService,
    JiraService,
    TicketCopyService,
    TicketMappingService,
    TicketPersistenceService,
    TicketCreationService,
    TicketUpdateService,
  ],
})
export class ManagerModule {}
