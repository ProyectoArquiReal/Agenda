import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check() {
    try {
      const timestamp = await this.db.withPublicClient(async (client) => {
        const result = await client.query<{ now: Date }>('SELECT NOW() AS now');
        return result.rows[0].now;
      });

      return {
        status: 'ok',
        service: 'clinica-api',
        version: '0.1.0',
        database: 'connected',
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
      });
    }
  }
}
