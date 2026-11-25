import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DatabaseService } from '../../shared/database/database.service';
import { AuthUserPayload } from '../../shared/auth/auth.types';

interface LoginRow {
  id: string;
  consultorio_id: string;
  email: string;
  password_hash: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  mfa_habilitado: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const result = await this.db.withAuthClient((client) =>
      client.query<LoginRow>(
        `SELECT id, consultorio_id, email, password_hash, nombre_completo, rol, activo, mfa_habilitado
         FROM usuarios
         WHERE LOWER(email) = LOWER($1) AND activo = TRUE
         ORDER BY id ASC
         LIMIT 2`,
        [email.trim()],
      ),
    );

    if (result.rowCount && result.rowCount > 1) {
      throw new BadRequestException({
        code: 'AMBIGUOUS_EMAIL',
        message: 'El correo existe en más de un consultorio; el login requiere identificar el consultorio.',
      });
    }

    const user = result.rows[0];
    if (!user?.activo || !(await this.passwordMatches(user.password_hash, password))) {
      throw this.invalidCredentials();
    }
    if (user.mfa_habilitado) {
      throw new UnauthorizedException({
        code: 'MFA_REQUIRED',
        message: 'Esta cuenta requiere un flujo MFA que aún no está disponible en esta versión.',
      });
    }

    const tenantIsActive = await this.db.withTenantTx(
      user.consultorio_id,
      async (client) => {
        const clinic = await client.query<{ activo: boolean }>(
          'SELECT activo FROM consultorio_config WHERE id = $1',
          [user.consultorio_id],
        );
        if (!clinic.rows[0]?.activo) {
          return false;
        }

        await client.query(
          'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
          [user.id],
        );
        return true;
      },
    );

    if (!tenantIsActive) {
      throw this.invalidCredentials();
    }

    const payload: AuthUserPayload = {
      sub: user.id,
      consultorioId: user.consultorio_id,
      email: user.email,
      rol: user.rol,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 28_800,
      user: {
        id: user.id,
        consultorioId: user.consultorio_id,
        email: user.email,
        nombreCompleto: user.nombre_completo,
        rol: user.rol,
      },
    };
  }

  private async passwordMatches(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciales inválidas o usuario inactivo.',
    });
  }
}
