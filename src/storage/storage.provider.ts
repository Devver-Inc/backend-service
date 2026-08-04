import {
  BucketLocationConstraint,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnvironmentVariables,
  StorageConfig,
} from 'src/_utils/config/env.config';
import { STORAGE_CLIENT_TOKEN } from 'src/_utils/constants';

export const storageProviders: Provider[] = [
  {
    provide: STORAGE_CLIENT_TOKEN,
    useFactory: async (
      configService: ConfigService<EnvironmentVariables, true>,
    ): Promise<S3Client> => {
      const logger = new Logger(STORAGE_CLIENT_TOKEN);
      const config = configService.get<StorageConfig>('STORAGE');
      const client = new S3Client({
        region: config.STORAGE_REGION,
        endpoint: config.STORAGE_ENDPOINT,
        forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
        ...(config.STORAGE_ACCESS_KEY && config.STORAGE_SECRET_KEY
          ? {
              credentials: {
                accessKeyId: config.STORAGE_ACCESS_KEY,
                secretAccessKey: config.STORAGE_SECRET_KEY,
              },
            }
          : {}),
      });

      try {
        await client.send(
          new HeadBucketCommand({ Bucket: config.STORAGE_BUCKET }),
        );
      } catch (error) {
        if (
          !(error instanceof S3ServiceException) ||
          error.$metadata.httpStatusCode !== 404
        ) {
          throw error;
        }
        await client.send(
          new CreateBucketCommand({
            Bucket: config.STORAGE_BUCKET,
            ...(config.STORAGE_REGION !== 'us-east-1'
              ? {
                  CreateBucketConfiguration: {
                    LocationConstraint:
                      config.STORAGE_REGION as BucketLocationConstraint,
                  },
                }
              : {}),
          }),
        );
      }

      await client.send(
        new PutBucketPolicyCommand({
          Bucket: config.STORAGE_BUCKET,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${config.STORAGE_BUCKET}/public/*`],
              },
            ],
          }),
        }),
      );

      logger.log('Object storage initialized');
      return client;
    },
    inject: [ConfigService],
  },
];
