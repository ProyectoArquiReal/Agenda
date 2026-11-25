import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseService } from './shared/database/database.service';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard';
import { HealthController } from './modules/health/health.controller';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { CatalogController } from './modules/catalog/catalog.controller';
import { CatalogService } from './modules/catalog/catalog.service';
import { CitasController } from './modules/citas/citas.controller';
import { CitasService } from './modules/citas/citas.service';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio.');
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    CatalogController,
    CitasController,
  ],
  providers: [
    DatabaseService,
    JwtAuthGuard,
    AuthService,
    CatalogService,
    CitasService,
  ],
})
export class AppModule {}
