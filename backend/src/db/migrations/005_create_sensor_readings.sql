-- Create sensor_readings table for direct farmer readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  moisture DECIMAL(5, 2) NOT NULL, -- Soil moisture percentage
  temperature DECIMAL(5, 2) NOT NULL, -- Temperature in Celsius
  battery INTEGER NOT NULL, -- Battery percentage
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_farmer_id ON sensor_readings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings(recorded_at);
