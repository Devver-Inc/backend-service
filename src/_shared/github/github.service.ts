import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { toSlug } from 'src/_utils/functions/to-slug.function';

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {
    const githubConfig = this.configService.get('GITHUB', { infer: true });
    const token = githubConfig.GITHUB_TOKEN;

    if (!token) {
      this.logger.error(
        'GITHUB_TOKEN is not defined in environment variables. Please add a valid GitHub Personal Access Token to your .env file.',
      );
      throw new Error(
        'GITHUB_TOKEN is required. Generate one at: https://github.com/settings/tokens',
      );
    }

    // Validate token format
    if (
      !token.startsWith('ghp_') &&
      !token.startsWith('github_pat_') &&
      !token.startsWith('gho_') &&
      !token.startsWith('ghs_')
    ) {
      this.logger.warn(
        'GITHUB_TOKEN does not match expected format. Valid tokens start with ghp_, github_pat_, gho_, or ghs_',
      );
    }

    this.owner = githubConfig.GITHUB_OWNER;
    this.repo = githubConfig.GITHUB_REPO;
    this.branch = githubConfig.GITHUB_BRANCH;

    this.octokit = new Octokit({
      auth: token,
    });

    this.logger.log(
      `GitHub service initialized - Owner: ${this.owner}, Repo: ${this.repo}, Branch: ${this.branch}`,
    );
  }

  /**
   * Create or update a file in the GitHub repository
   */
  async createOrUpdateFile(
    path: string,
    content: string,
    message: string,
  ): Promise<void> {
    try {
      // Check if file exists
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path,
          ref: this.branch,
        });

        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (error) {
        if (
          error instanceof Error &&
          'status' in error &&
          (error as Error & { status: number }).status !== 404
        ) {
          throw error;
        }
        // File doesn't exist, which is fine for creation
      }

      // Create or update the file
      const contentBase64 = Buffer.from(content).toString('base64');

      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: contentBase64,
        branch: this.branch,
        ...(sha && { sha }),
      });

      this.logger.log(
        `Successfully ${sha ? 'updated' : 'created'} file: ${path}`,
      );
    } catch (error) {
      this.logger.error(`Failed to create/update file ${path}:`, error);
      throw new Error(`GitHub operation failed: ${error.message}`);
    }
  }

  /**
   * Push values.yaml file for an organization/project
   */
  async pushValuesYaml(
    organizationName: string,
    projectName: string,
    yamlContent: string,
  ): Promise<void> {
    const path = `${toSlug(organizationName)}/${toSlug(projectName)}/values.yaml`;
    const message = `Deploy ${projectName} for ${organizationName}`;

    await this.createOrUpdateFile(path, yamlContent, message);
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, message: string): Promise<void> {
    try {
      // Get the file to retrieve its SHA
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (!('sha' in data)) {
        throw new Error('File not found or is a directory');
      }

      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha: data.sha,
        branch: this.branch,
      });

      this.logger.log(`Successfully deleted file: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${path}:`, error);
      throw new Error(`GitHub deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete values.yaml for an organization/project (also removes the folder)
   */
  async deleteValuesYaml(
    organizationName: string,
    projectName: string,
  ): Promise<void> {
    const path = `${toSlug(organizationName)}/${toSlug(projectName)}/values.yaml`;
    const message = `Remove ${projectName} from ${organizationName}`;
    await this.deleteFile(path, message);
  }

  /**
   * Check if a file exists in the repository
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        'status' in error &&
        (error as Error & { status: number }).status === 404
      ) {
        return false;
      }
      throw error;
    }
  }
}
