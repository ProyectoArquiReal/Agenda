import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { AuthUserPayload } from '../../shared/auth/auth.types';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CatalogService } from './catalog.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('servicios')
  async getServicios(@CurrentUser() user: AuthUserPayload) {
    const data = await this.catalogService.listarServicios(user.consultorioId);
    return { data };
  }

  @Get('especialistas')
  async getEspecialistas(@CurrentUser() user: AuthUserPayload) {
    const data = await this.catalogService.listarEspecialistas(user.consultorioId);
    return { data };
  }
}
