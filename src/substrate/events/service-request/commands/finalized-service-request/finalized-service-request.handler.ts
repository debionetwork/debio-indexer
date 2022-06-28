import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { RequestStatus } from '../../../../models/service-request/requestStatus';
import { FinalizedServiceRequestCommand } from './finalized-service-request.command';

@Injectable()
@CommandHandler(FinalizedServiceRequestCommand)
export class FinalizedServiceRequestHandler
  implements ICommandHandler<FinalizedServiceRequestCommand>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: FinalizedServiceRequestCommand) {
    await this.elasticsearchService.update({
      index: 'create-service-request',
      id: command.serviceInvoice.requestHash,
      refresh: 'wait_for',
      body: {
        script: {
          lang: 'painless',
          source: `
            ctx._source.request.lab_address = params.lab_address;
            ctx._source.request.status      = params.status;
            ctx._source.blockMetadata       = params.blockMetaData;
          `,
          params: {
            lab_address: command.serviceInvoice.sellerAddress,
            status: RequestStatus.Finalized,
            blockMetaData: command.blockMetaData,
          },
        },
      },
    });

    const { body } = await this.elasticsearchService.search({
      index: 'create-service-request',
      body: {
        query: {
          match: { _id: command.serviceInvoice.requestHash },
        },
      },
    });

    const service_request = body.hits?.hits[0]?._source || null;

    if (service_request !== null) {
      await this.elasticsearchService.update({
        index: 'country-service-request',
        id: service_request.request.country,
        refresh: 'wait_for',
        retry_on_conflict: 1,
        body: {
          script: {
            lang: 'painless',
            source: `
              for (int i = 0; i < ctx._source.service_request.length; i++) {
                if (ctx._source.service_request[i].id == params.id) {
                  ctx._source.service_request.remove(i);
                  break;
                }
              }
            `,
            params: {
              id: service_request.request.hash,
            },
          },
          upsert: {
            counter: 1,
          },
        },
      });
    }
  }
}
