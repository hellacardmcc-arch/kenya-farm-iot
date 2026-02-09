import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Sensor } from "./sensor.entity";

@Entity("readings")
export class Reading {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "sensor_id" })
  @Index("idx_readings_sensor_id")
  sensorId!: string;

  @Column({ type: "double precision" })
  value!: number;

  @Column({ type: "varchar", length: 20, default: "%" })
  unit!: string;

  @Column({ type: "timestamptz", default: () => "NOW()", name: "recorded_at" })
  @Index("idx_readings_recorded_at")
  recordedAt!: Date;

  // Relations
  @ManyToOne(() => Sensor, (sensor) => sensor.readings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sensor_id" })
  sensor!: Sensor;
}
