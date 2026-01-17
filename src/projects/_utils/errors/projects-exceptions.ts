import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ProjectsExceptions {
  USER_NOT_IN_ORGANIZATION = new BadRequestException(
    'USER_NOT_IN_ORGANIZATION',
  );
  PROJECT_NOT_FOUND = new NotFoundException('PROJECT_NOT_FOUND');
  PROJECT_ACCESS_DENIED = new ForbiddenException('PROJECT_ACCESS_DENIED');
  SOME_MEMBERS_NOT_IN_ORGANIZATION = new BadRequestException(
    'SOME_MEMBERS_NOT_IN_ORGANIZATION',
  );
  USER_NOT_TEAM_MEMBER = new BadRequestException('USER_NOT_TEAM_MEMBER');
}
