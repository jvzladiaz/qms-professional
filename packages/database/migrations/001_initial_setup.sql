-- Initial setup migration for QMS Automotive Process Flow
-- This creates the foundational tables for the process flow system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'QUALITY_MANAGER', 'PROCESS_ENGINEER', 'OPERATOR', 'VIEWER');
CREATE TYPE status AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE process_step_type AS ENUM ('OPERATION', 'INSPECTION', 'TRANSPORT', 'DELAY', 'STORAGE', 'DECISION', 'START', 'END');
CREATE TYPE resource_type AS ENUM ('MACHINE', 'TOOL', 'OPERATOR', 'MATERIAL', 'EQUIPMENT');
CREATE TYPE control_point_type AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'VIEWER',
    department VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Projects table (container for process flows)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_code VARCHAR(50) UNIQUE NOT NULL,
    customer VARCHAR(255),
    product_line VARCHAR(255),
    status status NOT NULL DEFAULT 'DRAFT',
    priority priority NOT NULL DEFAULT 'MEDIUM',
    start_date DATE,
    target_date DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (target_date IS NULL OR start_date IS NULL OR target_date >= start_date)
);

-- Parts table (automotive parts)
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    customer VARCHAR(255),
    revision VARCHAR(10) NOT NULL DEFAULT 'A',
    drawing_number VARCHAR(100),
    material_spec VARCHAR(255),
    weight_grams DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swimlanes table (for organizing process steps by department/role)
CREATE TABLE swimlanes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    responsible_role VARCHAR(100),
    color VARCHAR(7) DEFAULT '#E3F2FD', -- Default blue color
    position_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process flows table
CREATE TABLE process_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    status status NOT NULL DEFAULT 'DRAFT',
    priority priority NOT NULL DEFAULT 'MEDIUM',
    process_type VARCHAR(100), -- e.g., 'MANUFACTURING', 'INSPECTION', 'ASSEMBLY'
    estimated_cycle_time INTEGER, -- in seconds
    takt_time INTEGER, -- in seconds
    canvas_settings JSONB, -- Canvas zoom, pan position, etc.
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process steps table
CREATE TABLE process_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,
    swimlane_id UUID REFERENCES swimlanes(id),
    step_number INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_type process_step_type NOT NULL,
    operation_time INTEGER, -- in seconds
    setup_time INTEGER, -- in seconds
    wait_time INTEGER, -- in seconds
    transport_time INTEGER, -- in seconds
    -- Position and styling for React Flow
    position_x DECIMAL(10,2) NOT NULL DEFAULT 0,
    position_y DECIMAL(10,2) NOT NULL DEFAULT 0,
    width DECIMAL(8,2) DEFAULT 200,
    height DECIMAL(8,2) DEFAULT 100,
    background_color VARCHAR(7) DEFAULT '#FFFFFF',
    border_color VARCHAR(7) DEFAULT '#000000',
    -- Quality requirements
    quality_requirements TEXT,
    safety_requirements TEXT,
    environmental_requirements TEXT,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_step_per_flow UNIQUE(process_flow_id, step_number),
    CONSTRAINT positive_times CHECK (
        (operation_time IS NULL OR operation_time >= 0) AND
        (setup_time IS NULL OR setup_time >= 0) AND
        (wait_time IS NULL OR wait_time >= 0) AND
        (transport_time IS NULL OR transport_time >= 0)
    )
);

-- Step connections table (edges in React Flow)
CREATE TABLE step_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,
    source_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    target_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'default', -- 'default', 'conditional', 'parallel'
    condition_text TEXT, -- For decision points
    label VARCHAR(255),
    -- Visual styling
    stroke_color VARCHAR(7) DEFAULT '#000000',
    stroke_width DECIMAL(4,1) DEFAULT 2,
    stroke_style VARCHAR(20) DEFAULT 'solid', -- 'solid', 'dashed', 'dotted'
    animated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_connection CHECK (source_step_id != target_step_id),
    CONSTRAINT unique_connection UNIQUE(source_step_id, target_step_id)
);

