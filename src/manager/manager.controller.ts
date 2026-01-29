import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ManagerService } from './manager.service';

@Controller()
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @MessagePattern('tickets.manage')
  async TicketsManager(@Payload() data:string) {
    const {newIds, oldIds} = await this.managerService.ticketsId(data);
    const ticketNew = await this.managerService.create(newIds);
    const ticketUpdated = await this.managerService.update(oldIds);
    return { created: ticketNew, updated: ticketUpdated };
  }
}