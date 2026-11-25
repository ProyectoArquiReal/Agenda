import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

type TenantWork<T> = (client: PoolClient) => Promise<T>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly appPool: Pool;
  private readonly authPool: Pool;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const authDatabaseUrl = process.env.AUTH_DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL es obligatorio.');
    }
    if (!authDatabaseUrl) {
      throw new Error('AUTH_DATABASE_URL es obligatorio para el lookup de login con RLS.');
    }

    this.appPool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      application_name: 'clinica-api',
    });
    this.authPool = new Pool({
      connectionString: authDatabaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
      application_name: 'clinica-api-auth',
    });
  }

  async withTenantTx<T>(consultorioId: string, work: TenantWork<T>): Promise<T> {
    const client = await this.appPool.connect();
    let transactionOpen = false;

    try {
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query("SET LOCAL lock_timeout = '3s'");
      await client.query(
        "SELECT set_config('app.current_consultorio_id', $1, true)",
        [consultorioId],
      );

      const result = await work(client);
      await client.query('COMMIT');
      transactionOpen = false;
      return result;
    } catch (error) {
      if (transactionOpen) {
        await client.query('ROLLBACK').catch(() => undefined);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async withPublicClient<T>(work: TenantWork<T>): Promise<T> {
    const client = await this.appPool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  async withAuthClient<T>(work: TenantWork<T>): Promise<T> {
    const client = await this.authPool.connect();
    try {
      return await work(client);
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.appPool.end(), this.authPool.end()]);
  }
}
