import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class OrganizationsExceptions {
  USER_NOT_IN_ORGANIZATION = new BadRequestException(
    'USER_NOT_IN_ORGANIZATION',
  );
  CANNOT_DELETE_WITH_MULTIPLE_MEMBERS = new BadRequestException(
    'CANNOT_DELETE_ORGANIZATION_WITH_MULTIPLE_MEMBERS',
  );
  USER_MUST_HAVE_EMAIL_FOR_INVITATIONS = new BadRequestException(
    'USER_MUST_HAVE_VERIFIED_EMAIL_FOR_INVITATIONS',
  );
  CANNOT_TRANSFER_TO_YOURSELF = new BadRequestException(
    'CANNOT_TRANSFER_OWNERSHIP_TO_YOURSELF',
  );
  NEW_OWNER_NOT_ADMIN = new BadRequestException(
    'NEW_OWNER_MUST_BE_ADMINISTRATOR',
  );
  CANNOT_REMOVE_OWNER = new BadRequestException(
    'CANNOT_REMOVE_OWNER_FROM_ORGANIZATION',
  );
  NOT_ALLOWED_TO_REMOVE_USER = new ForbiddenException(
    'NOT_ALLOWED_TO_REMOVE_USER',
  );
  INVITATION_NOT_FOR_CURRENT_USER = new ForbiddenException(
    'INVITATION_NOT_FOR_CURRENT_USER',
  );
  ADMIN_ORGANIZATION_ROLE_NOT_FOUND = () =>
    new InternalServerErrorException(
      'ADMIN_ORGANIZATION_ROLE_NOT_FOUND: ensure the "admin" organization role exists in Logto.',
    );
}
