import { DataCleanupService } from './data-cleanup.service';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { KeyResolver } from '../common/helpers/key-resolver';
import { InvalidJwtRepo } from '../features/auth/infrastructure/invalid-jwt-repo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvalidJwtEntity } from '../features/auth/entities/invalid-jwt.entity';
import { SecurityDevicesRepo } from '../features/security-devices/infrastructure/security-devices.repo';
import { SecurityDevicesEntity } from '../features/security-devices/entities/session-devices.entity';
import { UsersRepo } from '../features/users/infrastructure/users-repo';
import { UsersEntity } from '../features/users/entities/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsersEntity,
      InvalidJwtEntity,
      SecurityDevicesEntity,
    ]),
    CqrsModule,
  ],
  providers: [
    KeyResolver,
    DataCleanupService,
    UsersRepo,
    InvalidJwtRepo,
    SecurityDevicesRepo,
  ],
})
export class DataCleanupModule {}
