import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceUpdatedCommandIndexer } from './service-updated.command';

@Injectable()
@CommandHandler(ServiceUpdatedCommandIndexer)
export class ServiceUpdatedHandler
  implements ICommandHandler<ServiceUpdatedCommandIndexer>
{
  private readonly logger: Logger = new Logger(ServiceUpdatedHandler.name);
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: ServiceUpdatedCommandIndexer) {
    const { services: service } = command;

    await this.elasticsearchService.update({
      index: 'services',
      id: service.id,
      refresh: 'wait_for',
      body: {
        doc: {
          id: service.id,
          owner_id: service.ownerId,
          info: service.info,
          service_flow: service.serviceFlow,
          blockMetaData: command.blockMetaData,
        },
      },
    });

    let serviceBody = {
      id: service.id,
      owner_id: service.ownerId,
      info: service.info,
      service_flow: service.serviceFlow,
      country: '',
      city: '',
      region: '',
    };

    let serviceIndexToDelete = -1;

    const resp = await this.elasticsearchService.search({
      index: 'labs',
      body: {
        query: {
          match: { _id: service.ownerId },
        },
      },
    });
    const { _source } = resp.body.hits.hits[0];
    const { info } = _source;
    const { country, city, region } = info;

    serviceIndexToDelete = _source.services.findIndex(
      (s) => s.id == service.id,
    );

    serviceBody = {
      ...serviceBody,
      country,
      city,
      region,
    };

    await this.elasticsearchService.update({
      index: 'labs',
      id: service.ownerId,
      refresh: 'wait_for',
      body: {
        script: {
          lang: 'painless',
          source: `if (ctx._source.services_ids.contains(params.id)) { 
            ctx._source.services[params.index] = params.service; 
          }`,
          params: {
            id: service.id,
            index: serviceIndexToDelete,
            service: serviceBody,
          },
        },
      },
    });
  }
}
