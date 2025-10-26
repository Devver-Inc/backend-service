import { EntityByIdPipe } from './entity-by-id.pipe';
import { UsersRepository } from 'src/users/users.repository';
import { UserDocument } from 'src/users/user.schema';

export const UserByIdPipe = EntityByIdPipe.for<UserDocument>(UsersRepository);
