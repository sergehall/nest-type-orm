import { CurrentUserDto } from '../../../users/dto/currentUser.dto';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PostsRawSqlRepository } from '../../infrastructure/posts-raw-sql.repository';
import { ParseQueriesDto } from '../../../../common/query/dto/parse-queries.dto';
import { PaginatedResultDto } from '../../../../common/pagination/dto/paginated-result.dto';
import { PostsAndCountDto } from '../../dto/posts-and-count.dto';

export class FindPostsCommand {
  constructor(
    public queryData: ParseQueriesDto,
    public currentUserDto: CurrentUserDto | null,
  ) {}
}

@CommandHandler(FindPostsCommand)
export class FindPostsUseCase implements ICommandHandler<FindPostsCommand> {
  constructor(
    private readonly postsRawSqlRepository: PostsRawSqlRepository,
    protected commandBus: CommandBus,
  ) {}
  async execute(command: FindPostsCommand): Promise<PaginatedResultDto> {
    const { queryData, currentUserDto } = command;
    const { pageNumber, pageSize } = queryData.queryPagination;

    const postsAndCount: PostsAndCountDto =
      await this.postsRawSqlRepository.findPostsAndTotalCountPosts(
        queryData,
        currentUserDto,
      );

    if (postsAndCount.posts.length === 0) {
      return {
        pagesCount: 0,
        page: pageNumber,
        pageSize: pageSize,
        totalCount: 0,
        items: postsAndCount.posts,
      };
    }
    const totalCount = postsAndCount.countPosts;

    const pagesCount: number = Math.ceil(totalCount / pageSize);

    return {
      pagesCount: pagesCount,
      page: pageNumber,
      pageSize: pageSize,
      totalCount: totalCount,
      items: postsAndCount.posts,
    };
  }
}
