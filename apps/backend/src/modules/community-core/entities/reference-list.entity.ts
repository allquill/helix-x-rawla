import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReferenceListValue } from './reference-list-value.entity';

/** An admin-maintained dropdown list (ADM-01 / MDM). */
@Entity('reference_lists')
export class ReferenceList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** One of `REFERENCE_LIST_KEYS`, e.g. `gotra`. */
  @Index()
  @Column({ type: 'text', unique: true })
  key: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => ReferenceListValue, (value) => value.list)
  values: ReferenceListValue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
