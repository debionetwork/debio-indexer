import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CertificationCreatedCommandIndexer } from './certification-created.command';

@Injectable()
@CommandHandler(CertificationCreatedCommandIndexer)
export class CertificationCreatedHandler
  implements ICommandHandler<CertificationCreatedCommandIndexer>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: CertificationCreatedCommandIndexer) {
    const { certification } = command;

    console.log(certification);
    await this.elasticsearchService.index({
      index: 'certifications',
      refresh: 'wait_for',
      op_type: 'create',
      id: certification.id,
      body: {
        id: certification.id,
        owner_id: certification.owner_id,
        info: certification.info,
        blockMetaData: command.blockMetaData,
      },
    });

    await this.elasticsearchService.update({
      index: 'labs',
      refresh: 'wait_for',
      id: certification.owner_id,
      body: {
        script: {
          lang: 'painless',
          source:
            'if (!ctx._source.certifications_ids.contains(params.id)) { ctx._source.certifications_ids.add(params.id); ctx._source.certifications.add(params.certification); }',
          params: {
            id: certification.id,
            certification: certification,
          },
        },
      },
    });
  }
}
