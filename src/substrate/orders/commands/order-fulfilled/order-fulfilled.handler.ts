import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OrderFulfilledCommand } from './order-fulfilled.command';

@Injectable()
@CommandHandler(OrderFulfilledCommand)
export class OrderFulfilledHandler
  implements ICommandHandler<OrderFulfilledCommand>
{
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: OrderFulfilledCommand) {
    const { orders: order } = command;
    
    return this.elasticsearchService.update({
      index: 'orders',
      refresh: 'wait_for',
      id: order.id,
      body: {
        doc: {
          id: order.id,
          service_id: order.service_id,
          customer_id: order.customer_id,
          customer_box_public_key: order.customer_box_public_key,
          seller_id: order.seller_id,
          dna_sample_tracking_id: order.dna_sample_tracking_id,
          currency: order.currency,
          prices: order.prices,
          additional_prices: order.additional_prices,
          status: order.status,
          created_at: order.created_at,
          updated_at: order.updated_at
        }
      },
    }).catch((error) => {
      throw(error)
    });
  }
}