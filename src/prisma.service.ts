import { Injectable, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';


@Injectable()
export class PrismaService extends PrismaClient {

  private logger = new Logger('PrismaService');
  constructor() {
  const connectionString = `${process.env.DATABASE_URL}`

  const adapter = new PrismaPg({ connectionString })
    super({ adapter });

    this.logger.log('Database connected');
  }
}