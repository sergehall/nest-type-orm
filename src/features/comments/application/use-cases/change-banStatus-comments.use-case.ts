import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { LikeStatusCommentsRepository } from '../../infrastructure/like-status-comments.repository';
import { CommentsRepository } from '../../infrastructure/comments.repository';

export class ChangeBanStatusCommentsCommand {
  constructor(public userId: string, public isBanned: boolean) {}
}

@CommandHandler(ChangeBanStatusCommentsCommand)
export class ChangeBanStatusCommentsUseCase
  implements ICommandHandler<ChangeBanStatusCommentsCommand>
{
  constructor(
    protected likeStatusCommentsRepository: LikeStatusCommentsRepository,
    protected commentsRepository: CommentsRepository,
  ) {}
  async execute(command: ChangeBanStatusCommentsCommand): Promise<boolean> {
    await this.commentsRepository.bannedCommentByUserId(
      command.userId,
      command.isBanned,
    );
    await this.likeStatusCommentsRepository.changeBanStatusCommentsLike(
      command.userId,
      command.isBanned,
    );
    return true;
  }
}
