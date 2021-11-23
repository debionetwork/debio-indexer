import { ICommandHandler } from "@nestjs/cqrs";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { RequestStatus } from "../../models/requestStatus";
import { UnstakedWaitingServiceRequestCommand } from "./unstakedwaiting-service-request.command";

export class UnstakedWaitingServiceRequestHandler implements ICommandHandler<UnstakedWaitingServiceRequestCommand> {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async execute(command: UnstakedWaitingServiceRequestCommand) {
    await this.elasticsearchService.update({
      index: 'create-service-request',
      id: command.request.hash,
      refresh: 'wait_for',
      body: {
        doc: {
          request: {
            request_status: RequestStatus.WaitingForUnstaked,
            updated_at: command.request.updated_at,
            unstaked_at: command.request.unstaked_at,
          }
        }
      }
    })
  }
}