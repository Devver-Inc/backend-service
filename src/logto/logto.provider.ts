import { createManagementApi } from "@logto/api/management";
import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet } from "jose";
import {
  EnvironmentVariables,
  LogtoConfig,
} from "src/_utils/config/env.config";
import {
  LOGTO_API_INDICATOR,
  LOGTO_CLIENT_TOKEN,
  LOGTO_CREDENTIALS,
  LOGTO_JWKS_TOKEN,
  LOGTO_TENANT_ID,
  LOGTO_URIS_TOKEN,
} from "src/_utils/constants";
import { JwksUris } from "src/logto/_utils/types/jwks-set.types";
import {
  LogtoClient,
  LogtoClientCredentials,
} from "src/logto/_utils/types/logto.types";
import { OpenIdConfig } from "src/logto/_utils/types/openid-config.types";

export const logtoProviders: Provider[] = [
  {
    provide: LOGTO_CLIENT_TOKEN,
    useFactory: (
      configService: ConfigService<EnvironmentVariables, true>,
      logger: Logger
    ): LogtoClient => {
      const clientId = configService.get<LogtoConfig>("LOGTO").LOGTO_CLIENT_ID;
      const clientSecret = configService.get<LogtoConfig>("LOGTO").LOGTO_SECRET;
      const baseUrl = configService.get<LogtoConfig>("LOGTO").LOGTO_BASE_URL;

      try {
        const { apiClient } = createManagementApi(LOGTO_TENANT_ID, {
          clientId: clientId,
          clientSecret: clientSecret,
          baseUrl: baseUrl,
          apiIndicator: LOGTO_API_INDICATOR,
        });
        logger.log("Logto client initialized successfully", LOGTO_CLIENT_TOKEN);
        return apiClient as LogtoClient;
      } catch (error) {
        logger.error(
          "Failed to initialize Logto client",
          error,
          LOGTO_CLIENT_TOKEN
        );
        throw error;
      }
    },
    inject: [ConfigService, Logger],
  },
  {
    provide: LOGTO_CREDENTIALS,
    useFactory: (
      configService: ConfigService<EnvironmentVariables, true>,
      logger: Logger
    ): LogtoClientCredentials => {
      const clientId = configService.get<LogtoConfig>("LOGTO").LOGTO_CLIENT_ID;
      const clientSecret = configService.get<LogtoConfig>("LOGTO").LOGTO_SECRET;
      const baseUrl = configService.get<LogtoConfig>("LOGTO").LOGTO_BASE_URL;

      try {
        const { clientCredentials } = createManagementApi(LOGTO_TENANT_ID, {
          clientId: clientId,
          clientSecret: clientSecret,
          baseUrl: baseUrl,
          apiIndicator: LOGTO_API_INDICATOR,
        });
        logger.log("Logto client initialized successfully", LOGTO_CLIENT_TOKEN);
        return clientCredentials as LogtoClientCredentials;
      } catch (error) {
        logger.error(
          "Failed to initialize Logto client",
          error,
          LOGTO_CLIENT_TOKEN
        );
        throw error;
      }
    },
    inject: [ConfigService, Logger],
  },
  {
    provide: LOGTO_URIS_TOKEN,
    useFactory: async (
      configService: ConfigService<EnvironmentVariables, true>,
      logger: Logger
    ): Promise<JwksUris> => {
      const baseUrl = configService.get<LogtoConfig>("LOGTO").LOGTO_BASE_URL;
      try {
        const response = await fetch(
          `${baseUrl}/oidc/.well-known/openid-configuration`
        );
        const openIdResult: OpenIdConfig =
          (await response.json()) as OpenIdConfig;
        const uris = {
          jwksUri: openIdResult.jwks_uri,
          issuerUri: openIdResult.issuer,
        };
        logger.log("Logto URIs initialized successfully", LOGTO_URIS_TOKEN);
        return uris;
      } catch (error) {
        logger.error(
          "Failed to initialize Logto client",
          error,
          LOGTO_URIS_TOKEN
        );
        throw error;
      }
    },
    inject: [ConfigService, Logger],
  },
  {
    provide: LOGTO_JWKS_TOKEN,
    useFactory: (uris: JwksUris, logger: Logger) => {
      try {
        const jwks = createRemoteJWKSet(new URL(uris.jwksUri));
        logger.log("Logto JWKS initialized successfully", LOGTO_JWKS_TOKEN);
        return jwks;
      } catch (error) {
        logger.error(
          "Failed to initialize Logto JWKS",
          error,
          LOGTO_JWKS_TOKEN
        );
        throw error;
      }
    },
    inject: [LOGTO_URIS_TOKEN, Logger],
  },
];
