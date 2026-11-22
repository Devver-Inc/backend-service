import { Injectable } from '@nestjs/common';
import { DocOrLean } from 'src/_utils/types';
import { LogtoUser } from 'src/logto/_utils/types/responses/responses.type';
import { UsersMapper } from 'src/users/user.mapper';
import { GetProjectDto } from './_utils/dto/responses/get-project.dto';
import { GetProjectLightDto } from './_utils/dto/responses/get-project-light.dto';
import { isDeprecatedVersion } from './database-catalog';
import { Project, ProjectDocument } from './project.schema';

@Injectable()
export class ProjectsMapper {
  constructor(private readonly usersMapper: UsersMapper) {}

  toProjectLightDto = (project: DocOrLean<Project>): GetProjectLightDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    createdAt: project.createdAt,
  });

  toProjectDto = (
    project: ProjectDocument,
    createdByUser: LogtoUser | null,
    teamMembers: LogtoUser[],
  ): GetProjectDto => ({
    id: project._id.toString(),
    name: project.name,
    description: project.description ?? null,
    organizationId: project.organizationId,
    createdBy: createdByUser
      ? this.usersMapper.toUserLightDto(createdByUser)
      : null,
    machineConfiguration: {
      cpuCores: project.machineConfiguration.cpuCores,
      ram: project.machineConfiguration.ram,
    },
    teamMembers: this.usersMapper.toUserLightDtoFromArray(teamMembers),
    overlayAccessControl: {
      commentPermission: project.overlayAccessControl?.commentPermission,
    },
    databaseConfigurations: (project.databaseConfigurations ?? []).map(
      (configuration) => ({
        name: configuration.name,
        type: configuration.type,
        enabled: configuration.enabled,
        version: configuration.version,
        deprecated: isDeprecatedVersion(
          configuration.type,
          configuration.version,
        ),
        size: configuration.size,
        disk: configuration.disk,
      }),
    ),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
}
