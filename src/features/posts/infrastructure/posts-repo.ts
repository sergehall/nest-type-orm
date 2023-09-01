import { InjectRepository } from '@nestjs/typeorm';
import { InsertResult, Repository } from 'typeorm';
import { PostsEntity } from '../entities/posts.entity';
import { CurrentUserDto } from '../../users/dto/currentUser.dto';
import { BloggerBlogsEntity } from '../../blogger-blogs/entities/blogger-blogs.entity';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from '../dto/create-post.dto';
import * as uuid4 from 'uuid4';
import { UsersEntity } from '../../users/entities/users.entity';
import { PartialPostsEntity } from '../dto/return-posts-entity.dto';
import {
  ExtendedLikesInfo,
  NewestLikes,
  ReturnPostsEntity,
} from '../entities/return-posts.entity';
import { BannedFlagsDto } from '../dto/banned-flags.dto';
import { PagingParamsDto } from '../../../common/pagination/dto/paging-params.dto';
import {
  ParseQueriesDto,
  SortDirection,
} from '../../../common/query/dto/parse-queries.dto';
import { LikeStatusPostsEntity } from '../entities/like-status-posts.entity';
import { KeyResolver } from '../../../common/helpers/key-resolver';
import { LikeStatusEnums } from '../../../config/db/mongo/enums/like-status.enums';
import { PostsAndCountDto } from '../dto/posts-and-count.dto';

export class PostsRepo {
  constructor(
    protected keyResolver: KeyResolver,
    @InjectRepository(PostsEntity)
    private readonly postsRepository: Repository<PostsEntity>,
    @InjectRepository(LikeStatusPostsEntity)
    private readonly likePostsRepository: Repository<LikeStatusPostsEntity>,
  ) {}

