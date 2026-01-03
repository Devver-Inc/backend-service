import { GetUserLightDto } from 'src/users/_utils/dto/responses/get-user-light.dto';

export interface GetOrganizationDetailsDto {
  id: string;
  name: string;
  coverImageUrl: string | null;
  owner: GetUserLightDto | null;
  admins: GetUserLightDto[];
  membersCount: number;
}
