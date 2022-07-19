import { Module } from '@nestjs/common';
import { EthereumModule } from '../../common/ethereum';
import { EscrowModule } from '../../common/escrow/escrow.module';
import { EthereumListenerHandler } from './ethereum-listener.handler';
import { TransactionLoggingModule } from '../../common';
import { ErrorLoggingModule } from '../../common/error-logging';

@Module({
  imports: [EthereumModule, EscrowModule, TransactionLoggingModule, ErrorLoggingModule],
  providers: [EthereumListenerHandler],
})
export class EthereumListenerModule {}
