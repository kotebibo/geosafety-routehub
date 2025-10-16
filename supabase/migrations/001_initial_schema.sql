-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Companies/Locations Table
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  type VARCHAR(50) CHECK (type IN ('commercial', 'residential', 'industrial', 'healthcare', 'education')),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  notes TEXT,
  inspection_frequency INTEGER DEFAULT 90, -- days between inspections
  last_inspection_date DATE,
  next_inspection_date DATE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Inspectors/Users Table  
CREATE TABLE inspectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'inspector' CHECK (role IN ('admin', 'dispatcher', 'inspector', 'manager')),
  certifications JSONB,
  vehicle_id VARCHAR(100),
  working_hours JSONB DEFAULT '{"start": "08:00", "end": "17:00"}',
  zone VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  current_location GEOGRAPHY(Point, 4326),
  last_location_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Routes Table
CREATE TABLE routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255),
  date DATE NOT NULL,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  start_time TIME,
  end_time TIME,
  total_distance_km DECIMAL(10, 2),
  total_duration_minutes INTEGER,
  optimization_type VARCHAR(50) DEFAULT 'distance' CHECK (optimization_type IN ('distance', 'time', 'balanced')),
  route_geometry JSONB, -- Store the actual route path
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Route Stops (Inspections) Table
CREATE TABLE route_stops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- Order in the route (1, 2, 3...)
  scheduled_arrival_time TIME,
  actual_arrival_time TIME,
  scheduled_departure_time TIME,
  actual_departure_time TIME,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  notes TEXT,
  photos JSONB, -- Array of photo URLs
  signature_url TEXT,
  distance_from_previous_km DECIMAL(10, 2),
  duration_from_previous_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(route_id, position)
);

-- Inspections History Table
CREATE TABLE inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  route_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL,
  inspection_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'failed')),
  findings TEXT,
  recommendations TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_companies_location ON companies USING GIST(location);
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_next_inspection ON companies(next_inspection_date);

CREATE INDEX idx_routes_date ON routes(date);
CREATE INDEX idx_routes_inspector ON routes(inspector_id);
CREATE INDEX idx_routes_status ON routes(status);

CREATE INDEX idx_route_stops_route ON route_stops(route_id);
CREATE INDEX idx_route_stops_company ON route_stops(company_id);
CREATE INDEX idx_route_stops_status ON route_stops(status);

CREATE INDEX idx_inspections_company ON inspections(company_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_inspections_date ON inspections(inspection_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspectors_updated_at BEFORE UPDATE ON inspectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_stops_updated_at BEFORE UPDATE ON route_stops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();