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

  sync = (appName: string): Promise<void> =>
    firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/api/v1/applications/${encodeURIComponent(appName)}/sync`,
        {},
        { headers: this.headers },
      ),
    ).then(() => {});

  runResourceAction = (
    appName: string,
    resource: ArgoResourceRef,
    action: string,
  ): Promise<void> =>
    firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/api/v1/applications/${encodeURIComponent(appName)}/resource/actions/v2`,
        { name: appName, ...resource, action },
        { headers: this.headers },
      ),
    ).then(() => {});

  getResourceManifest = async (
    appName: string,
    resource: ArgoResourceRef,
  ): Promise<Record<string, any>> => {
    const { data } = await firstValueFrom(
      this.httpService.get<{ manifest: string }>(
        `${this.baseUrl}/api/v1/applications/${encodeURIComponent(appName)}/resource`,
        { headers: this.headers, params: resource },
      ),
    );
    return JSON.parse(data.manifest);
  };
}

export interface ArgoResourceRef {
  namespace: string;
  resourceName: string;
  group: string;
  version: string;
  kind: string;
}
