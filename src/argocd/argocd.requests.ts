import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EnvironmentVariables } from 'src/_utils/config/env.config';
import { ArgoCdApplicationStatus } from './_utils/types/argocd.types';

@Injectable()
export class ArgoCdRequests {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    const argoCdConfig = configService.get('ARGOCD');
    this.baseUrl = argoCdConfig.ARGOCD_BASE_URL;
    this.apiKey = argoCdConfig.ARGOCD_API_KEY;
  }

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  async getApplicationStatus(
    appName: string,
  ): Promise<ArgoCdApplicationStatus> {
    const { data } = await firstValueFrom(
      this.httpService.get<ArgoCdApplicationStatus>(
        `${this.baseUrl}/api/v1/applications/${encodeURIComponent(appName)}`,
        { headers: this.headers },
      ),
    );
    return data;
  }

  async refreshApplication(appName: string): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/api/v1/applications/${encodeURIComponent(appName)}/refresh`,
        {},
        { headers: this.headers },
      ),
    );
  }
}
