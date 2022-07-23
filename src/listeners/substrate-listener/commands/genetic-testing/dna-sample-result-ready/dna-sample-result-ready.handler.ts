import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DnaSampleResultReadyCommand } from './dna-sample-result-ready.command';
import { NotificationDto } from '../../../../../common/notification/dto/notification.dto';
import { DateTimeProxy, NotificationService } from '../../../../../common';
import { Injectable } from '@nestjs/common';
import { eventTypes } from '@debionetwork/polkadot-provider';

@Injectable()
@CommandHandler(DnaSampleResultReadyCommand)
export class DnaSampleResultReadyCommandHandler
  implements ICommandHandler<DnaSampleResultReadyCommand>
{
  constructor(
    private readonly notificationService: NotificationService,
    private readonly dateTimeProxy: DateTimeProxy,
  ) {}

  async execute(command: DnaSampleResultReadyCommand) {
    const dnaSample = command.dnaSample;
    const blockNumber = command.blockMetaData.blockNumber.toString();

    const currDateTime = this.dateTimeProxy.new();

    const valueMessage =
      eventTypes.role.customer.orders.OrderFulfilled.value_message;

    const testResultNotification: NotificationDto = {
      role: 'Customer',
      entity_type: 'Genetic Testing Tracking',
      entity: 'Order Fulfilled',
      description: `${valueMessage}${dnaSample.trackingId} are out. Click here to see your order details.`,
      read: false,
      created_at: currDateTime,
      updated_at: currDateTime,
      deleted_at: null,
      from: 'Debio Network',
      to: dnaSample.ownerId,
      block_number: blockNumber,
    };

    await this.notificationService.insert(testResultNotification);
  }
}
