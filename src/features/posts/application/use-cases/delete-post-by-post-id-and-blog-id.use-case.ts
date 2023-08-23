import { CurrentUserDto } from '../../../users/dto/currentUser.dto';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ForbiddenError } from '@casl/ability';
import { Action } from '../../../../ability/roles/action.enum';
import { CaslAbilityFactory } from '../../../../ability/casl-ability.factory';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BlogIdPostIdParams } from '../../../../common/query/params/blogId-postId.params';
import { TableBloggerBlogsRawSqlEntity } from '../../../blogger-blogs/entities/table-blogger-blogs-raw-sql.entity';
import { BloggerBlogsRawSqlRepository } from '../../../blogger-blogs/infrastructure/blogger-blogs-raw-sql.repository';
import { PostsRawSqlRepository } from '../../infrastructure/posts-raw-sql.repository';
import { TablesPostsEntity } from '../../entities/tables-posts-entity';

export class DeletePostByPostIdAndBlogIdCommand {
  constructor(
    public params: BlogIdPostIdParams,
    public currentUserDto: CurrentUserDto,
  ) {}
}

@CommandHandler(DeletePostByPostIdAndBlogIdCommand)
export class DeletePostByPostIdAndBlogIdUseCase
  implements ICommandHandler<DeletePostByPostIdAndBlogIdCommand>
{
  constructor(
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly bloggerBlogsRawSqlRepository: BloggerBlogsRawSqlRepository,
    private readonly postsRepository: PostsRawSqlRepository,
  ) {}
  async execute(command: DeletePostByPostIdAndBlogIdCommand): Promise<boolean> {
    const { params, currentUserDto } = command;
    const { blogId, postId } = params;

    const blog: TableBloggerBlogsRawSqlEntity | null =
      await this.bloggerBlogsRawSqlRepository.findBlogById(blogId);
    if (!blog) throw new NotFoundException(`Blog with id: ${blogId} not found`);

    const postToRemove: TablesPostsEntity | null =
      await this.postsRepository.getPostById(postId);
    if (!postToRemove)
      throw new NotFoundException(`Post with id: ${postId} not found`);

    await this.checkUserPermission(postToRemove.postOwnerId, currentUserDto);

    return await this.postsRepository.deletePostByPostId(postToRemove.id);
  }

  private async checkUserPermission(
    postOwnerId: string,
    currentUserDto: CurrentUserDto,
  ) {
    const ability = this.caslAbilityFactory.createForUserId({
      id: postOwnerId,
    });
    try {
      ForbiddenError.from(ability).throwUnlessCan(Action.UPDATE, {
        id: currentUserDto.userId,
      });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw new ForbiddenException(
          'You do not have permission to delete a post. ' + error.message,
        );
      }
      throw new InternalServerErrorException(error.message);
    }
  }
}
