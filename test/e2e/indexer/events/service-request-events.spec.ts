import { Test, TestingModule } from '@nestjs/testing';
import { IndexerHandler } from '../../../../src/indexer/indexer.handler';
import { CommonModule } from '../../../../src/common/common.module';
import { ProcessEnvModule } from '../../../../src/common/proxies/process-env/process-env.module';
import { ServiceCommandHandlers } from '../../../../src/indexer/events/services';
import { INestApplication } from '@nestjs/common';
import { initializeApi } from '../../polkadot-init';
import { ApiPromise } from '@polkadot/api';
import {
  claimRequest,
  createRequest,
  createService,
  deleteService,
  deregisterLab,
  Lab,
  queryLabById,
  queryLabCount,
  queryServiceRequestByAccountId,
  queryServiceRequestById,
  queryServicesByMultipleIds,
  registerLab,
  RequestStatus,
  Service,
  ServiceRequest,
  updateLabVerificationStatus,
} from '@debionetwork/polkadot-provider';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CqrsModule } from '@nestjs/cqrs';
import { labDataMock } from '../../../mock/models/labs/labs.mock';
import { VerificationStatus } from '@debionetwork/polkadot-provider/lib/primitives/verification-status';
import { serviceDataMock } from '../../../mock/models/labs/services.mock';
import { LabCommandHandlers } from '../../../../src/indexer/events/labs';
import { RequestServiceCommandHandlers } from '../../../../src/indexer/events/service-request';
import { ScheduleModule } from '@nestjs/schedule';
import { IndexerModule } from '../../../../src/indexer/indexer.module';
import { serviceRequestMock } from '../../../mock/models/service-request/service-request.mock';
import {
  GCloudSecretManagerModule,
  GCloudSecretManagerService,
} from '@debionetwork/nestjs-gcloud-secret-manager';

describe('Event Command Service Request Claimed', () => {
  let app: INestApplication;

  let api: ApiPromise;
  let pair: any;
  let serviceRequest: ServiceRequest;
  let lab: Lab;
  let service: Service;
  let elasticsearchService: ElasticsearchService;

  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

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
        GCloudSecretManagerModule.withConfig(process.env.GCS_PARENT),
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
        ...RequestServiceCommandHandlers,
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

  it('create service request', async () => {
    const createServicePromise: Promise<ServiceRequest> = new Promise(
      // eslint-disable-next-line
      (resolve, reject) => {
        createRequest(
          api,
          pair,
          serviceRequestMock.country,
          serviceRequestMock.region,
          serviceRequestMock.city,
          serviceRequestMock.serviceCategory,
          serviceRequestMock.stakingAmount,
          () => {
            queryServiceRequestByAccountId(api, pair.address).then((res) => {
              resolve(res.at(-1));
            });
          },
        );
      },
    );

    serviceRequest = (await createServicePromise).normalize();

    expect(serviceRequest.city).toEqual(serviceRequestMock.city);
    expect(serviceRequest.region).toEqual(serviceRequestMock.region);
    expect(serviceRequest.country).toEqual(serviceRequestMock.country);
    expect(serviceRequest.serviceCategory).toEqual(
      serviceRequestMock.serviceCategory,
    );
    expect(serviceRequest.status).toEqual(RequestStatus.Open);
    expect(serviceRequest.requesterAddress).toEqual(pair.address);

    const regionServiceRequest = await elasticsearchService.search({
      index: 'country-service-request',
      body: {
        query: {
          match: {
            _id: {
              query: serviceRequest.country,
            },
          },
        },
      },
    });

    expect(regionServiceRequest.body.hits.hits.length).toEqual(1);
    const dataRegionServiceRequest =
      regionServiceRequest.body.hits.hits[0]._source;
    expect(dataRegionServiceRequest['service_request']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: serviceRequestMock.stakingAmount.toString(),
          category: serviceRequest.serviceCategory,
          city: serviceRequest.city,
          region: serviceRequest.region,
          requester: serviceRequest.requesterAddress,
          id: serviceRequest.hash,
        }),
      ]),
    );
  }, 80000);

  it('claim service request', async () => {
    // eslint-disable-next-line
    const labPromise: Promise<Lab> = new Promise((resolve, reject) => {
      registerLab(api, pair, labDataMock.info, () => {
        updateLabVerificationStatus(
          api,
          pair,
          pair.address,
          VerificationStatus.Verified,
          () => {
            queryLabById(api, pair.address).then((res) => {
              resolve(res);
            });
          },
        );
      });
    });

    lab = await labPromise;
    expect(lab.info).toEqual(labDataMock.info);
    expect(lab.verificationStatus).toEqual(VerificationStatus.Verified);

    // eslint-disable-next-line
    const servicePromise: Promise<Service> = new Promise((resolve, reject) => {
      createService(
        api,
        pair,
        serviceDataMock.info,
        serviceDataMock.serviceFlow,
        () => {
          queryLabById(api, pair.address).then((lab) => {
            queryServicesByMultipleIds(api, lab.services).then((res) => {
              resolve(res.at(-1));
            });
          });
        },
      );
    });

    service = await servicePromise;

    const claimRequestPromise: Promise<ServiceRequest> = new Promise(
      // eslint-disable-next-line
      (resolve, reject) => {
        claimRequest(
          api,
          pair,
          serviceRequest.hash,
          service.id,
          '1',
          '1',
          () => {
            queryServiceRequestById(api, serviceRequest.hash).then((res) => {
              resolve(res);
            });
          },
        );
      },
    );

    serviceRequest = await claimRequestPromise;
    expect(serviceRequest.normalize()).toEqual(
      expect.objectContaining({
        country: serviceRequestMock.country,
        region: serviceRequestMock.region,
        city: serviceRequestMock.city,
        serviceCategory: serviceRequestMock.serviceCategory,
        status: RequestStatus.Claimed,
      }),
    );

    const createServiceRequset = await elasticsearchService.search({
      index: 'create-service-request',
      body: {
        query: {
          match: {
            _id: {
              query: serviceRequest.hash,
            },
          },
        },
      },
    });

    expect(createServiceRequset.body.hits.hits.length).toEqual(1);
    const dataCreateServiceRequest =
      createServiceRequset.body.hits.hits[0]._source;
    expect(dataCreateServiceRequest['request']['country']).toEqual(
      serviceRequestMock.country,
    );
    expect(dataCreateServiceRequest['request']['region']).toEqual(
      serviceRequestMock.region,
    );
    expect(dataCreateServiceRequest['request']['city']).toEqual(
      serviceRequestMock.city,
    );
    expect(dataCreateServiceRequest['request']['status']).toEqual(
      RequestStatus.Claimed,
    );

    // eslint-disable-next-line
    const deleteLabs: Promise<number> = new Promise((resolve, reject) => {
      deleteService(api, pair, service.id, () => {
        deregisterLab(api, pair, () => {
          queryLabCount(api).then((res) => {
            resolve(res);
          });
        });
      });
    });

    expect(await deleteLabs).toEqual(0);
  }, 120000);
});
