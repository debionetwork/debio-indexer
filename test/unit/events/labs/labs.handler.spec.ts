import { Test, TestingModule } from '@nestjs/testing';
import {
  LabCommandHandlers,
  LabDeregisteredCommand,
  LabRegisteredCommand,
  LabRetrieveUnstakeAmountCommand,
  LabStakeSuccessfulCommand,
  LabUnstakeSuccessfulCommand,
  LabUpdatedCommand,
  LabUpdateVerificationStatusCommand,
} from '../../../../src/substrate/events/labs';
import { LabDeregisteredHandler } from '../../../../src/substrate/events/labs/commands/lab-deregistered/lab-deregistered.handler';
import { LabRegisteredHandler } from '../../../../src/substrate/events/labs/commands/lab-registered/lab-registered.handler';
import { LabUpdatedHandler } from '../../../../src/substrate/events/labs/commands/lab-updated/lab-updated.handler';
import { LabUpdateVerificationStatusHandler } from '../../../../src/substrate/events/labs/commands/lab-update-verification-status/lab-update-verification-status.handler';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { BlockMetaData } from '../../../../src/substrate/models/blockMetaData';
import { ElasticSearchServiceProvider } from '../../mock';
import { StakeStatus } from '../../../../src/substrate/models/stake-status';
import { LabRetrieveUnstakeAmountHandler } from '../../../../src/substrate/events/labs/commands/lab-retrieve-unstake-amount/lab-retrieve-unstake-amount.handler';
import { LabStakeSuccessfulHandler } from '../../../../src/substrate/events/labs/commands/lab-stake-successful/lab-stake-successful.handler';
import { LabUnstakeSuccessfulHandler } from '../../../../src/substrate/events/labs/commands/lab-unstake-successful/lab-unstake-successful.handler';

let labDeregisteredHandler: LabDeregisteredHandler;
let labRegisteredHandler: LabRegisteredHandler;
let labUpdatedHandler: LabUpdatedHandler;
let labUpdateVerificationStatusHandler: LabUpdateVerificationStatusHandler;
let labRetrieveUnstakeAmountHandler: LabRetrieveUnstakeAmountHandler;
let labStakeSuccessfulHandler: LabStakeSuccessfulHandler;
let labUnstakeSuccessfulHandler: LabUnstakeSuccessfulHandler;

let elasticsearchService: ElasticsearchService;
describe('Labs Substrate Event Handler', () => {
  const createMockLab = () => {
    const labInfo = {
      boxPublicKey: 'string',
      name: 'string',
      email: 'string',
      phoneNumber: 'string',
      website: 'string',
      country: 'XX',
      region: 'XX',
      city: 'XX',
      address: 'string',
      latitude: 'string',
      longitude: 'string',
      profileImage: 'string',
    };

    return {
      toHuman: jest.fn(() => ({
        accountId: 'string',
        services: [1],
        certifications: [1],
        verificationStatus: [1],
        info: labInfo,
        stakeAmount: '1000000',
        stakeStatus: StakeStatus.Staked,
        unstakeAt: '100000000',
        retrieveUnstakeAt: '100000000',
      })),
    };
  };

  function mockBlockNumber(): BlockMetaData {
    return {
      blockHash: '',
      blockNumber: 1,
    };
  }

  beforeAll(async () => {
    const modules: TestingModule = await Test.createTestingModule({
      providers: [ElasticSearchServiceProvider, ...LabCommandHandlers],
    }).compile();

    labDeregisteredHandler = modules.get<LabDeregisteredHandler>(
      LabDeregisteredHandler,
    );
    labRegisteredHandler =
      modules.get<LabRegisteredHandler>(LabRegisteredHandler);
    labUpdatedHandler = modules.get<LabUpdatedHandler>(LabUpdatedHandler);
    labUpdateVerificationStatusHandler =
      modules.get<LabUpdateVerificationStatusHandler>(
        LabUpdateVerificationStatusHandler,
      );

    elasticsearchService =
      modules.get<ElasticsearchService>(ElasticsearchService);

    await modules.init();
  });

  describe('Lab Handler', () => {
    it('Lab Deregistered Handler', async () => {
      const lab = createMockLab();

      const labDeregisteredCommand: LabDeregisteredCommand =
        new LabDeregisteredCommand([lab], mockBlockNumber());
      await labDeregisteredHandler.execute(labDeregisteredCommand);
      expect(elasticsearchService.delete).toHaveBeenCalled();
    });

    it('Lab Deregistered Handler', async () => {
      const lab = createMockLab();

      const labDeregisteredCommand: LabDeregisteredCommand =
        new LabDeregisteredCommand([lab], mockBlockNumber());
      await labDeregisteredHandler.execute(labDeregisteredCommand);
      expect(elasticsearchService.delete).toHaveBeenCalled();
      expect(elasticsearchService.deleteByQuery).toHaveBeenCalled();
    });

    it('Lab Registered Handler', async () => {
      const lab = createMockLab();

      const labRegisteredCommand: LabDeregisteredCommand =
        new LabRegisteredCommand([lab], mockBlockNumber());
      await labRegisteredHandler.execute(labRegisteredCommand);
      expect(elasticsearchService.index).toHaveBeenCalled();
    });

    it('Lab Updated Handler', async () => {
      const lab = createMockLab();

      const labUpdatedCommand: LabUpdatedCommand = new LabUpdatedCommand(
        [lab],
        mockBlockNumber(),
      );
      await labUpdatedHandler.execute(labUpdatedCommand);
      expect(elasticsearchService.update).toHaveBeenCalled();
    });

    it('Lab Updated Verification Status Handler', async () => {
      const lab = createMockLab();

      const labUpdatedVerificationStatusCommand: LabUpdateVerificationStatusCommand =
        new LabUpdateVerificationStatusCommand([lab], mockBlockNumber());
      await labUpdateVerificationStatusHandler.execute(
        labUpdatedVerificationStatusCommand,
      );
      expect(elasticsearchService.update).toHaveBeenCalled();
    });

    it('Lab Retrieve Unstake Amount Handler', async () => {
      const lab = createMockLab();

      const labRetrieveUnstakeAmountCommand: LabRetrieveUnstakeAmountCommand =
        new LabRetrieveUnstakeAmountCommand([lab], mockBlockNumber());
      await labRetrieveUnstakeAmountHandler.execute(
        labRetrieveUnstakeAmountCommand,
      );
      expect(elasticsearchService.update).toHaveBeenCalled();
    });

    it('Lab Stake Successful Handler', async () => {
      const lab = createMockLab();

      const labStakeSuccessfulCommand: LabStakeSuccessfulCommand =
        new LabStakeSuccessfulCommand([lab], mockBlockNumber());
      await labStakeSuccessfulHandler.execute(
        labStakeSuccessfulCommand,
      );
      expect(elasticsearchService.update).toHaveBeenCalled();
    });

    it('Lab Unstake Successful Handler', async () => {
      const lab = createMockLab();

      const labUnstakeSuccessfulCommand: LabUnstakeSuccessfulCommand =
        new LabUnstakeSuccessfulCommand([lab], mockBlockNumber());
      await labUnstakeSuccessfulHandler.execute(
        labUnstakeSuccessfulCommand,
      );
      expect(elasticsearchService.update).toHaveBeenCalled();
    });
  });
});
