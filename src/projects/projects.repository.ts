import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { ProjectsPaginatedQueryDto } from './_utils/dto/query/projects-paginated-query.dto';
import { ProjectDomain } from './project.domain';
import { Project, ProjectDocument } from './project.schema';

@Injectable()
export class ProjectsRepository {
  NOT_FOUND_ERROR = 'PROJECT_NOT_FOUND';

  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async create(domain: ProjectDomain): Promise<ProjectDocument> {
    return this.projectModel.create(domain);
  }

  async findById(id: string): Promise<ProjectDocument> {
    return this.projectModel.findById(id).orFail().exec();
  }

  findByProjectAndOrganizationId = (
    projectId: string,
    organizationId: string,
  ): Promise<ProjectDocument> => {
    return this.projectModel
      .findOne({ _id: projectId, organizationId })
      .orFail(new NotFoundException(this.NOT_FOUND_ERROR))
      .exec();
  };

  async findByOrganizationId(
    organizationId: string,
    query: ProjectsPaginatedQueryDto,
  ): Promise<{ projects: ProjectDocument[]; totalCount: number }> {
    const filter: QueryFilter<Project> = { organizationId };

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const sortDirection = query.sortDirection === 'ASC' ? 1 : -1;

    const [projects, totalCount] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ [query.sortBy || 'createdAt']: sortDirection })
        .skip(query.skip)
        .limit(query.limit || 10)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return { projects, totalCount };
  }

  async save(project: ProjectDocument): Promise<ProjectDocument> {
    return project.save();
  }

  async deleteById(id: string): Promise<void> {
    await this.projectModel.findByIdAndDelete(id).orFail().exec();
  }
}
