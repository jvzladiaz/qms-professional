-- Migration 003: Control Plan Schema Extension
-- Phase 3: Control Plan Integration for Complete QMS Triad
-- Created: 2025-09-02

-- =====================================================
-- CONTROL PLAN MAIN TABLES
-- =====================================================

-- Control Plans Table
CREATE TABLE control_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    process_flow_id UUID REFERENCES process_flows(id) ON DELETE CASCADE,
    fmea_id UUID REFERENCES fmeas(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
    control_plan_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    revision VARCHAR(10) DEFAULT '1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_REVIEW, APPROVED, ACTIVE, INACTIVE, ARCHIVED
    control_plan_type VARCHAR(50) DEFAULT 'PRODUCTION', -- PROTOTYPE, PRE_LAUNCH, PRODUCTION
    part_family VARCHAR(255),
    customer VARCHAR(255),
    supplier VARCHAR(255),
    key_contact_id UUID REFERENCES users(id),
    core_team_id UUID REFERENCES users(id),
    effective_date DATE,
    supersedes_plan_id UUID REFERENCES control_plans(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    updated_by_id UUID NOT NULL REFERENCES users(id),
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(control_plan_number),
    CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
    CHECK (control_plan_type IN ('PROTOTYPE', 'PRE_LAUNCH', 'PRODUCTION'))
);

-- Create indexes for control_plans table
CREATE INDEX idx_control_plans_project_id ON control_plans(project_id);
CREATE INDEX idx_control_plans_process_flow_id ON control_plans(process_flow_id);
CREATE INDEX idx_control_plans_fmea_id ON control_plans(fmea_id);
CREATE INDEX idx_control_plans_status ON control_plans(status);
CREATE INDEX idx_control_plans_type ON control_plans(control_plan_type);
CREATE INDEX idx_control_plans_effective_date ON control_plans(effective_date);

-- Control Plan Items (individual control entries)
CREATE TABLE control_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_plan_id UUID NOT NULL REFERENCES control_plans(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    
    -- Process Information
    process_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    operation_number VARCHAR(50),
    operation_description TEXT NOT NULL,
    machine_device_fixture VARCHAR(255),
    
    -- Product/Process Characteristics
    product_characteristic VARCHAR(255),
    process_characteristic VARCHAR(255),
    specification_requirement TEXT,
    
    -- Control Information
    control_method VARCHAR(255) NOT NULL,
    measurement_technique VARCHAR(255),
    sample_size_frequency VARCHAR(255) NOT NULL,
    
    -- Control Type Classification
    control_type VARCHAR(50) NOT NULL DEFAULT 'DETECTION', -- PREVENTION, DETECTION
    control_category VARCHAR(50) DEFAULT 'MEASUREMENT', -- MEASUREMENT, VISUAL, FUNCTIONAL, ATTRIBUTE
    
    -- Measurement Specifications
    measurement_unit VARCHAR(50),
    upper_spec_limit DECIMAL(15, 6),
    lower_spec_limit DECIMAL(15, 6),
    target_value DECIMAL(15, 6),
    tolerance DECIMAL(15, 6),
    
    -- Gage/Test Equipment
    gage_name_number VARCHAR(255),
    gage_id VARCHAR(100),
    calibration_frequency VARCHAR(100),
    measurement_system_analysis BOOLEAN DEFAULT FALSE,
    gage_repeatability DECIMAL(8, 4),
    gage_reproducibility DECIMAL(8, 4),
    
    -- Responsibility and Timing
    responsible_party VARCHAR(255) NOT NULL,
    responsible_role VARCHAR(100),
    measurement_frequency VARCHAR(100) NOT NULL,
    measurement_timing VARCHAR(100), -- START_OF_SHIFT, HOURLY, PER_PART, etc.
    
    -- Reaction Plan
    out_of_control_action_plan TEXT,
    escalation_procedure TEXT,
    containment_actions TEXT,
    corrective_actions TEXT,
    
    -- Documentation and Traceability
    work_instruction_reference VARCHAR(255),
    record_retention_requirements VARCHAR(255),
    data_recording_method VARCHAR(100), -- MANUAL, AUTOMATED, ELECTRONIC
    spc_chart_type VARCHAR(50), -- XBAR_R, INDIVIDUALS, P_CHART, etc.
    
    -- Critical Characteristic Flags
    special_characteristic BOOLEAN DEFAULT FALSE,
    customer_required BOOLEAN DEFAULT FALSE,
    regulatory_requirement BOOLEAN DEFAULT FALSE,
    safety_characteristic BOOLEAN DEFAULT FALSE,
    
    -- Status and Verification
    verification_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, VERIFIED, REQUIRES_UPDATE
    last_verification_date DATE,
    verified_by_id UUID REFERENCES users(id),
    
    -- Linkage Information
    linked_failure_mode_id UUID REFERENCES failure_modes(id),
    linked_failure_cause_id UUID REFERENCES failure_causes(id),
    linked_failure_control_id UUID REFERENCES failure_controls(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (control_type IN ('PREVENTION', 'DETECTION')),
    CHECK (control_category IN ('MEASUREMENT', 'VISUAL', 'FUNCTIONAL', 'ATTRIBUTE', 'GO_NO_GO', 'VARIABLE')),
    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REQUIRES_UPDATE')),
    CHECK (data_recording_method IN ('MANUAL', 'AUTOMATED', 'ELECTRONIC', 'PAPER')),
    CHECK (sequence_number > 0)
);

-- Create indexes for control_plan_items table
CREATE INDEX idx_control_plan_items_control_plan_id ON control_plan_items(control_plan_id);
CREATE INDEX idx_control_plan_items_sequence ON control_plan_items(control_plan_id, sequence_number);
CREATE INDEX idx_control_plan_items_process_step_id ON control_plan_items(process_step_id);
CREATE INDEX idx_control_plan_items_control_type ON control_plan_items(control_type);
CREATE INDEX idx_control_plan_items_responsible_party ON control_plan_items(responsible_party);
CREATE INDEX idx_control_plan_items_failure_mode_id ON control_plan_items(linked_failure_mode_id);

-- Control Methods Reference Table
CREATE TABLE control_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name VARCHAR(255) NOT NULL UNIQUE,
    method_category VARCHAR(100) NOT NULL,
    description TEXT,
    typical_applications TEXT,
    equipment_required TEXT,
    skill_level_required VARCHAR(50), -- BASIC, INTERMEDIATE, ADVANCED, EXPERT
    measurement_type VARCHAR(50), -- VARIABLE, ATTRIBUTE, GO_NO_GO
    automation_capable BOOLEAN DEFAULT FALSE,
    cost_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, VERY_HIGH
    cycle_time_impact VARCHAR(50), -- MINIMAL, LOW, MEDIUM, HIGH
    
    -- Statistical Process Control Information
    spc_applicable BOOLEAN DEFAULT FALSE,
    control_chart_types TEXT[], -- Array of applicable chart types
    minimum_sample_size INTEGER DEFAULT 1,
    recommended_sample_size INTEGER,
    
    -- Industry Standards
    applicable_standards TEXT,
    automotive_standard VARCHAR(100), -- AIAG, VDA, ISO_TS, IATF, etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (skill_level_required IN ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')),
    CHECK (measurement_type IN ('VARIABLE', 'ATTRIBUTE', 'GO_NO_GO', 'FUNCTIONAL')),
    CHECK (cost_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
    CHECK (cycle_time_impact IN ('MINIMAL', 'LOW', 'MEDIUM', 'HIGH'))
);

-- Create indexes for control_methods table
CREATE INDEX idx_control_methods_category ON control_methods(method_category);
CREATE INDEX idx_control_methods_measurement_type ON control_methods(measurement_type);
CREATE INDEX idx_control_methods_spc_applicable ON control_methods(spc_applicable);

-- Measurement Equipment/Gages Table
CREATE TABLE measurement_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_number VARCHAR(100) NOT NULL UNIQUE,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100) NOT NULL, -- CALIPER, MICROMETER, CMM, TORQUE_WRENCH, etc.
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(100),
    
    -- Calibration Information
    calibration_frequency_days INTEGER NOT NULL DEFAULT 365,
    last_calibration_date DATE,
    next_calibration_due DATE,
    calibration_standard VARCHAR(255),
    calibration_source VARCHAR(255),
    
    -- Measurement Specifications
    measurement_range_min DECIMAL(15, 6),
    measurement_range_max DECIMAL(15, 6),
    resolution DECIMAL(15, 6),
    accuracy DECIMAL(15, 6),
    repeatability DECIMAL(15, 6),
    reproducibility DECIMAL(15, 6),
    
    -- Gage R&R Study Information
    grr_study_required BOOLEAN DEFAULT FALSE,
    last_grr_study_date DATE,
    grr_study_interval_days INTEGER DEFAULT 365,
    grr_percent_tolerance DECIMAL(5, 2),
    grr_acceptable_limit DECIMAL(5, 2) DEFAULT 30.0,
    grr_status VARCHAR(20) DEFAULT 'PENDING', -- ACCEPTABLE, MARGINAL, UNACCEPTABLE, PENDING
    
    -- Location and Status
    location VARCHAR(255),
    department VARCHAR(100),
    responsible_person VARCHAR(255),
    equipment_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, OUT_OF_SERVICE, REPAIR
    
    -- Cost and Procurement
    purchase_cost DECIMAL(12, 2),
    purchase_date DATE,
    vendor VARCHAR(255),
    warranty_expiration DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (grr_status IN ('ACCEPTABLE', 'MARGINAL', 'UNACCEPTABLE', 'PENDING')),
    CHECK (equipment_status IN ('ACTIVE', 'INACTIVE', 'OUT_OF_SERVICE', 'REPAIR')),
    CHECK (calibration_frequency_days > 0),
    CHECK (grr_acceptable_limit > 0 AND grr_acceptable_limit <= 100)
);

-- Create indexes for measurement_equipment table
CREATE INDEX idx_measurement_equipment_number ON measurement_equipment(equipment_number);
CREATE INDEX idx_measurement_equipment_type ON measurement_equipment(equipment_type);
CREATE INDEX idx_measurement_equipment_calibration_due ON measurement_equipment(next_calibration_due);
CREATE INDEX idx_measurement_equipment_grr_due ON measurement_equipment(last_grr_study_date, grr_study_interval_days);
CREATE INDEX idx_measurement_equipment_status ON measurement_equipment(equipment_status);

-- =====================================================
-- LINKAGE AND RELATIONSHIP TABLES
-- =====================================================

-- Control Plan to FMEA Linkage Table
CREATE TABLE control_plan_fmea_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_plan_item_id UUID NOT NULL REFERENCES control_plan_items(id) ON DELETE CASCADE,
    failure_mode_id UUID REFERENCES failure_modes(id) ON DELETE CASCADE,
    failure_cause_id UUID REFERENCES failure_causes(id) ON DELETE CASCADE,
    failure_control_id UUID REFERENCES failure_controls(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'ADDRESSES', -- ADDRESSES, PREVENTS, DETECTS, MONITORS
    control_effectiveness VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, VERY_HIGH
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (relationship_type IN ('ADDRESSES', 'PREVENTS', 'DETECTS', 'MONITORS', 'CONTROLS')),
    CHECK (control_effectiveness IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'))
);

-- Create indexes for control_plan_fmea_links table
CREATE INDEX idx_cp_fmea_links_control_plan_item ON control_plan_fmea_links(control_plan_item_id);
CREATE INDEX idx_cp_fmea_links_failure_mode ON control_plan_fmea_links(failure_mode_id);
CREATE INDEX idx_cp_fmea_links_failure_cause ON control_plan_fmea_links(failure_cause_id);
CREATE INDEX idx_cp_fmea_links_failure_control ON control_plan_fmea_links(failure_control_id);

-- Control Plan Team Members Table
CREATE TABLE control_plan_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_plan_id UUID NOT NULL REFERENCES control_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, -- QUALITY_ENGINEER, PRODUCTION_MANAGER, OPERATOR, etc.
    responsibilities TEXT,
    expertise_area VARCHAR(255),
    contact_info TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(control_plan_id, user_id, role)
);

-- Create indexes for control_plan_team_members table
CREATE INDEX idx_cp_team_members_control_plan ON control_plan_team_members(control_plan_id);
CREATE INDEX idx_cp_team_members_user ON control_plan_team_members(user_id);
CREATE INDEX idx_cp_team_members_role ON control_plan_team_members(role);

-- =====================================================
-- FREQUENCY AND SCHEDULING TABLES
-- =====================================================

-- Measurement Frequencies Reference Table
CREATE TABLE measurement_frequencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency_code VARCHAR(50) NOT NULL UNIQUE,
    frequency_name VARCHAR(255) NOT NULL,
    description TEXT,
    interval_minutes INTEGER, -- For scheduled intervals
    is_event_based BOOLEAN DEFAULT FALSE, -- True for "per part", "per batch", etc.
    is_continuous BOOLEAN DEFAULT FALSE, -- True for automated continuous monitoring
    typical_applications TEXT,
    automotive_standard VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (interval_minutes IS NULL OR interval_minutes > 0)
);

