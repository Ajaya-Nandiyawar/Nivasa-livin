import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleEnum } from '../../database/types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: RoleEnum;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
