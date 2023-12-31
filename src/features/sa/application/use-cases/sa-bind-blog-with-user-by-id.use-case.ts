import { CurrentUserDto } from '../../../users/dto/currentUser.dto';
import { IdUserIdParams } from '../../../../common/query/params/id-userId.params';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from '../../../../ability/casl-ability.factory';
import { UsersRawSqlRepository } from '../../../users/infrastructure/users-raw-sql.repository';
import { BloggerBlogsRawSqlRepository } from '../../../blogger-blogs/infrastructure/blogger-blogs-raw-sql.repository';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { Action } from '../../../../ability/roles/action.enum';
import { TableBloggerBlogsRawSqlEntity } from '../../../blogger-blogs/entities/table-blogger-blogs-raw-sql.entity';
import { TablesUsersWithIdEntity } from '../../../users/entities/tables-user-with-id.entity';
import { SecurityDevicesRawSqlRepository } from '../../../security-devices/infrastructure/security-devices-raw-sql.repository';

export class SaBindBlogWithUserByIdCommand {
  constructor(
    public params: IdUserIdParams,
    public currentUserDto: CurrentUserDto,
  ) {}
}

@CommandHandler(SaBindBlogWithUserByIdCommand)
export class SaBindBlogWithUserByIdUseCase
  implements ICommandHandler<SaBindBlogWithUserByIdCommand>
{
  constructor(
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly usersRawSqlRepository: UsersRawSqlRepository,
    private readonly bloggerBlogsRawSqlRepository: BloggerBlogsRawSqlRepository,
    private readonly securityDevicesRawSqlRepository: SecurityDevicesRawSqlRepository,
  ) {}
  async execute(command: SaBindBlogWithUserByIdCommand): Promise<boolean> {
    const { id, userId } = command.params;
    const { currentUserDto } = command;

    const blogForBind = await this.getBlogForBind(id);

    const userForBind = await this.getUserForBind(userId);

    await this.checkUserPermission(currentUserDto, userId);

    return await this.securityDevicesRawSqlRepository.saBindUserAndBlog(
      userForBind,
      blogForBind,
    );
  }

  private async checkUserPermission(
    currentUserDto: CurrentUserDto,
    userForBindUserId: string,
  ) {
    const ability = this.caslAbilityFactory.createSaUser(currentUserDto);
    try {
      ForbiddenError.from(ability).throwUnlessCan(Action.UPDATE, {
        id: userForBindUserId,
      });
    } catch (error) {
      throw new ForbiddenException(
        'You are not allowed to bind this blog and user. ' + error.message,
      );
    }
  }

  private async getUserForBind(userId: string) {
    const userForBind: TablesUsersWithIdEntity | null =
      await this.usersRawSqlRepository.saFindUserByUserId(userId);
    if (!userForBind) {
      throw new NotFoundException('Not found user.');
    }
    return userForBind;
  }

  private async getBlogForBind(blogId: string) {
    const blogForBind: TableBloggerBlogsRawSqlEntity | null =
      await this.bloggerBlogsRawSqlRepository.saFindBlogByBlogId(blogId);
    if (!blogForBind) {
      throw new NotFoundException('Not found blog.');
    }
    return blogForBind;
  }
}
