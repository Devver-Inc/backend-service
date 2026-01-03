import { GetOrganizationLightDto } from 'src/organizations/_utils/dto/responses/get-organization-light.dto';

export class GetUserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  organization?: GetOrganizationLightDto;
  lastSignInAt: number;
  hasPassword: boolean;
}
