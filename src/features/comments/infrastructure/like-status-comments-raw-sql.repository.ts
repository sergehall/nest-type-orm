import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TablesLikeStatusCommentsEntity } from '../entities/tables-like-status-comments.entity';
import { InternalServerErrorException } from '@nestjs/common';
import { TableBannedUsersForBlogsEntity } from '../../blogger-blogs/entities/table-banned-users-for-blogs.entity';

export class LikeStatusCommentsRawSqlRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async updateLikeStatusComment(
    likeStatusCommEntity: TablesLikeStatusCommentsEntity,
  ): Promise<boolean> {
    try {
      const updateLikeStatusComment = await this.db.query(
        `
      INSERT INTO public."LikeStatusComments" ("blogId", "commentId", "userId", "isBanned", "likeStatus", "createdAt", "commentOwnerId")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ( "commentId", "userId" ) 
      DO UPDATE SET "blogId" = $1, "commentId" = $2, "userId" = $3, "isBanned" = $4, "likeStatus" = $5, "createdAt" = $6, "commentOwnerId" = $7
      returning "userId"
      `,
        [
          likeStatusCommEntity.blogId,
          likeStatusCommEntity.commentId,
          likeStatusCommEntity.userId,
          likeStatusCommEntity.isBanned,
          likeStatusCommEntity.likeStatus,
          likeStatusCommEntity.createdAt,
          likeStatusCommEntity.commentOwnerId,
        ],
      );
      return updateLikeStatusComment[0] != null;
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }
  async findOne(
    commentId: string,
    userId: string,
    isBanned: boolean,
  ): Promise<TablesLikeStatusCommentsEntity[]> {
    try {
      return await this.db.query(
        `
        SELECT "commentId", "userId", "blogId", "isBanned", "likeStatus", "createdAt"
        FROM public."LikeStatusComments"
        WHERE "commentId" = $1 AND "userId" = $2 AND "isBanned" = $3
          `,
        [commentId, userId, isBanned],
      );
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }

  async countLikesDislikes(
    commentId: string,
    isBanned: boolean,
    likeStatus: string,
  ): Promise<number> {
    try {
      const countBlogs = await this.db.query(
        `
        SELECT count(*)
        FROM public."LikeStatusComments"
        WHERE "commentId" = $1 AND "isBanned" = $2 AND "likeStatus" = $3
      `,
        [commentId, isBanned, likeStatus],
      );
      return Number(countBlogs[0].count);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async changeBanStatusLikesCommentsByUserIdBlogId(
    bannedUserForBlogEntity: TableBannedUsersForBlogsEntity,
  ): Promise<boolean> {
    const { userId, blogId, isBanned } = bannedUserForBlogEntity;
    try {
      return await this.db.query(
        `
        UPDATE public."LikeStatusComments"
        SET "isBanned" = $3
        WHERE "userId" = $1 AND "blogId" = $2 OR "commentOwnerId" = $1 AND "blogId" = $2
        `,
        [userId, blogId, isBanned],
      );
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }

  async changeBanStatusLikesCommentsByBlogId(
    blogId: string,
    isBanned: boolean,
  ): Promise<boolean> {
    try {
      return await this.db.query(
        `
        UPDATE public."LikeStatusComments"
        SET "isBanned" = $2
        WHERE "blogId" = $1
        `,
        [blogId, isBanned],
      );
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }

  async changeBanStatusCommentsLikesByUserId(
    userId: string,
    isBanned: boolean,
  ): Promise<boolean> {
    try {
      return await this.db.query(
        `
        UPDATE public."LikeStatusComments"
        SET "isBanned" = $2
        WHERE "userId" = $1 OR "commentOwnerId" = $1
        `,
        [userId, isBanned],
      );
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }

  async removeLikesCommentsByBlogId(blogId: string): Promise<boolean> {
    try {
      return await this.db.query(
        `
        DELETE FROM public."LikeStatusComments"
        WHERE "blogId" = $1
        `,
        [blogId],
      );
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(error.message);
    }
  }
}
