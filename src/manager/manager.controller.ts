import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ManagerService } from './manager.service';

@Controller()
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @MessagePattern('clasificator')
  async clasificator(@Payload() data:string) {
    const {newIds, oldIds} = await this.managerService.ticketsId(data);
    const ticketNew = await this.managerService.create(newIds);
    console.log( ticketNew)
  }
}
