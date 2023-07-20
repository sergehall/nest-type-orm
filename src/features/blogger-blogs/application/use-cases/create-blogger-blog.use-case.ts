import * as uuid4 from 'uuid4';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CaslAbilityFactory } from '../../../../ability/casl-ability.factory';
import { CreateBloggerBlogsDto } from '../../dto/create-blogger-blogs.dto';
import { CurrentUserDto } from '../../../users/dto/currentUser.dto';
import { ForbiddenError } from '@casl/ability';
import { Action } from '../../../../ability/roles/action.enum';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BloggerBlogsRawSqlRepository } from '../../infrastructure/blogger-blogs-raw-sql.repository';
import { TableBloggerBlogsRawSqlEntity } from '../../entities/table-blogger-blogs-raw-sql.entity';

export class CreateBloggerBlogCommand {
  constructor(
    public createBloggerBlogsDto: CreateBloggerBlogsDto,
    public currentUser: CurrentUserDto,
  ) {}
}

@CommandHandler(CreateBloggerBlogCommand)
export class CreateBloggerBlogUseCase
  implements ICommandHandler<CreateBloggerBlogCommand>
{
  constructor(
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly bloggerBlogsRawSqlRepository: BloggerBlogsRawSqlRepository,
  ) {}
  async execute(command: CreateBloggerBlogCommand) {
    const blogsEntity = this.createBlogsEntity(
      command.createBloggerBlogsDto,
      command.currentUser,
    );

    const ability = this.caslAbilityFactory.createForUser(command.currentUser);
    this.checkPermission(ability, command.currentUser);

    const newBlog = await this.bloggerBlogsRawSqlRepository.createBlogs(
      blogsEntity,
    );

    return this.getBlogResponse(newBlog);
  }

  private createBlogsEntity(
    dto: CreateBloggerBlogsDto,
    currentUser: CurrentUserDto,
  ): TableBloggerBlogsRawSqlEntity {
    const { id, login, isBanned } = currentUser;

    return {
      ...dto,
      id: uuid4(),
      createdAt: new Date().toISOString(),
      isMembership: false,
      blogOwnerId: id,
      blogOwnerLogin: login,
      blogOwnerBanStatus: isBanned,
      banInfoBanStatus: false,
      banInfoBanDate: null,
      banInfoBanReason: null,
    };
  }

  private checkPermission(ability: any, currentUser: CurrentUserDto): void {
    try {
      ForbiddenError.from(ability).throwUnlessCan(Action.CREATE, currentUser);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenException(error.message);
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  private getBlogResponse(
    blog: TableBloggerBlogsRawSqlEntity,
  ): Partial<TableBloggerBlogsRawSqlEntity> {
    const { id, name, description, websiteUrl, createdAt, isMembership } = blog;
    return { id, name, description, websiteUrl, createdAt, isMembership };
  }
}
