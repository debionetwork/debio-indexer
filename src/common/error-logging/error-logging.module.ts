import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DateTimeModule } from '../proxies/date-time/date-time.module';
import { ErrorLoggingService } from './error-logging.service';
import { ErrorLogging } from './models/error-logging.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorLogging]), DateTimeModule],
  providers: [ErrorLoggingService],
  exports: [DateTimeModule, ErrorLoggingService],
})
export class ErrorLoggingModule {}