-- Resources table (machines, tools, operators, materials)
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    resource_type resource_type NOT NULL,
    description TEXT,
    specification TEXT,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    location VARCHAR(255),
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process step resources (many-to-many relationship)
CREATE TABLE process_step_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id),
    quantity_required INTEGER NOT NULL DEFAULT 1,
    utilization_percentage DECIMAL(5,2) DEFAULT 100.00,
    setup_required BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_step_resource UNIQUE(process_step_id, resource_id),
    CONSTRAINT valid_quantity CHECK (quantity_required > 0),
    CONSTRAINT valid_utilization CHECK (utilization_percentage > 0 AND utilization_percentage <= 100)
);

-- Control points table
CREATE TABLE control_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    control_type control_point_type NOT NULL,
    specification TEXT NOT NULL,
    measurement_method TEXT,
    inspection_frequency VARCHAR(100),
    sample_size INTEGER,
    upper_spec_limit DECIMAL(15,6),
    lower_spec_limit DECIMAL(15,6),
    target_value DECIMAL(15,6),
    unit VARCHAR(20),
    responsible_role VARCHAR(100),
    reaction_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_spec_limits CHECK (
        upper_spec_limit IS NULL OR lower_spec_limit IS NULL OR upper_spec_limit >= lower_spec_limit
    ),
    CONSTRAINT valid_sample_size CHECK (sample_size IS NULL OR sample_size > 0)
);

-- Process inputs table
CREATE TABLE process_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    specification TEXT,
    source_location VARCHAR(255),
    quantity_required DECIMAL(15,6),
    unit VARCHAR(20),
    is_critical BOOLEAN DEFAULT false,
    supplier VARCHAR(255),
    part_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_quantity_input CHECK (quantity_required IS NULL OR quantity_required > 0)
);

-- Process outputs table
CREATE TABLE process_outputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    specification TEXT,
    destination_location VARCHAR(255),
    quantity_produced DECIMAL(15,6),
    unit VARCHAR(20),
    quality_characteristic VARCHAR(255),
    acceptance_criteria TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_quantity_output CHECK (quantity_produced IS NULL OR quantity_produced > 0)
);

-- Process approvals table
CREATE TABLE process_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_flow_id UUID NOT NULL REFERENCES process_flows(id) ON DELETE CASCADE,
    approver_role VARCHAR(100) NOT NULL,
    approver_user_id UUID REFERENCES users(id),
    approval_status approval_status NOT NULL DEFAULT 'PENDING',
    approved_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    approval_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_approval_per_role UNIQUE(process_flow_id, approver_role, approval_level)
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', etc.
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID NOT NULL REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table (for collaborative feedback)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES comments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_file_size CHECK (file_size > 0)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_code ON projects(project_code);

CREATE INDEX idx_parts_number ON parts(part_number);
CREATE INDEX idx_parts_customer ON parts(customer);

CREATE INDEX idx_process_flows_project ON process_flows(project_id);
CREATE INDEX idx_process_flows_part ON process_flows(part_id);
CREATE INDEX idx_process_flows_status ON process_flows(status);
CREATE INDEX idx_process_flows_created_by ON process_flows(created_by);

CREATE INDEX idx_process_steps_flow ON process_steps(process_flow_id);
CREATE INDEX idx_process_steps_swimlane ON process_steps(swimlane_id);
CREATE INDEX idx_process_steps_type ON process_steps(step_type);
CREATE INDEX idx_process_steps_number ON process_steps(step_number);

CREATE INDEX idx_step_connections_flow ON step_connections(process_flow_id);
CREATE INDEX idx_step_connections_source ON step_connections(source_step_id);
CREATE INDEX idx_step_connections_target ON step_connections(target_step_id);

CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_active ON resources(is_active);

