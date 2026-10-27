import { readFile } from 'node:fs/promises';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  VaultConfig,
} from 'src/_utils/config/env.config';

const SERVICE_ACCOUNT_TOKEN_PATH =
  '/var/run/secrets/kubernetes.io/serviceaccount/token';

/** KV v2 client. Paths are relative to the mount, e.g. `projects/p-<id>/agent`. */
@Injectable()
export class VaultService {
  private readonly config: VaultConfig;
  private token?: { value: string; expiresAt: number };

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.config = configService.get('VAULT');
  }

  write = async (path: string, data: Record<string, string>): Promise<void> => {
    await this.call('POST', `${this.config.VAULT_KV_MOUNT}/data/${path}`, {
      data,
    });
  };

  read = async (path: string): Promise<Record<string, string> | undefined> => {
    const res = await this.call(
      'GET',
      `${this.config.VAULT_KV_MOUNT}/data/${path}`,
    );
    if (!res) return undefined;
    return (res as { data: { data: Record<string, string> } }).data.data;
  };

  /** Deletes every version and the metadata, so nothing is left to recover. */
  delete = async (path: string): Promise<void> => {
    await this.call('DELETE', `${this.config.VAULT_KV_MOUNT}/metadata/${path}`);
  };

  private async call(
    method: string,
    path: string,
    body?: unknown,
    retried = false,
  ): Promise<unknown> {
    const res = await fetch(`${this.config.VAULT_ADDR}/v1/${path}`, {
      method,
      headers: {
        'X-Vault-Token': await this.getToken(),
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => {
      throw new ServiceUnavailableException('VAULT_UNREACHABLE');
    });

    if (res.status === 404) return undefined;
    if (res.status === 403 && !retried && !this.config.VAULT_TOKEN) {
      this.token = undefined;
      return this.call(method, path, body, true);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`VAULT_ERROR_${res.status}`);
    }
    return res.status === 204 ? undefined : res.json();
  }

  private async getToken(): Promise<string> {
    if (this.config.VAULT_TOKEN) return this.config.VAULT_TOKEN;
    if (this.token && this.token.expiresAt > Date.now())
      return this.token.value;

    const jwt = await readFile(SERVICE_ACCOUNT_TOKEN_PATH, 'utf8');
    const res = await fetch(
      `${this.config.VAULT_ADDR}/v1/auth/${this.config.VAULT_AUTH_MOUNT}/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: this.config.VAULT_ROLE, jwt }),
      },
    );
    if (!res.ok) {
      throw new ServiceUnavailableException(`VAULT_LOGIN_FAILED_${res.status}`);
    }
    const { auth } = (await res.json()) as {
      auth: { client_token: string; lease_duration: number };
    };
    // Renew a minute early so a request never carries an expiring token.
    this.token = {
      value: auth.client_token,
      expiresAt: Date.now() + (auth.lease_duration - 60) * 1000,
    };
    return this.token.value;
  }
}
