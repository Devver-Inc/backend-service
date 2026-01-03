import { paths } from 'node_modules/@logto/api/lib/generated-types/management';
import { OrganizationCustomData } from '../../schemas/logto-organization.schema';

type PathParams<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends {
  parameters: infer P;
}
  ? P
  : never;

type PathRequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends {
  requestBody: infer B;
}
  ? B
  : never;

export type GetUserParams = PathParams<'/api/users/{userId}', 'get'>;
export type CreateOrganizationParams = PathParams<'/api/organizations', 'post'>;
export type CreateOrganizationBody = Omit<
  PathRequestBody<'/api/organizations', 'post'>['content']['application/json'],
  'customData'
> & { customData: OrganizationCustomData };
export type UpdateOrganizationBody = Omit<
  PathRequestBody<
    '/api/organizations/{id}',
    'patch'
  >['content']['application/json'],
  'customData'
> & {
  customData?: OrganizationCustomData;
};