-- Insert standard measurement frequencies
INSERT INTO measurement_frequencies (frequency_code, frequency_name, description, interval_minutes, is_event_based, is_continuous, typical_applications, automotive_standard) VALUES
('CONTINUOUS', 'Continuous', 'Continuous monitoring/measurement', NULL, FALSE, TRUE, 'Automated process monitoring, sensors', 'AIAG'),
('EACH_PIECE', 'Each Piece', 'Every part/piece produced', NULL, TRUE, FALSE, 'Critical characteristics, 100% inspection', 'AIAG'),
('EVERY_5_PIECES', 'Every 5 Pieces', 'Every 5th piece produced', NULL, TRUE, FALSE, 'Regular sampling inspection', 'AIAG'),
('EVERY_10_PIECES', 'Every 10 Pieces', 'Every 10th piece produced', NULL, TRUE, FALSE, 'Periodic sampling', 'AIAG'),
('START_OF_SHIFT', 'Start of Shift', 'Beginning of each work shift', NULL, TRUE, FALSE, 'Setup verification, first piece inspection', 'AIAG'),
('HOURLY', 'Hourly', 'Every hour during production', 60, FALSE, FALSE, 'Process monitoring', 'AIAG'),
('EVERY_2_HOURS', 'Every 2 Hours', 'Every 2 hours during production', 120, FALSE, FALSE, 'Regular process checks', 'AIAG'),
('EVERY_4_HOURS', 'Every 4 Hours', 'Every 4 hours during production', 240, FALSE, FALSE, 'Extended interval monitoring', 'AIAG'),
('DAILY', 'Daily', 'Once per day', 1440, FALSE, FALSE, 'Daily inspections, calibration checks', 'AIAG'),
('WEEKLY', 'Weekly', 'Once per week', 10080, FALSE, FALSE, 'Weekly audits, maintenance checks', 'AIAG'),
('MONTHLY', 'Monthly', 'Once per month', 43200, FALSE, FALSE, 'Monthly reviews, equipment verification', 'AIAG'),
('PER_LOT', 'Per Lot/Batch', 'Once per production lot or batch', NULL, TRUE, FALSE, 'Lot sampling, batch verification', 'AIAG'),
('SETUP_CHANGE', 'Setup Change', 'Every time setup is changed', NULL, TRUE, FALSE, 'Setup verification, changeover inspection', 'AIAG');

