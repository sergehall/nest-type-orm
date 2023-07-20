import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SessionDevicesEntity } from '../entities/security-device.entity';
import { PayloadDto } from '../../auth/dto/payload.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { ReturnSecurityDeviceEntity } from '../entities/return-security-device.entity';

export class SecurityDevicesRawSqlRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async createOrUpdateDevice(
    newDevices: SessionDevicesEntity,
  ): Promise<boolean> {
    try {
      const createOrUpdateDevice = await this.db.query(
        `
      INSERT INTO public."SecurityDevices"
      ("userId",
       "deviceId",
       "ip", 
       "title", 
       "lastActiveDate", 
       "expirationDate"
       )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ( "userId", "title" ) 
      DO UPDATE SET "userId" = $1, "deviceId" = $2, "ip" = $3, "title" = $4, "lastActiveDate" = $5, "expirationDate" = $6
      RETURNING "userId"
      `,
        [
          newDevices.userId,
          newDevices.deviceId,
          newDevices.ip,
          newDevices.title,
          newDevices.lastActiveDate,
          newDevices.expirationDate,
        ],
      );
      return createOrUpdateDevice[0] != null;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findDevices(
    payload: PayloadDto,
  ): Promise<ReturnSecurityDeviceEntity[]> {
    try {
      const currentTime = new Date().toISOString();
      const limit = 100;
      const offset = 0;
      return await this.db.query(
        `
        SELECT "ip", "title", "lastActiveDate", "deviceId"
        FROM public."SecurityDevices"
        WHERE "userId" = $1 AND "expirationDate" >= $2
        ORDER BY "lastActiveDate" DESC
        LIMIT $3 OFFSET $4
        `,
        [payload.userId, currentTime, limit, offset],
      );
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeDeviceByDeviceIdAfterLogout(
    payload: PayloadDto,
  ): Promise<boolean> {
    try {
      const removeCurrentDevice = await this.db.query(
        `
      DELETE FROM public."SecurityDevices"
      WHERE "userId" = $1 AND "deviceId" = $2
      RETURNING "userId"
      `,
        [payload.userId, payload.deviceId],
      );
      return removeCurrentDevice[0] != null;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }
  async removeDeviceByDeviceId(
    deviceId: string,
    currentPayload: PayloadDto,
  ): Promise<string> {
    try {
      const findDevice = await this.findDeviceByDeviceId(deviceId);
      if (findDevice.length == 0) {
        return '404';
      } else if (findDevice[0].userId !== currentPayload.userId) {
        return '403';
      }
      const removeDeviceByDeviceId = await this.db.query(
        `
      DELETE FROM public."SecurityDevices"
      WHERE "deviceId" = $1
      RETURNING "deviceId"
      `,
        [deviceId],
      );
      return removeDeviceByDeviceId[1] === 1 ? '204' : '500';
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }
  async findDeviceByDeviceId(
    deviceId: string,
  ): Promise<SessionDevicesEntity[]> {
    try {
      const currentTime = new Date().toISOString();
      return await this.db.query(
        `
        SELECT "userId", "ip", "title", "lastActiveDate", "expirationDate", "deviceId"
        FROM public."SecurityDevices"
        WHERE "deviceId" = $1 AND "expirationDate" >= $2
        `,
        [deviceId, currentTime],
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeDevicesExceptCurrent(currentPayload: PayloadDto) {
    try {
      return await this.db.query(
        `
      DELETE FROM public."SecurityDevices"
      WHERE "userId" = $1 AND "deviceId" <> $2
      `,
        [currentPayload.userId, currentPayload.deviceId],
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }
  async clearingDevicesWithExpiredDate() {
    try {
      const currentTime = new Date().toISOString();
      return await this.db.query(
        `
      DELETE FROM public."SecurityDevices"
      WHERE "expirationDate" <= $1
      `,
        [currentTime],
      );
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeDevicesBannedUser(userId: string) {
    try {
      const currentTime = new Date().toISOString();
      const removeCurrentDevice = await this.db.query(
        `
      DELETE FROM public."SecurityDevices"
      WHERE "userId" = $1 AND "expirationDate" >= $2
      RETURNING "userId"
      `,
        [userId, currentTime],
      );
      return removeCurrentDevice[0] != null;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }
}