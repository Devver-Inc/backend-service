import { forwardRef, Global, Logger, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { LOGTO_JWKS_TOKEN, LOGTO_URIS_TOKEN } from "src/_utils/constants";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LogtoExceptions } from "./_utils/errors/logto-exceptions.types";
import { LogtoMapper } from "./logto.mapper";
import { logtoProviders } from "./logto.provider";
import { LogtoRequests } from "./logto.requests";
import { LogtoService } from "./logto.service";

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "http-bearer" }),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [],
  providers: [
    LogtoService,
    ...logtoProviders,
    LogtoRequests,
    Logger,
    LogtoExceptions,
    LogtoMapper,
  ],
  exports: [LogtoService, LogtoRequests, LOGTO_URIS_TOKEN, LOGTO_JWKS_TOKEN],
})
export class LogtoModule {}
