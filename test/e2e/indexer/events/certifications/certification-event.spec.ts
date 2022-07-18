import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';
import {
  Certification,
  createCertification,
  deleteCertification,
  Lab,
  queryCertificationById,
  queryCertificationsByMultipleIds,
  queryLabById,
  registerLab,
  updateCertification,
} from '@debionetwork/polkadot-provider';
import { INestApplication } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiPromise } from '@polkadot/api';
import { CommonModule } from '../../../../../src/common/common.module';
import { ProcessEnvModule } from '../../../../../src/common/proxies/process-env/process-env.module';
import { IndexerModule } from '../../../../../src/indexer/indexer.module';
import { IndexerHandler } from '../../../../../src/indexer/indexer.handler';
import { CertificationsCommandHandlers } from '../../../../../src/indexer/events/certifications';
import { LabCommandHandlers } from '../../../../../src/indexer/events/labs';
import { initializeApi } from '../../../polkadot-init';
import { labDataMock } from '../../../../mock/models/labs/labs.mock';
import { certificationDataMock } from '../../../../mock/models/certifications/certification-mock';

describe('Certification Event', () => {
  let app: INestApplication;

  let api: ApiPromise;
  let pair: any;
  let lab: Lab;
  let certification: Certification;
  let elasticsearchService: ElasticsearchService;

  // global.console = {
  //   ...console,
  //   log: jest.fn(),
  //   debug: jest.fn(),
  //   info: jest.fn(),
  //   warn: jest.fn(),
  //   error: jest.fn(),
  // };

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
        ...CertificationsCommandHandlers,
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

  it('certification created', async () => {
    await registerLab(api, pair, labDataMock.info);

    await createCertification(api, pair, certificationDataMock.info);

    lab = await queryLabById(api, pair.address);

    certification = await queryCertificationById(
      api,
      lab.certifications.at(-1),
    );

    expect(lab.info).toEqual(labDataMock.info);
    expect(certification.info).toEqual(certificationDataMock.info);
    expect(certification.ownerId).toEqual(lab.accountId);

    const certificationES = await elasticsearchService.search({
      index: 'certifications',
      body: {
        query: {
          match: {
            _id: {
              query: certification.id,
            },
          },
        },
      },
    });

    expect(certificationES.body.hits.hits.length).toEqual(1);

    const certificationSource = certificationES.body.hits.hits[0]._source;

    console.log('test', certificationSource['info']);

    expect(certificationSource['info']['title']).toEqual(
      certificationDataMock.info.title,
    );
    expect(certificationSource['info']['issuer']).toEqual(
      certificationDataMock.info.issuer,
    );
    expect(certificationSource['info']['month']).toEqual(
      certificationDataMock.info.month,
    );
    expect(certificationSource['info']['year']).toEqual(
      certificationDataMock.info.year,
    );
    expect(certificationSource['info']['description']).toEqual(
      certificationDataMock.info.description,
    );
    expect(certificationSource['info']['supporting_document']).toEqual(
      certificationDataMock.info.supportingDocument,
    );
  }, 60000);

  it('certification updated', async () => {
    const TITLE_UPDATED = 'string2';
    const { info } = certificationDataMock;
    await updateCertification(api, pair, certification.id, {
      ...info,
      title: TITLE_UPDATED,
    });

    certification = await queryCertificationById(api, certification.id);

    expect(certification.info).toEqual({ ...info, title: TITLE_UPDATED });

    const certificationES = await elasticsearchService.search({
      index: 'certifications',
      body: {
        query: {
          match: {
            _id: {
              query: certification.id,
            },
          },
        },
      },
    });

    expect(certificationES.body.hits.hits.length).toEqual(1);

    const certificationSource = certificationES.body.hits.hits[0]._source;

    expect(certificationSource['info']['title']).toEqual(TITLE_UPDATED);
    expect(certificationSource['info']['issuer']).toEqual(
      certificationDataMock.info.issuer,
    );
    expect(certificationSource['info']['month']).toEqual(
      certificationDataMock.info.month,
    );
    expect(certificationSource['info']['year']).toEqual(
      certificationDataMock.info.year,
    );
    expect(certificationSource['info']['description']).toEqual(
      certificationDataMock.info.description,
    );
    expect(certificationSource['info']['supporting_document']).toEqual(
      certificationDataMock.info.supportingDocument,
    );
  }, 60000);

  it('certification deleted', async () => {
    await deleteCertification(api, pair, certification.id);

    const certificationES = await elasticsearchService.count({
      index: 'certifications',
      body: {
        query: {
          match: {
            _id: {
              query: certification.id,
            },
          },
        },
      },
    });

    expect(certificationES.body.count).toEqual(0);
  }, 60000);
});
