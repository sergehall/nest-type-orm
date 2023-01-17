import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuthService } from '../auth.service';
import { BlacklistJwtRepository } from '../infrastructure/blacklist-jwt.repository';
import { UsersService } from '../../users/users.service';

@Injectable()
export class NoneStatusGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private blacklistJwtRepository: BlacklistJwtRepository,
    private usersService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.headers || !request.headers.authorization) {
      return true;
    }
    const accessToken = request.headers.authorization.split(' ')[1];
    const checkInBL = await this.blacklistJwtRepository.findJWT(accessToken);
    const payload = await this.authService.validAccessJWT(accessToken);
    if (!checkInBL && payload) {
      const user = await this.usersService.findUserByUserId(payload.userId);
      if (user?.banInfo?.isBanned) throw new NotFoundException();
      if (user) {
        request.user = {
          id: user.id,
          login: user.login,
          email: user.email,
          banInfo: { isBanned: user.banInfo.isBanned },
        };
      }
    }
    request.user = null;
    return true;
  }
}
