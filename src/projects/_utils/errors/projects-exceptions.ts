import {
  BadRequestException,
  ConflictException,
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
  DATABASE_VERSION_NOT_SUPPORTED = new BadRequestException(
    'DATABASE_VERSION_NOT_SUPPORTED',
  );
  DUPLICATE_DATABASE_TYPE = new BadRequestException('DUPLICATE_DATABASE_TYPE');
  DATABASE_ALREADY_EXISTS = new ConflictException('DATABASE_ALREADY_EXISTS');
  DATABASE_NOT_ENABLED = new BadRequestException('DATABASE_NOT_ENABLED');
  INVALID_DATABASE_NAME = new BadRequestException('INVALID_DATABASE_NAME');
}
