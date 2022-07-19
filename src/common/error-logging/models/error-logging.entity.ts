import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'error_logging' })
export class ErrorLogging {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tx_hash: string;

  @Column()
  block_number: string;

  @Column()
  description: string;

  @Column()
  resolve: boolean;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @Column()
  from: string;

  @Column()
  to: string;
}
