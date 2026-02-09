import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Farmer } from "./farmer.entity";

@Entity("sensor_readings")
export class SensorReading {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Farmer, (farmer) => farmer.id)
  @JoinColumn({ name: "farmer_id" })
  farmer!: Farmer;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  moisture!: number; // Soil moisture percentage

  @Column({ type: "decimal", precision: 5, scale: 2 })
  temperature!: number; // Temperature in Celsius

  @Column()
  battery!: number; // Battery percentage

  @CreateDateColumn()
  recordedAt!: Date;
}
