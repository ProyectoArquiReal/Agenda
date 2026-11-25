import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthUserPayload } from './auth.types';

type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AuthUserPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token Bearer requerido en el encabezado Authorization.',
      });
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthUserPayload>(
        authorization.slice('Bearer '.length),
      );
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'El token de acceso es inválido o ha expirado.',
      });
    }
  }
}
