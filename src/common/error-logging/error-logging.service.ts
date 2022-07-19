import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DateTimeProxy } from '../proxies/date-time/date-time.proxy';
import { Repository } from 'typeorm';
import { ErrorLoggingDto } from './dto/error-logging.dto';
import { ErrorLogging } from './models/error-logging.entity';

@Injectable()
export class ErrorLoggingService {
  constructor(
    @InjectRepository(ErrorLogging)
    private readonly errorLoggingRepository: Repository<ErrorLogging>,
    private readonly dateTimeProxy: DateTimeProxy,
  ) {}

  getAllByToId(to: string) {
    return this.errorLoggingRepository.find({
      where: {
        to,
        resolve: false,
      },
      order: {
        updated_at: 'DESC',
      },
    });
  }

  insert(data: ErrorLoggingDto) {
    const errorLogging = new ErrorLogging();
    errorLogging.tx_hash = data.tx_hash;
    errorLogging.block_number = data.block_number;
    errorLogging.description = data.description;
    errorLogging.resolve = false;
    errorLogging.created_at = data.created_at;
    errorLogging.updated_at = data.updated_at;
    errorLogging.from = data.from;
    errorLogging.to = data.to;

    return this.errorLoggingRepository.save(errorLogging);
  }

  async setErrorLoggingHasBeenResolveById(id) {
    return await this.errorLoggingRepository.update(
      { id },
      {
        updated_at: await this.dateTimeProxy.new(),
        resolve: true,
      },
    );
  }

  async setBulkErrorLoggingHasBeenResolve(to) {
    return await this.errorLoggingRepository.update(
      { to },
      {
        updated_at: await this.dateTimeProxy.new(),
        resolve: true,
      },
    );
  }
}