  async findPostById(id: string): Promise<PostsEntity | null> {
    try {
      const post = await this.postsRepository.findBy({ id });
      return post[0] ? post[0] : null;
    } catch (error) {
      if (await this.isInvalidUUIDError(error)) {
        const userId = await this.extractUserIdFromError(error);
        throw new NotFoundException(`Post with ID ${userId} not found`);
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async createPosts(
    blog: BloggerBlogsEntity,
    createPostDto: CreatePostDto,
    currentUserDto: CurrentUserDto,
  ): Promise<ReturnPostsEntity> {
    const postEntity: PostsEntity = await this.creatPostsEntity(
      blog,
      createPostDto,
      currentUserDto,
    );

    try {
      const queryBuilder = this.postsRepository
        .createQueryBuilder()
        .insert()
        .into(PostsEntity)
        .values(postEntity)
        .returning(
          `"id", "title", "shortDescription", "content", "blogId", "blogName", "createdAt"`,
        );

      const result: InsertResult = await queryBuilder.execute();

      return await this.addExtendedLikesInfoToPostsEntity(result.raw[0]);
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException(
        'An error occurred while creating a new post.',
      );
    }
  }

  async getPostsInBlogWithPagination(
    blogId: string,
    queryData: ParseQueriesDto,
    currentUserDto: CurrentUserDto | null,
  ): Promise<PostsAndCountDto> {
    // Retrieve banned flags
    const bannedFlags: BannedFlagsDto = await this.getBannedFlags();

    // Retrieve paging parameters
    const pagingParams: PagingParamsDto = await this.getPagingParams(queryData);

    const { dependencyIsBanned, isBanned } = bannedFlags;
    const { sortBy, direction, limit, offset } = pagingParams;
    const numberLastLikes = 3;

    // Query posts and countPosts with pagination conditions
    const [posts, countPosts] = await this.postsRepository.findAndCount({
      where: {
        dependencyIsBanned,
        isBanned,
        blog: { id: blogId },
      },
      order: { [sortBy]: direction },
      take: limit,
      skip: offset,
    });

    // Extract post IDs
    const postIds = posts.map((post) => post.id);

    if (postIds.length === 0) {
      return {
        posts: [],
        countPosts: 0,
      };
    }

    const postWithLikes = await this.postsLikesAggregation(
      postIds,
      posts,
      numberLastLikes,
      currentUserDto,
    );

    return {
      posts: postWithLikes,
      countPosts,
    };
  }

  async getPostsWithPagination(
    queryData: ParseQueriesDto,
    currentUserDto: CurrentUserDto | null,
  ): Promise<PostsAndCountDto> {
    // Retrieve banned flags
    const bannedFlags: BannedFlagsDto = await this.getBannedFlags();

    // Retrieve paging parameters
    const pagingParams: PagingParamsDto = await this.getPagingParams(queryData);

    const { dependencyIsBanned, isBanned } = bannedFlags;
    const { sortBy, direction, limit, offset } = pagingParams;
    const numberLastLikes = 3;

    // Query posts and countPosts with pagination conditions
    const [posts, countPosts] = await this.postsRepository.findAndCount({
      where: {
        dependencyIsBanned,
        isBanned,
      },
      order: { [sortBy]: direction },
      take: limit,
      skip: offset,
    });

    // Extract post IDs
    const postIds = posts.map((post) => post.id);

    if (postIds.length === 0) {
      return {
        posts: [],
        countPosts: 0,
      };
    }

    const postWithLikes: ReturnPostsEntity[] = await this.postsLikesAggregation(
      postIds,
      posts,
      numberLastLikes,
      currentUserDto,
    );

    return {
      posts: postWithLikes,
      countPosts,
    };
  }

  private async postsLikesAggregation(
    postIds: string[],
    posts: PostsEntity[],
    numberLastLikes: number,
    currentUserDto: CurrentUserDto | null,
  ): Promise<ReturnPostsEntity[]> {
    // Query like status data for the posts
    const likeStatusPostsData: LikeStatusPostsEntity[] =
      await this.likePostsRepository
        .createQueryBuilder('likeStatusPosts')
        .leftJoinAndSelect('likeStatusPosts.post', 'post')
        .leftJoinAndSelect('likeStatusPosts.ratedPostUser', 'ratedPostUser')
        .where('likeStatusPosts.post.id IN (:...postIds)', { postIds })
        .orderBy('likeStatusPosts.addedAt', 'DESC')
        .take(numberLastLikes) // Limit the number of retrieved likes per post
        .getMany();

    // Process posts and associated like data
    return posts.map((post: PostsEntity): ReturnPostsEntity => {
      const filteredData: LikeStatusPostsEntity[] = likeStatusPostsData.filter(
        (item: LikeStatusPostsEntity) => item.post.id === post.id,
      );

      // Create an array of last likes for the post
      const lastLikes: NewestLikes[] = filteredData.map(
        (item: LikeStatusPostsEntity): NewestLikes => ({
          addedAt: item.addedAt,
          userId: item.ratedPostUser.userId,
          login: item.ratedPostUser.login,
        }),
      );

      // Count likes and dislikes
      const likesCount = filteredData.filter(
        (item: LikeStatusPostsEntity) =>
          item.likeStatus === LikeStatusEnums.LIKE,
      ).length;
      const dislikesCount = filteredData.filter(
        (item: LikeStatusPostsEntity) =>
          item.likeStatus === LikeStatusEnums.DISLIKE,
      ).length;

      // Determine the user's status for the post
      let myStatus: LikeStatusEnums = LikeStatusEnums.NONE;
      if (
        currentUserDto &&
        filteredData[0] &&
        currentUserDto.userId === filteredData[0].ratedPostUser.userId
      ) {
        myStatus = filteredData[0].likeStatus;
      }
      // Construct the posts data with extended likes information
      return {
        id: post.id,
        title: post.title,
        shortDescription: post.shortDescription,
        content: post.content,
        blogId: post.blog.id,
        blogName: post.blog.name,
        createdAt: post.createdAt,
        extendedLikesInfo: {
          likesCount: likesCount,
          dislikesCount: dislikesCount,
          myStatus: myStatus,
          newestLikes: lastLikes,
        },
      };
    });
  }

  private async creatPostsEntity(
    blog: BloggerBlogsEntity,
    createPostDto: CreatePostDto,
    currentUserDto: CurrentUserDto,
  ): Promise<PostsEntity> {
    const { title, shortDescription, content } = createPostDto;

    const user = new UsersEntity();
    user.userId = currentUserDto.userId;

    const postEntity = new PostsEntity();
    postEntity.id = uuid4().toString();
    postEntity.title = title;
    postEntity.shortDescription = shortDescription;
    postEntity.content = content;
    postEntity.createdAt = new Date().toISOString();
    postEntity.dependencyIsBanned = false;
    postEntity.isBanned = false;
    postEntity.banDate = null;
    postEntity.banReason = null;
    postEntity.blog = blog;
    postEntity.postOwner = user;

    return postEntity;
  }

  private async addExtendedLikesInfoToPostsEntity(
    newPost: PartialPostsEntity,
  ): Promise<ReturnPostsEntity> {
    const extendedLikesInfo = new ExtendedLikesInfo();
    return {
      ...newPost, // Spread properties of newPost
      extendedLikesInfo, // Add extendedLikesInfo property
    };
  }
  private async getBannedFlags(): Promise<BannedFlagsDto> {
    return {
      commentatorInfoIsBanned: false,
      dependencyIsBanned: false,
      banInfoIsBanned: false,
      isBanned: false,
    };
  }

  private async getPagingParams(
    queryData: ParseQueriesDto,
  ): Promise<PagingParamsDto> {
    const sortBy: string = await this.getSortBy(
      queryData.queryPagination.sortBy,
    );
    const direction: SortDirection = queryData.queryPagination.sortDirection;
    const limit: number = queryData.queryPagination.pageSize;
    const offset: number = (queryData.queryPagination.pageNumber - 1) * limit;

    return { sortBy, direction, limit, offset };
  }

  private async getSortBy(sortBy: string): Promise<string> {
    return await this.keyResolver.resolveKey(
      sortBy,
      [
        'title',
        'shortDescription',
        'content',
        'blogName',
        'dependencyIsBanned',
        'banInfoIsBanned',
        'banInfoBanDate',
        'banInfoBanReason',
      ],
      'createdAt',
    );
  }

  private async isInvalidUUIDError(error: any): Promise<boolean> {
    return error.message.includes('invalid input syntax for type uuid');
  }

  private async extractUserIdFromError(error: any): Promise<string | null> {
    const match = error.message.match(/"([^"]+)"/);
    return match ? match[1] : null;
  }
}
