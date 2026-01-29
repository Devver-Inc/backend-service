// project.domain.ts
import { CreateProjectDto } from './_utils/dto/requests/create-project.dto';
import { UpdateProjectDto } from './_utils/dto/requests/update-project.dto';
import {
  MachineConfiguration,
  AccessControl,
  ProjectDocument,
} from './project.schema';

interface ProjectDomainProps {
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  machineConfiguration: MachineConfiguration;
  teamMemberIds: string[];
  accessControl: AccessControl;
}

export class ProjectDomain {
  readonly name: string;
  readonly description?: string;
  readonly organizationId: string;
  readonly createdBy: string;
  readonly machineConfiguration: MachineConfiguration;
  readonly teamMemberIds: string[];
  readonly accessControl: AccessControl;

  private constructor(props: ProjectDomainProps) {
    this.name = props.name;
    this.description = props.description;
    this.organizationId = props.organizationId;
    this.createdBy = props.createdBy;
    this.machineConfiguration = props.machineConfiguration;
    this.teamMemberIds = props.teamMemberIds;
    this.accessControl = props.accessControl;
  }

  static create(
    dto: CreateProjectDto,
    organizationId: string,
    userId: string,
  ): ProjectDomain {
    return new ProjectDomain({
      name: dto.name,
      description: dto.description,
      organizationId,
      createdBy: userId,
      machineConfiguration: {
        cpuCores: dto.machineConfiguration?.cpuCores ?? 2,
        ram: dto.machineConfiguration?.ram ?? 4,
        storage: dto.machineConfiguration?.storage ?? 20,
      },
      teamMemberIds: dto.teamMemberIds ?? [],
      accessControl: {
        requireEmailAuth: dto.accessControl?.requireEmailAuth ?? true,
        publicAccess: dto.accessControl?.publicAccess ?? false,
        restrictToTeamMembers:
          dto.accessControl?.restrictToTeamMembers ?? false,
      },
    });
  }

  static fromDocument(doc: ProjectDocument): ProjectDomain {
    return new ProjectDomain({
      name: doc.name,
      description: doc.description,
      organizationId: doc.organizationId,
      createdBy: doc.createdBy,
      machineConfiguration: doc.machineConfiguration,
      teamMemberIds: doc.teamMemberIds,
      accessControl: doc.accessControl,
    });
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }

  isTeamMember(userId: string): boolean {
    return this.teamMemberIds.includes(userId);
  }

  addTeamMembers(userIds: string[]): ProjectDomain {
    const existingIds = new Set(this.teamMemberIds);
    const newIds = userIds.filter((id) => !existingIds.has(id));

    return new ProjectDomain({
      ...this,
      teamMemberIds: [...this.teamMemberIds, ...newIds],
    });
  }

  removeTeamMember(userId: string): ProjectDomain {
    return new ProjectDomain({
      ...this,
      teamMemberIds: this.teamMemberIds.filter((id) => id !== userId),
    });
  }

  update(dto: UpdateProjectDto): ProjectDomain {
    return new ProjectDomain({
      ...this,
      name: dto.name ?? this.name,
      description: dto.description ?? this.description,
      teamMemberIds: dto.teamMemberIds ?? this.teamMemberIds,
      machineConfiguration: dto.machineConfiguration
        ? { ...this.machineConfiguration, ...dto.machineConfiguration }
        : this.machineConfiguration,
      accessControl: dto.accessControl
        ? { ...this.accessControl, ...dto.accessControl }
        : this.accessControl,
    });
  }
}
