import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

@Injectable()
export class LogtoExceptions {
  DEFAULT_LOGTO_ERROR = new InternalServerErrorException(
    "Error during request to logto",
  );
  ERROR_CREATE_ORGANIZATION = new BadRequestException(
    "Failed to create organization",
  );
  ERROR_ADD_USERS_TO_ORGANIZATION = new BadRequestException(
    "Failed to add users to organization",
  );
  ERROR_ASSIGN_ROLES_ORGANIZATION_MEMBERS = new BadRequestException(
    "Failed to assign roles to organization members",
  );
  ERROR_FETCH_USER_INFORMATIONS = new BadRequestException(
    "Failed to fetch user informations",
  );
  ERROR_UPDATE_USER_PASSWORD = new BadRequestException(
    "Failed to update user password",
  );
  ERROR_CHECK_IF_USER_HAS_PASSWORD = new BadRequestException(
    "Failed to check if user has password",
  );
  ERROR_VERIFY_USER_PASSWORD = new BadRequestException(
    "Failed to verify user password",
  );
  ERROR_ADD_ORGANIZATION_JIT_DEFAULT_ROLES = new BadRequestException(
    "Failed to add organization JIT default roles",
  );
  ERROR_CREATE_INVITATION = new BadRequestException(
    "Failed to create organization invitation",
  );
  ERROR_GET_INVITATIONS = new BadRequestException(
    "Failed to get organization invitations",
  );
  ERROR_DELETE_INVITATION = new BadRequestException(
    "Failed to delete invitation",
  );
  ERROR_ACCEPT_INVITATION = new BadRequestException(
    "Failed to accept invitation",
  );
  ERROR_UPDATE_USER_PROFILE = new BadRequestException(
    "Failed to update user profile",
  );
}
