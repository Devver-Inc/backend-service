import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class DeploymentsExceptions {
  DEPLOYMENT_NOT_FOUND = new NotFoundException('DEPLOYMENT_NOT_FOUND');
  DEPLOYMENT_ALREADY_EXISTS = new BadRequestException(
    'DEPLOYMENT_ALREADY_EXISTS',
  );
}
