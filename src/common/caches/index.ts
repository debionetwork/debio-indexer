import { CacheModule, Module } from '@nestjs/common';
import { CachesService } from './caches.service';
import * as redisStore from 'cache-manager-redis-store';
import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';

require('dotenv').config(); // eslint-disable-line

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [GCloudSecretManagerModule.withConfig(process.env.PARENT)],
      inject: [GCloudSecretManagerService],
      useFactory: async (
        gCloudSecretManagerService: GCloudSecretManagerService,
      ) => {
        return {
          store: redisStore,
          host: gCloudSecretManagerService.getSecret('REDIS_HOST').toString(),
          port: gCloudSecretManagerService.getSecret('REDIS_PORT'),
          auth_pass: gCloudSecretManagerService
            .getSecret('REDIS_PASSWORD')
            .toString(),
        };
      },
    }),
  ],
  providers: [CachesService],
  exports: [CachesService],
})
export class CachesModule {}

export * from './caches.service';
