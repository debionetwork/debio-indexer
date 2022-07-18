import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';
import {
  createService,
  deleteService,
  Lab,
  queryLabById,
  queryServiceById,
  registerLab,
  Service,
  updateService,
} from '@debionetwork/polkadot-provider';
import { INestApplication } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiPromise } from '@polkadot/api';
import { initializeApi } from '../../../e2e/polkadot-init';
import { CommonModule, ProcessEnvModule } from '../../../../src/common';
import { LabCommandHandlers } from '../../../../src/indexer/events/labs';
import { ServiceCommandHandlers } from '../../../../src/indexer/events/services';
import { IndexerHandler } from '../../../../src/indexer/indexer.handler';
import { IndexerModule } from '../../../../src/indexer/indexer.module';
import { labDataMock } from 'test/mock/models/labs/labs.mock';
import { serviceDataMock } from 'test/mock/models/labs/services.mock';

describe('Service Event', () => {
  let app: INestApplication;

  let api: ApiPromise;
  let pair: any;
  let lab: Lab;
  let service: Service;
  let elasticsearchService: ElasticsearchService;

  class GoogleSecretManagerServiceMock {
    _secretsList = new Map<string, string>([
      ['ELASTICSEARCH_NODE', process.env.ELASTICSEARCH_NODE],
      ['ELASTICSEARCH_USERNAME', process.env.ELASTICSEARCH_USERNAME],
      ['ELASTICSEARCH_PASSWORD', process.env.ELASTICSEARCH_PASSWORD],
      ['SUBSTRATE_URL', process.env.SUBSTRATE_URL],
      ['ADMIN_SUBSTRATE_MNEMONIC', process.env.ADMIN_SUBSTRATE_MNEMONIC],
      ['EMAIL', process.env.EMAIL],
      ['PASS_EMAIL', process.env.PASS_EMAIL],
    ]);

    loadSecrets() {
      return null;
    }

    getSecret(key) {
      return this._secretsList.get(key);
    }
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        GCloudSecretManagerModule.withConfig(process.env.PARENT),
        CommonModule,
        ProcessEnvModule,
        CqrsModule,
        ScheduleModule.forRoot(),
        IndexerModule,
      ],
      providers: [
        IndexerHandler,
        ...LabCommandHandlers,
        ...ServiceCommandHandlers,
      ],
    })
      .overrideProvider(GCloudSecretManagerService)
      .useClass(GoogleSecretManagerServiceMock)
      .compile();

    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    app = module.createNestApplication();
    await app.init();

    const { api: _api, pair: _pair } = await initializeApi();
    api = _api;
    pair = _pair;
  }, 450000);

  afterAll(async () => {
    await api.disconnect();
    await elasticsearchService.close();
    await app.close();
  }, 12000);

  it('service created event', async () => {
    const { info: labInfo } = labDataMock;
    const { info: serviceInfo, serviceFlow } = serviceDataMock;

    await registerLab(api, pair, labInfo);
    await createService(api, pair, serviceInfo, serviceFlow);

    lab = await queryLabById(api, pair.address);
    service = await queryServiceById(api, lab.services.at(-1));

    expect(lab.info).toEqual(labInfo);
    expect(service.info).toEqual(serviceInfo);
    expect(service.serviceFlow).toEqual(serviceFlow);

    const serviceES = await elasticsearchService.search({
      index: 'services',
      body: {
        query: {
          match: {
            _id: {
              query: service.id,
            },
          },
        },
      },
    });

    expect(serviceES.body.hits.hits.length).toEqual(1);

    const serviceSource = serviceES.body.hits.hits[0]._source;
    expect(serviceSource['info']['name']).toEqual(serviceInfo.name);
    expect(serviceSource['info']['expected_duration']).toEqual(
      serviceInfo.expectedDuration,
    );
    expect(serviceSource['info']['category']).toEqual(serviceInfo.category);
    expect(serviceSource['info']['description']).toEqual(
      serviceInfo.description,
    );
    expect(serviceSource['info']['dna_collection_process']).toEqual(
      serviceInfo.dnaCollectionProcess,
    );
    expect(serviceSource['info']['test_result_sample']).toEqual(
      serviceInfo.testResultSample,
    );
    expect(serviceSource['info']['long_description']).toEqual(
      serviceInfo.longDescription,
    );
    expect(serviceSource['info']['image']).toEqual(serviceInfo.image);
  });

  it('service updated event', async () => {
    const NAME_UPDATED = 'string2';
    const { info: serviceInfo, serviceFlow } = serviceDataMock;

    await updateService(api, pair, service.id, {
      ...serviceInfo,
      name: NAME_UPDATED,
    });

    service = await queryServiceById(api, service.id);

    expect(service.info).toEqual({ ...serviceInfo, name: NAME_UPDATED });
    expect(service.serviceFlow).toEqual(serviceFlow);

    const serviceES = await elasticsearchService.search({
      index: 'services',
      body: {
        query: {
          match: {
            _id: {
              query: service.id,
            },
          },
        },
      },
    });

    expect(serviceES.body.hits.hits.length).toEqual(1);

    const serviceSource = serviceES.body.hits.hits[0]._source;
    expect(serviceSource['info']['name']).toEqual(NAME_UPDATED);
    expect(serviceSource['info']['expected_duration']).toEqual(
      serviceInfo.expectedDuration,
    );
    expect(serviceSource['info']['category']).toEqual(serviceInfo.category);
    expect(serviceSource['info']['description']).toEqual(
      serviceInfo.description,
    );
    expect(serviceSource['info']['dna_collection_process']).toEqual(
      serviceInfo.dnaCollectionProcess,
    );
    expect(serviceSource['info']['test_result_sample']).toEqual(
      serviceInfo.testResultSample,
    );
    expect(serviceSource['info']['long_description']).toEqual(
      serviceInfo.longDescription,
    );
    expect(serviceSource['info']['image']).toEqual(serviceInfo.image);
  });

  it('service deleted event', async () => {
    await deleteService(api, pair, service.id);

    const serviceES = await elasticsearchService.count({
      index: 'services',
      body: {
        query: {
          match: {
            _id: {
              query: service.id,
            },
          },
        },
      },
    });

    expect(serviceES.body.count).toEqual(0);
  });
});