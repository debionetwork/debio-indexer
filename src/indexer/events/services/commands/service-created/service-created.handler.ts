import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceCreatedCommandIndexer } from './service-created.command';

@Injectable()
@CommandHandler(ServiceCreatedCommandIndexer)
export class ServiceCreatedHandler
  implements ICommandHandler<ServiceCreatedCommandIndexer>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: ServiceCreatedCommandIndexer) {
    const { services: service } = command;

    const ownerId = service.ownerId.toString();

    const resp = await this.elasticsearchService.search({
      index: 'labs',
      body: {
        query: {
          match: { _id: ownerId },
        },
      },
    });

    let serviceBody = {
      id: service.id,
      owner_id: service.ownerId,
      info: service.info,
      country: '',
      city: '',
      region: '',
      blockMetaData: command.blockMetaData,
      service_flow: command.services.serviceFlow,
    };

    try {
      const { _source } = resp.body.hits.hits[0];
      const { info } = _source;
      const { country, city, region } = info;
      serviceBody = {
        ...serviceBody,
        country,
        city,
        region,
      };

      await this.elasticsearchService.index({
        index: 'services',
        id: service.id,
        refresh: 'wait_for',
        op_type: 'create',
        body: {
          ...serviceBody,
        },
      });

      await this.elasticsearchService.update({
        index: 'labs',
        id: ownerId,
        refresh: 'wait_for',
        body: {
          script: {
            lang: 'painless',
            source: `
              if(!ctx._source.services_ids.contains(params.id)) { 
                ctx._source.services.add(params.service);
                ctx._source.services_ids.add(params.id);
              }`,
            params: {
              id: service.id,
              service: serviceBody,
            },
          },
        },
      });
    } catch (err) {
      console.log("[this.elasticsearchService.update({index: 'labs', })]", err);
    }
  }
}
