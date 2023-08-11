import { CreateUserDto } from '../../../users/dto/create-user.dto';
import { RegDataDto } from '../../../users/dto/reg-data.dto';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand } from '../../../users/application/use-cases/create-user.use-case';
import { TablesUsersWithIdEntity } from '../../../users/entities/tables-user-with-id.entity';
import { MailsService } from '../../../mails/application/mails.service';

export class RegistrationUserCommand {
  constructor(
    public createUserDto: CreateUserDto,
    public registrationData: RegDataDto,
  ) {}
}

@CommandHandler(RegistrationUserCommand)
export class RegistrationUserUseCase
  implements ICommandHandler<RegistrationUserCommand>
{
  constructor(
    protected mailsService: MailsService,
    protected commandBus: CommandBus,
  ) {}
  async execute(
    command: RegistrationUserCommand,
  ): Promise<TablesUsersWithIdEntity> {
    const newUser: TablesUsersWithIdEntity = await this.commandBus.execute(
      new CreateUserCommand(command.createUserDto, command.registrationData),
    );

    const { email, confirmationCode, expirationDate } = newUser;
    await this.mailsService.registerSendEmail(
      email,
      confirmationCode,
      expirationDate,
    );

    return newUser;
  }
}