CREATE INDEX idx_control_points_step ON control_points(process_step_id);
CREATE INDEX idx_control_points_type ON control_points(control_type);

CREATE INDEX idx_process_inputs_step ON process_inputs(process_step_id);
CREATE INDEX idx_process_outputs_step ON process_outputs(process_step_id);

CREATE INDEX idx_process_approvals_flow ON process_approvals(process_flow_id);
CREATE INDEX idx_process_approvals_status ON process_approvals(approval_status);
CREATE INDEX idx_process_approvals_user ON process_approvals(approver_user_id);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_user ON attachments(uploaded_by);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON parts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_swimlanes_updated_at BEFORE UPDATE ON swimlanes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_flows_updated_at BEFORE UPDATE ON process_flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_steps_updated_at BEFORE UPDATE ON process_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_control_points_updated_at BEFORE UPDATE ON control_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_approvals_updated_at BEFORE UPDATE ON process_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default swimlanes
INSERT INTO swimlanes (name, description, department, responsible_role, color, position_order) VALUES
('Manufacturing', 'Manufacturing and production operations', 'Manufacturing', 'Production Operator', '#E8F5E8', 1),
('Quality Control', 'Quality inspection and testing', 'Quality', 'Quality Inspector', '#FFF3E0', 2),
('Engineering', 'Engineering and process development', 'Engineering', 'Process Engineer', '#E3F2FD', 3),
('Logistics', 'Material handling and shipping', 'Logistics', 'Material Handler', '#F3E5F5', 4),
('Maintenance', 'Equipment maintenance and repair', 'Maintenance', 'Maintenance Technician', '#FFEBEE', 5);

-- Insert default resources
INSERT INTO resources (name, resource_type, description, specification, is_active) VALUES
('CNC Milling Machine', 'MACHINE', '3-axis CNC milling machine', 'Haas VF-2', true),
('Press Brake', 'MACHINE', 'Hydraulic press brake', 'Amada HFE 1303S', true),
('Welding Station', 'MACHINE', 'MIG welding station', 'Miller Millermatic 350P', true),
('CMM', 'MACHINE', 'Coordinate measuring machine', 'Zeiss Contura G2', true),
('Forklift', 'EQUIPMENT', 'Electric forklift', 'Toyota 8FBE20', true),
('Hand Tools', 'TOOL', 'Standard hand tool set', 'Various', true),
('Measuring Equipment', 'TOOL', 'Precision measuring tools', 'Mitutoyo calipers, micrometers', true),
('Production Operator', 'OPERATOR', 'Skilled production operator', 'Level 2 certified', true),
('Quality Inspector', 'OPERATOR', 'Quality control inspector', 'ASQ certified', true),
('Process Engineer', 'OPERATOR', 'Manufacturing process engineer', 'PE licensed', true);

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE projects IS 'Top-level containers for organizing process flows by customer/product';
COMMENT ON TABLE parts IS 'Automotive parts and components being manufactured';
COMMENT ON TABLE swimlanes IS 'Organizational lanes for grouping process steps by department or role';
COMMENT ON TABLE process_flows IS 'Complete process flows showing manufacturing sequences';
COMMENT ON TABLE process_steps IS 'Individual steps within a process flow with positioning data';
COMMENT ON TABLE step_connections IS 'Connections/edges between process steps';
COMMENT ON TABLE resources IS 'Manufacturing resources (machines, tools, operators, materials)';
COMMENT ON TABLE control_points IS 'Quality control points within process steps';
COMMENT ON TABLE process_inputs IS 'Materials and inputs required for each process step';
COMMENT ON TABLE process_outputs IS 'Products and outputs generated by each process step';
COMMENT ON TABLE process_approvals IS 'Approval workflow for process flows';
COMMENT ON TABLE audit_logs IS 'Complete audit trail of all system changes';
COMMENT ON TABLE comments IS 'Collaborative comments on various entities';
COMMENT ON TABLE attachments IS 'File attachments for documentation';