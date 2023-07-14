import { Injectable, NotFoundException } from '@nestjs/common';
import { Pagination } from '../../common/pagination/pagination';
import { CommandBus } from '@nestjs/cqrs';
import { FillingCommentsDataCommand } from './use-cases/filling-comments-data.use-case';
import { CurrentUserDto } from '../../users/dto/currentUser.dto';
import { CommentsRawSqlRepository } from '../infrastructure/comments-raw-sql.repository';
import { FilledCommentEntity } from '../entities/filledComment.entity';
import { CommentsReturnEntity } from '../entities/comments-return.entity';
import { ParseQueryType } from '../../common/parse-query/parse-query';
import { PostsRawSqlRepository } from '../../posts/infrastructure/posts-raw-sql.repository';
import { TablesCommentsRawSqlEntity } from '../entities/tables-comments-raw-sql.entity';
import { PaginationTypes } from '../../common/pagination/types/pagination.types';

@Injectable()
export class CommentsService {
  constructor(
    protected pagination: Pagination,
    protected commentsRawSqlRepository: CommentsRawSqlRepository,
    protected postsRawSqlRepository: PostsRawSqlRepository,
    protected commandBus: CommandBus,
  ) {}

  async findCommentById(
    commentId: string,
    currentUserDto: CurrentUserDto | null,
  ): Promise<CommentsReturnEntity> {
    const comment = await this.commentsRawSqlRepository.findCommentByCommentId(
      commentId,
    );
    if (!comment || comment.commentatorInfoIsBanned)
      throw new NotFoundException();
    const filledComments: FilledCommentEntity[] = await this.commandBus.execute(
      new FillingCommentsDataCommand([comment], currentUserDto),
    );
    return {
      id: filledComments[0].id,
      content: filledComments[0].content,
      createdAt: filledComments[0].createdAt,
      commentatorInfo: {
        userId: filledComments[0].commentatorInfo.userId,
        userLogin: filledComments[0].commentatorInfo.userLogin,
      },
      likesInfo: {
        likesCount: filledComments[0].likesInfo.likesCount,
        dislikesCount: filledComments[0].likesInfo.dislikesCount,
        myStatus: filledComments[0].likesInfo.myStatus,
      },
    };
  }

  async findCommentsByPostId(
    postId: string,
    queryData: ParseQueryType,
    currentUserDto: CurrentUserDto | null,
  ): Promise<PaginationTypes> {
    const post = await this.postsRawSqlRepository.openFindPostByPostId(postId);
    if (!post) throw new NotFoundException();
    const comments: TablesCommentsRawSqlEntity[] =
      await this.commentsRawSqlRepository.findCommentsByPostId(
        postId,
        queryData,
      );
    if (comments.length === 0) {
      return {
        pagesCount: queryData.queryPagination.pageNumber,
        page: queryData.queryPagination.pageNumber,
        pageSize: queryData.queryPagination.pageSize,
        totalCount: queryData.queryPagination.pageNumber - 1,
        items: [],
      };
    }
    const filledComments: FilledCommentEntity[] = await this.commandBus.execute(
      new FillingCommentsDataCommand(comments, currentUserDto),
    );
    const postInfoBlogOwnerId = post.postOwnerId;
    const commentatorInfoIsBanned = false;
    const banInfoIsBanned = false;
    const totalCount = await this.commentsRawSqlRepository.totalCount(
      postInfoBlogOwnerId,
      commentatorInfoIsBanned,
      banInfoIsBanned,
    );
    const pagesCount = Math.ceil(
      totalCount / queryData.queryPagination.pageSize,
    );
    const commentsWithoutPostInfo: CommentsReturnEntity[] = filledComments.map(
      (currentComment: FilledCommentEntity) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { postInfo, ...commentWithoutPostInfo } = currentComment;

        return commentWithoutPostInfo;
      },
    );
    return {
      pagesCount: pagesCount,
      page: queryData.queryPagination.pageNumber,
      pageSize: queryData.queryPagination.pageSize,
      totalCount: totalCount,
      items: commentsWithoutPostInfo,
    };
  }
}
