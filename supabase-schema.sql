-- QMS Professional Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  industry TEXT DEFAULT 'AUTOMOTIVE',
  status TEXT DEFAULT 'ACTIVE',
  version TEXT DEFAULT '1.0',
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Process flows table
CREATE TABLE process_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER,
  input TEXT,
  output TEXT,
  resources TEXT,
  controls TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process steps table
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER,
  process_type TEXT,
  input TEXT,
  output TEXT,
  resources TEXT,
  controls TEXT,
  process_flow_id UUID REFERENCES process_flows(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FMEAs table
CREATE TABLE fmeas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  fmea_type TEXT DEFAULT 'PROCESS',
  status TEXT DEFAULT 'DRAFT',
  version TEXT DEFAULT '1.0',
  approval_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  process_flow_id UUID REFERENCES process_flows(id),
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failure modes table
CREATE TABLE failure_modes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  potential_failure TEXT,
  potential_effects TEXT,
  severity INTEGER DEFAULT 1,
  potential_causes TEXT,
  occurrence INTEGER DEFAULT 1,
  current_controls TEXT,
  detection INTEGER DEFAULT 1,
  rpn INTEGER DEFAULT 1,
  recommended_actions TEXT,
  responsibility TEXT,
  target_date TIMESTAMPTZ,
  actions_taken TEXT,
  revised_severity INTEGER,
  revised_occurrence INTEGER,
  revised_detection INTEGER,
  revised_rpn INTEGER,
  fmea_id UUID REFERENCES fmeas(id) ON DELETE CASCADE,
  process_id UUID REFERENCES processes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Control plans table
CREATE TABLE control_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  process_step TEXT,
  control_method TEXT,
  specification TEXT,
  measurement_technique TEXT,
  sample_size TEXT,
  frequency TEXT,
  control_method_type TEXT DEFAULT 'PREVENTION',
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  fmea_id UUID REFERENCES fmeas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo data
INSERT INTO users (name, email, password, role) VALUES 
('Demo User', 'demo@qms-professional.com', '$2a$10$rQsqP0k/0GGV8p0QjXqQD.xzVh6L8vhWs4d4L4pOy4Xr5y6z7A8B2', 'ADMIN');

INSERT INTO projects (name, description, department, created_by_id) VALUES 
('Automotive Engine Project', 'Main engine assembly project for testing QMS features', 'Quality Engineering', (SELECT id FROM users WHERE email = 'demo@qms-professional.com'));

INSERT INTO process_flows (name, description, project_id) VALUES 
('Engine Assembly Process', 'Main engine assembly line process flow', (SELECT id FROM projects WHERE name = 'Automotive Engine Project')),
('Quality Control Process', 'Quality inspection and testing process', (SELECT id FROM projects WHERE name = 'Automotive Engine Project'));

INSERT INTO fmeas (name, description, project_id, created_by_id) VALUES 
('Engine Assembly FMEA', 'FMEA for engine assembly process', (SELECT id FROM projects WHERE name = 'Automotive Engine Project'), (SELECT id FROM users WHERE email = 'demo@qms-professional.com'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_flows_updated_at BEFORE UPDATE ON process_flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fmeas_updated_at BEFORE UPDATE ON fmeas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_failure_modes_updated_at BEFORE UPDATE ON failure_modes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_control_plans_updated_at BEFORE UPDATE ON control_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();