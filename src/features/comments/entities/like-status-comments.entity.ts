import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { CommentsEntity } from './comments.entity';
import { UsersEntity } from '../../users/entities/users.entity';
import { BloggerBlogsEntity } from '../../blogger-blogs/entities/blogger-blogs.entity';
import { LikeStatusEnums } from '../../../config/db/mongo/enums/like-status.enums';

@Entity('LikeStatusComments')
export class LikeStatusCommentsEntity {
  @PrimaryColumn('uuid', { nullable: false })
  id: string;

  @Column({
    type: 'enum',
    enum: LikeStatusEnums,
    default: LikeStatusEnums.NONE,
    nullable: false,
  })
  likeStatus: LikeStatusEnums;

  @Column({
    type: 'character varying',
    length: 50,
    nullable: false,
  })
  createdAt: string;

  @Column({ default: false })
  isBanned: boolean;

  @ManyToOne(() => CommentsEntity, (comment) => comment.id, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'commentId' })
  comment: CommentsEntity;

  @ManyToOne(() => UsersEntity, (user) => user.ratedCommentUser, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  ratedCommentUser: UsersEntity;

  @ManyToOne(() => BloggerBlogsEntity, (blog) => blog.id, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'blogId', referencedColumnName: 'id' })
  blog: BloggerBlogsEntity;

  @ManyToOne(() => UsersEntity, (user) => user.userId, {
    nullable: false,
    eager: true,
  })
  @JoinColumn({ name: 'commentOwnerId', referencedColumnName: 'userId' })
  commentOwner: UsersEntity;
}
