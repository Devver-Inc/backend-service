import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { escapeRegex } from 'src/_utils/functions/escape-regex.function';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { ProjectDomain } from './project.domain';
import { ManifestStatus, Project, ProjectDocument } from './project.schema';
import { LeanWithMongoId } from 'src/_utils/types';

export type ProjectLean = LeanWithMongoId<Project>;

@Injectable()
export class ProjectsRepository {
  NOT_FOUND_ERROR = 'PROJECT_NOT_FOUND';

  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  create = async (domain: ProjectDomain): Promise<ProjectDocument> => {
    try {
      return await this.projectModel.create(domain);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === 11000
      ) {
        throw new BadRequestException('PROJECT_NAME_ALREADY_EXISTS');
      }
      throw err;
    }
  };

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
        .sort({ [query.sortBy]: sortDirection })
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
        .sort({ [query.sortBy]: sortDirection })
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

  updateDeploymentManifestStatus = (
    projectId: string,
    status: ManifestStatus,
  ): Promise<ProjectDocument> =>
    this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $set: { 'deploymentConfig.manifestStatus': status } },
        { new: true },
      )
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();

  updateMongoManifestStatus = (
    projectId: string,
    status: ManifestStatus,
  ): Promise<ProjectDocument> =>
    this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $set: { 'mongoConfiguration.manifestStatus': status } },
        { new: true },
      )
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
}
