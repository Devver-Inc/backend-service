import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { escapeRegex } from 'src/_utils/functions/escape-regex.function';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { ProjectDomain } from './project.domain';
import { DeploymentStatus, Project, ProjectDocument } from './project.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type ProjectLean = LeanWithMongoId<Project>;

@Injectable()
export class ProjectsRepository {
  NOT_FOUND_ERROR = 'PROJECT_NOT_FOUND';

  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  create = (domain: ProjectDomain): Promise<ProjectDocument> =>
    this.projectModel.create(domain);

  findById = (id: string): Promise<ProjectDocument> =>
    this.projectModel
      .findById(id)
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();

  findByProjectAndOrganizationId = (
    projectId: string,
    organizationId: string,
  ): Promise<ProjectDocument> =>
    this.projectModel
      .findOne({ _id: projectId, organizationId })
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();

  findByOrganizationId = async (
    organizationId: string,
    query: ProjectsPaginatedQueryDto,
  ): Promise<{ projects: ProjectLean[]; totalCount: number }> => {
    const filter: QueryFilter<Project> = { organizationId };

    if (query.search) {
      filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    }

    const sortDirection = query.sortDirection === 'ASC' ? 1 : -1;

    const [projects, totalCount] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ [query.sortBy || 'createdAt']: sortDirection })
        .skip(query.skip)
        .limit(query.limit || 10)
        .lean()
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return { projects, totalCount };
  };

  findByOrganizationAndMember = async (
    organizationId: string,
    userId: string,
    query: ProjectsPaginatedQueryDto,
  ): Promise<{ projects: ProjectLean[]; totalCount: number }> => {
    const filter: QueryFilter<Project> = {
      organizationId,
      teamMemberIds: userId,
    };

    if (query.search) {
      filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    }

    const sortDirection = query.sortDirection === 'ASC' ? 1 : -1;

    const [projects, totalCount] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ [query.sortBy || 'createdAt']: sortDirection })
        .skip(query.skip)
        .limit(query.limit || 10)
        .lean()
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return { projects, totalCount };
  };

  save = (project: ProjectDocument): Promise<ProjectDocument> => project.save();

  deleteById = async (id: string): Promise<void> => {
    await this.projectModel
      .findByIdAndDelete(id)
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
  };

  updateDeploymentStatus = (
    projectId: string,
    status: DeploymentStatus,
  ): Promise<ProjectDocument> =>
    this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $set: { 'deploymentConfig.status': status } },
        { new: true },
      )
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
}
