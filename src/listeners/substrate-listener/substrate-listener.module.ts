import { Module } from '@nestjs/common';
import { EscrowModule } from '../../common/escrow/escrow.module';
import {
  DateTimeModule,
  DebioConversionModule,
  MailModule,
  NotificationModule,
  ProcessEnvModule,
  SubstrateModule,
  TransactionLoggingModule,
} from '../../common';
import { GeneticTestingCommandHandlers } from './commands/genetic-testing';
import { ServiceRequestCommandHandlers } from './commands/service-request';
import { GeneticAnalystCommandHandlers } from './commands/genetic-analysts';
import { GeneticAnalysisOrderCommandHandlers } from './commands/genetic-analysis-order';
import { GeneticAnalysisCommandHandlers } from './commands/genetic-analysis';
import { ServiceCommandHandlers } from './commands/services';
import { SubstrateListenerHandler } from './substrate-listener.handler';
import { OrderCommandHandlers } from './commands/orders';
import { CqrsModule } from '@nestjs/cqrs';
import { LocationModule } from '../../common/location/location.module';
import { LabCommandHandlers } from './commands/labs';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { BlockCommandHandlers, BlockQueryHandlers } from './blocks';
import { GeneticAnalystServiceCommandHandler } from './commands/genetic-analyst-services';
import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';

@Module({
  imports: [
    ProcessEnvModule,
    EscrowModule,
    LocationModule,
    TransactionLoggingModule,
    SubstrateModule,
    DebioConversionModule,
    MailModule,
    CqrsModule,
    DateTimeModule,
    NotificationModule,
    ElasticsearchModule.registerAsync({
      imports: [GCloudSecretManagerModule.withConfig(process.env.PARENT)],
      inject: [GCloudSecretManagerService],
      useFactory: async (
        gCloudSecretManagerService: GCloudSecretManagerService,
      ) => {
        return {
          node: gCloudSecretManagerService
            .getSecret('ELASTICSEARCH_NODE')
            .toString(),
          auth: {
            username: gCloudSecretManagerService
              .getSecret('ELASTICSEARCH_USERNAME')
              .toString(),
            password: gCloudSecretManagerService
              .getSecret('ELASTICSEARCH_PASSWORD')
              .toString(),
          },
        };
      },
    }),
  ],
  providers: [
    SubstrateListenerHandler,
    ...ServiceCommandHandlers,
    ...GeneticTestingCommandHandlers,
    ...ServiceRequestCommandHandlers,
    ...OrderCommandHandlers,
    ...GeneticAnalysisOrderCommandHandlers,
    ...GeneticAnalysisCommandHandlers,
    ...GeneticAnalystCommandHandlers,
    ...LabCommandHandlers,
    ...BlockCommandHandlers,
    ...BlockQueryHandlers,
    ...GeneticAnalystServiceCommandHandler,
  ],
})
export class SubstrateListenerModule {}
