import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Sensor } from "./sensor.entity";
import { Alert } from "./alert.entity";
import { SensorReading } from "./sensor-reading.entity";

@Entity("farmers")
export class Farmer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 10, unique: true })
  @Index("idx_farmers_phone")
  phone!: string; // Kenyan phone: 0712345678

  @Column({ type: "varchar", length: 255, name: "password_hash", nullable: true })
  passwordHash!: string | null;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100 })
  county!: string; // Kenyan county

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true, name: "farm_size" })
  farmSize!: number | null; // Acres

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Sensor, (sensor) => sensor.farmer)
  sensors!: Sensor[];

  @OneToMany(() => Alert, (alert) => alert.farmer)
  alerts!: Alert[];

  @OneToMany(() => SensorReading, (reading) => reading.farmer)
  sensorReadings!: SensorReading[];
}
