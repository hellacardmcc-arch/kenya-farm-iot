import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Farmer } from "./farmer.entity";
import { Sensor } from "./sensor.entity";

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "farmer_id" })
  @Index("idx_alerts_farmer_id")
  farmerId!: string;

  @Column({ type: "uuid", nullable: true, name: "sensor_id" })
  sensorId!: string | null;

  @Column({ type: "varchar", length: 50 })
  type!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", length: 20, default: "info" })
  severity!: string;

  @Column({ type: "boolean", default: false, name: "sms_sent" })
  smsSent!: boolean;

  @Column({ type: "timestamptz", nullable: true, name: "read_at" })
  readAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Farmer, (farmer) => farmer.alerts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "farmer_id" })
  farmer!: Farmer;

  @ManyToOne(() => Sensor, (sensor) => sensor.alerts, {
    onDelete: "SET NULL",
    nullable: true,
  })
  @JoinColumn({ name: "sensor_id" })
  sensor!: Sensor | null;
}
