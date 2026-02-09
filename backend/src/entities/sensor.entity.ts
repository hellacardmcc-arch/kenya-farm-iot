import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { Farmer } from "./farmer.entity";
import { Reading } from "./reading.entity";
import { Alert } from "./alert.entity";

@Entity("sensors")
export class Sensor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "farmer_id" })
  @Index("idx_sensors_farmer_id")
  farmerId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    type: "varchar",
    length: 50,
    name: "sensor_type",
    default: "soil_moisture",
  })
  sensorType: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, name: "mqtt_topic" })
  mqttTopic: string | null;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Farmer, (farmer) => farmer.sensors, { onDelete: "CASCADE" })
  @JoinColumn({ name: "farmer_id" })
  farmer: Farmer;

  @OneToMany(() => Reading, (reading) => reading.sensor)
  readings: Reading[];

  @OneToMany(() => Alert, (alert) => alert.sensor)
  alerts: Alert[];
}
