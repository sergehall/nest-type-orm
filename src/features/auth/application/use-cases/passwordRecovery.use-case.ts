import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRawSqlRepository } from '../../../users/infrastructure/users-raw-sql.repository';
import * as uuid4 from 'uuid4';
import { MailsRawSqlRepository } from '../../../mails/infrastructure/mails-raw-sql.repository';
import { EmailsRecoveryCodesEntity } from '../../../demons/entities/emailsRecoveryCodes.entity';

export class PasswordRecoveryCommand {
  constructor(public email: string) {}
}

@CommandHandler(PasswordRecoveryCommand)
export class PasswordRecoveryUseCase
  implements ICommandHandler<PasswordRecoveryCommand>
{
  constructor(
    protected usersRawSqlRepository: UsersRawSqlRepository,
    protected mailsRawSqlRepository: MailsRawSqlRepository,
  ) {}
  async execute(command: PasswordRecoveryCommand): Promise<boolean> {
    const { email } = command;
    const newConfirmationCode: EmailsRecoveryCodesEntity = {
      codeId: uuid4().toString(),
      email: email,
      recoveryCode: uuid4().toString(),
      expirationDate: new Date(Date.now() + 65 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await this.usersRawSqlRepository.updateUserConfirmationCode(
      email,
      newConfirmationCode.recoveryCode,
      newConfirmationCode.expirationDate,
    );
    const createEmailRecCode =
      await this.mailsRawSqlRepository.createEmailRecoveryCode(
        newConfirmationCode,
      );
    return createEmailRecCode.length !== 0;
  }
}