-- =====================================================
-- STANDARD AUTOMOTIVE CONTROL METHODS
-- =====================================================

-- Insert standard automotive control methods
INSERT INTO control_methods (method_name, method_category, description, typical_applications, equipment_required, skill_level_required, measurement_type, automation_capable, cost_level, cycle_time_impact, spc_applicable, control_chart_types, minimum_sample_size, recommended_sample_size, applicable_standards, automotive_standard) VALUES

-- Dimensional Measurement Methods
('Calipers', 'DIMENSIONAL', 'Manual measurement using calipers for external/internal dimensions', 'Length, diameter, thickness measurements', 'Dial or digital calipers', 'BASIC', 'VARIABLE', FALSE, 'LOW', 'LOW', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS'], 1, 5, 'ASME Y14.5', 'AIAG'),
('Micrometers', 'DIMENSIONAL', 'Precision measurement using micrometers', 'Precise external/internal dimensions', 'Outside/inside micrometers', 'INTERMEDIATE', 'VARIABLE', FALSE, 'MEDIUM', 'LOW', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS'], 1, 5, 'ASME Y14.5', 'AIAG'),
('CMM Measurement', 'DIMENSIONAL', 'Coordinate Measuring Machine for complex geometries', 'Complex part geometry, GD&T verification', 'Coordinate Measuring Machine', 'ADVANCED', 'VARIABLE', TRUE, 'VERY_HIGH', 'HIGH', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS'], 1, 3, 'ASME Y14.5, ISO 10360', 'AIAG'),
('Height Gage', 'DIMENSIONAL', 'Vertical dimension measurement', 'Height, step measurements', 'Height gage with scribes', 'INTERMEDIATE', 'VARIABLE', FALSE, 'MEDIUM', 'MEDIUM', TRUE, ARRAY['XBAR_R'], 1, 5, 'ASME Y14.5', 'AIAG'),

-- Visual Inspection Methods
('Visual Inspection', 'VISUAL', 'Direct visual examination for defects', 'Surface finish, appearance, obvious defects', 'Good lighting, magnification as needed', 'BASIC', 'ATTRIBUTE', FALSE, 'LOW', 'MINIMAL', TRUE, ARRAY['P_CHART', 'C_CHART'], 25, 50, 'ASTM standards', 'AIAG'),
('Magnified Visual', 'VISUAL', 'Visual inspection with magnification', 'Small defects, surface detail inspection', 'Magnifying glass, microscope', 'BASIC', 'ATTRIBUTE', FALSE, 'LOW', 'LOW', TRUE, ARRAY['P_CHART', 'C_CHART'], 25, 50, 'ASTM standards', 'AIAG'),

-- Functional Testing Methods  
('Go/No-Go Gaging', 'FUNCTIONAL', 'Limit gaging for attribute inspection', 'Dimensional limits, fit verification', 'Go/No-Go gages', 'BASIC', 'GO_NO_GO', FALSE, 'LOW', 'MINIMAL', TRUE, ARRAY['P_CHART'], 25, 50, 'ASME Y14.43', 'AIAG'),
('Torque Testing', 'FUNCTIONAL', 'Torque verification for fasteners', 'Fastener torque verification', 'Torque wrench, torque tester', 'INTERMEDIATE', 'VARIABLE', TRUE, 'MEDIUM', 'LOW', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS'], 3, 5, 'ISO 6789', 'AIAG'),
('Pressure Testing', 'FUNCTIONAL', 'Pressure/leak testing', 'Seal integrity, pressure vessel testing', 'Pressure test equipment', 'INTERMEDIATE', 'VARIABLE', TRUE, 'MEDIUM', 'MEDIUM', TRUE, ARRAY['INDIVIDUALS'], 1, 3, 'ASME B31.3', 'AIAG'),
('Electrical Testing', 'FUNCTIONAL', 'Electrical continuity and function testing', 'Circuit continuity, resistance, voltage', 'Multimeter, electrical test equipment', 'INTERMEDIATE', 'VARIABLE', TRUE, 'MEDIUM', 'LOW', TRUE, ARRAY['INDIVIDUALS'], 3, 5, 'IPC standards', 'AIAG'),

-- Material Testing Methods
('Hardness Testing', 'MATERIAL', 'Material hardness verification', 'Heat treatment verification, material properties', 'Hardness tester (Rockwell, Brinell)', 'INTERMEDIATE', 'VARIABLE', TRUE, 'MEDIUM', 'MEDIUM', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS'], 3, 5, 'ASTM E18, E10', 'AIAG'),
('Material Composition', 'MATERIAL', 'Chemical composition verification', 'Material certification, alloy verification', 'Spectrometer, chemical analysis equipment', 'EXPERT', 'VARIABLE', TRUE, 'VERY_HIGH', 'HIGH', FALSE, NULL, 1, 1, 'ASTM E415', 'AIAG'),

-- Process Monitoring Methods
('SPC Monitoring', 'PROCESS', 'Statistical Process Control monitoring', 'Process stability monitoring', 'SPC software, measurement equipment', 'ADVANCED', 'VARIABLE', TRUE, 'MEDIUM', 'MINIMAL', TRUE, ARRAY['XBAR_R', 'INDIVIDUALS', 'XBAR_S'], 3, 25, 'AIAG SPC manual', 'AIAG'),
('Temperature Monitoring', 'PROCESS', 'Process temperature monitoring', 'Heat treatment, welding, curing processes', 'Temperature sensors, data loggers', 'BASIC', 'VARIABLE', TRUE, 'LOW', 'MINIMAL', TRUE, ARRAY['INDIVIDUALS'], 1, 10, 'NIST standards', 'AIAG'),
('Time Monitoring', 'PROCESS', 'Process timing verification', 'Cycle time, cure time, dwell time', 'Timers, process monitoring systems', 'BASIC', 'VARIABLE', TRUE, 'LOW', 'MINIMAL', TRUE, ARRAY['INDIVIDUALS'], 1, 10, 'Process specifications', 'AIAG');

-- =====================================================
-- CHANGE TRACKING AND AUDIT TRAIL
-- =====================================================

-- Change Log Table for tracking modifications across all three modules
CREATE TABLE qms_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_type VARCHAR(50) NOT NULL, -- PROCESS_FLOW, FMEA, CONTROL_PLAN
    entity_type VARCHAR(50) NOT NULL, -- PROCESS_STEP, FAILURE_MODE, CONTROL_PLAN_ITEM, etc.
    entity_id UUID NOT NULL,
    change_action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LINK, UNLINK
    
    -- Change Details
    changed_fields TEXT[], -- Array of field names that changed
    old_values JSONB, -- Previous values
    new_values JSONB, -- New values
    change_reason TEXT,
    impact_assessment TEXT,
    
    -- User and Timestamp
    changed_by_id UUID NOT NULL REFERENCES users(id),
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Impact Tracking
    downstream_impacts TEXT[], -- List of affected downstream entities
    notification_sent BOOLEAN DEFAULT FALSE,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    CHECK (change_type IN ('PROCESS_FLOW', 'FMEA', 'CONTROL_PLAN')),
    CHECK (change_action IN ('CREATE', 'UPDATE', 'DELETE', 'LINK', 'UNLINK', 'APPROVE', 'REJECT'))
);

-- Create indexes for qms_change_log table
CREATE INDEX idx_qms_change_log_entity ON qms_change_log(entity_type, entity_id);
CREATE INDEX idx_qms_change_log_change_type ON qms_change_log(change_type);
CREATE INDEX idx_qms_change_log_timestamp ON qms_change_log(change_timestamp);
CREATE INDEX idx_qms_change_log_changed_by ON qms_change_log(changed_by_id);
CREATE INDEX idx_qms_change_log_approval ON qms_change_log(approval_required, approved_by_id);

-- =====================================================
-- VIEWS FOR INTEGRATED REPORTING
-- =====================================================

-- Complete QMS Triad View (Process Flow → FMEA → Control Plan)
CREATE VIEW qms_triad_view AS
SELECT 
    -- Process Flow Information
    pf.id as process_flow_id,
    pf.name as process_flow_name,
    pf.version as process_flow_version,
    
    -- Process Step Information
    ps.id as process_step_id,
    ps.step_number,
    ps.name as process_step_name,
    ps.step_type,
    
    -- FMEA Information
    f.id as fmea_id,
    f.fmea_number,
    f.title as fmea_title,
    
    -- Failure Mode Information
    fm.id as failure_mode_id,
    fm.item_function,
    fm.failure_mode,
    fm.severity_rating,
    
    -- Control Plan Information
    cp.id as control_plan_id,
    cp.control_plan_number,
    cp.title as control_plan_title,
    
    -- Control Plan Item Information
    cpi.id as control_plan_item_id,
    cpi.operation_description,
    cpi.control_method,
    cpi.control_type,
    cpi.responsible_party,
    cpi.measurement_frequency,
    
    -- Linkage Information
    CASE WHEN cpi.id IS NOT NULL THEN TRUE ELSE FALSE END as has_control_plan,
    CASE WHEN fm.id IS NOT NULL THEN TRUE ELSE FALSE END as has_fmea_analysis

FROM process_flows pf
LEFT JOIN process_steps ps ON pf.id = ps.process_flow_id
LEFT JOIN process_step_failure_modes psfm ON ps.id = psfm.process_step_id
LEFT JOIN failure_modes fm ON psfm.failure_mode_id = fm.id
LEFT JOIN fmeas f ON fm.fmea_id = f.id
LEFT JOIN control_plan_fmea_links cpfl ON fm.id = cpfl.failure_mode_id
LEFT JOIN control_plan_items cpi ON cpfl.control_plan_item_id = cpi.id
LEFT JOIN control_plans cp ON cpi.control_plan_id = cp.id

WHERE pf.status = 'ACTIVE'
ORDER BY pf.name, ps.step_number, fm.sequence_number, cpi.sequence_number;

-- Control Plan Coverage Analysis View
CREATE VIEW control_plan_coverage_view AS
SELECT 
    cp.id as control_plan_id,
    cp.control_plan_number,
    cp.title,
    
    -- Coverage Statistics
    COUNT(cpi.id) as total_control_items,
    COUNT(CASE WHEN cpi.control_type = 'PREVENTION' THEN 1 END) as prevention_controls,
    COUNT(CASE WHEN cpi.control_type = 'DETECTION' THEN 1 END) as detection_controls,
    COUNT(CASE WHEN cpi.special_characteristic = TRUE THEN 1 END) as special_characteristics,
    
    -- FMEA Linkage
    COUNT(DISTINCT cpfl.failure_mode_id) as linked_failure_modes,
    
    -- Verification Status
    COUNT(CASE WHEN cpi.verification_status = 'VERIFIED' THEN 1 END) as verified_controls,
    COUNT(CASE WHEN cpi.verification_status = 'PENDING' THEN 1 END) as pending_verification,
    COUNT(CASE WHEN cpi.verification_status = 'REQUIRES_UPDATE' THEN 1 END) as requires_update,
    
    -- Completeness Metrics
    ROUND(
        (COUNT(CASE WHEN cpi.verification_status = 'VERIFIED' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(cpi.id), 0)) * 100, 2
    ) as verification_completeness_percent

FROM control_plans cp
LEFT JOIN control_plan_items cpi ON cp.id = cpi.control_plan_id
LEFT JOIN control_plan_fmea_links cpfl ON cpi.id = cpfl.control_plan_item_id

GROUP BY cp.id, cp.control_plan_number, cp.title
ORDER BY cp.control_plan_number;

-- =====================================================
-- FUNCTIONS FOR CONTROL PLAN LOGIC
-- =====================================================

-- Function to auto-generate control plan items from FMEA controls
CREATE OR REPLACE FUNCTION auto_generate_control_plan_items(p_control_plan_id UUID, p_fmea_id UUID)
RETURNS TABLE(created_count INTEGER, skipped_count INTEGER, error_messages TEXT[]) AS $$
DECLARE
    v_created_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_error_messages TEXT[] := ARRAY[]::TEXT[];
    v_control_record RECORD;
    v_sequence_number INTEGER;
    v_new_item_id UUID;
BEGIN
    -- Get next sequence number
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_sequence_number
    FROM control_plan_items
    WHERE control_plan_id = p_control_plan_id;
    
    -- Loop through FMEA controls that aren't already linked
    FOR v_control_record IN
        SELECT DISTINCT
            fc.id as control_id,
            fc.control_description,
            fc.control_type,
            fc.control_method,
            fc.detection_rating,
            fc.responsibility,
            fc.frequency,
            fc.process_step_id,
            fm.id as failure_mode_id,
            fm.item_function,
            ps.name as process_step_name,
            ps.step_number
        FROM failure_controls fc
        JOIN failure_causes fca ON fc.failure_cause_id = fca.id
        JOIN failure_modes fm ON fca.failure_mode_id = fm.id
        LEFT JOIN process_steps ps ON fc.process_step_id = ps.id
        WHERE fm.fmea_id = p_fmea_id
        AND NOT EXISTS (
            SELECT 1 FROM control_plan_fmea_links cpfl
            JOIN control_plan_items cpi ON cpfl.control_plan_item_id = cpi.id
            WHERE cpfl.failure_control_id = fc.id
            AND cpi.control_plan_id = p_control_plan_id
        )
    LOOP
        BEGIN
            -- Create control plan item
            INSERT INTO control_plan_items (
                control_plan_id,
                sequence_number,
                operation_description,
                control_method,
                control_type,
                measurement_frequency,
                responsible_party,
                process_step_id,
                linked_failure_mode_id,
                linked_failure_control_id,
                specification_requirement
            ) VALUES (
                p_control_plan_id,
                v_sequence_number,
                COALESCE('Step ' || v_control_record.step_number || ': ' || v_control_record.process_step_name, v_control_record.item_function),
                COALESCE(v_control_record.control_method, 'TBD'),
                v_control_record.control_type,
                COALESCE(v_control_record.frequency, 'TBD'),
                COALESCE(v_control_record.responsibility, 'TBD'),
                v_control_record.process_step_id,
                v_control_record.failure_mode_id,
                v_control_record.control_id,
                v_control_record.control_description
            ) RETURNING id INTO v_new_item_id;
            
            -- Create linkage
            INSERT INTO control_plan_fmea_links (
                control_plan_item_id,
                failure_mode_id,
                failure_control_id,
                relationship_type
            ) VALUES (
                v_new_item_id,
                v_control_record.failure_mode_id,
                v_control_record.control_id,
                CASE v_control_record.control_type
                    WHEN 'PREVENTION' THEN 'PREVENTS'
                    WHEN 'DETECTION' THEN 'DETECTS'
                    ELSE 'ADDRESSES'
                END
            );
            
            v_created_count := v_created_count + 1;
            v_sequence_number := v_sequence_number + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_messages := array_append(v_error_messages, 
                'Error creating control for ' || v_control_record.control_description || ': ' || SQLERRM);
            v_skipped_count := v_skipped_count + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_created_count, v_skipped_count, v_error_messages;
END;
$$ LANGUAGE plpgsql;

-- Function to update control plan verification status
CREATE OR REPLACE FUNCTION update_control_plan_verification(p_control_plan_id UUID, p_verified_by_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    UPDATE control_plan_items
    SET 
        verification_status = 'VERIFIED',
        last_verification_date = CURRENT_DATE,
        verified_by_id = p_verified_by_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE control_plan_id = p_control_plan_id
    AND verification_status != 'VERIFIED';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;