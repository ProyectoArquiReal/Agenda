import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../shared/auth/current-user.decorator';
import { AuthUserPayload } from '../../shared/auth/auth.types';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado-cita.dto';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException({
      code: 'INVALID_CITA_ID',
      message: 'El id de la cita debe ser un UUID válido.',
    }),
});

@Controller('citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Get()
  async getCitas(
    @CurrentUser() user: AuthUserPayload,
    @Query('fecha') fecha?: string,
  ) {
    const data = await this.citasService.listarPorFecha(
      user.consultorioId,
      fecha,
    );
    return { data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async postCita(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: CreateCitaDto,
  ) {
    const data = await this.citasService.crearCita(
      user.consultorioId,
      user.sub,
      dto,
    );
    return { data };
  }

  @Patch(':id/estado')
  async patchEstadoCita(
    @CurrentUser() user: AuthUserPayload,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateEstadoCitaDto,
  ) {
    const data = await this.citasService.actualizarEstado(
      user.consultorioId,
      id,
      dto,
    );
    return { data };
  }
}
