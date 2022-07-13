import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceRequestClaimedCommand } from './service-request-claimed.command';
import { DateTimeProxy, NotificationService } from '../../../../../common';
import { NotificationDto } from '../../../../../common/notification/dto/notification.dto';

@Injectable()
@CommandHandler(ServiceRequestClaimedCommand)
export class ServiceRequestClaimedCommandHandler
  implements ICommandHandler<ServiceRequestClaimedCommand>
{
  constructor(
    private readonly notificationService: NotificationService,
    private readonly dateTimeProxy: DateTimeProxy,
  ) {}

  async execute(command: ServiceRequestClaimedCommand) {
    const requestData = command.request.normalize();
    const blockNumber = command.blockMetadata.blockNumber.toString();

    const currDateTime = this.dateTimeProxy.new();

    const serviceAvailableNotificationInput: NotificationDto = {
      role: 'Customer',
      entity_type: 'Request Service Staking',
      entity: 'Requested Service Available',
      description: `Congrats! Your requested service is available now. Click here to see your order details.`,
      read: false,
      created_at: currDateTime,
      updated_at: currDateTime,
      deleted_at: null,
      from: 'Debio Network',
      to: requestData.requesterAddress,
      block_number: blockNumber,
    };

    await this.notificationService.insert(serviceAvailableNotificationInput);
  }
}