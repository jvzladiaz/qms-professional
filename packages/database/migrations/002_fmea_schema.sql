-- Migration 002: FMEA Schema Extension
-- Phase 2: Failure Mode and Effects Analysis Integration
-- Created: 2025-09-02

-- =====================================================
-- FMEA MAIN TABLES
-- =====================================================

-- FMEA Analysis Document Table
CREATE TABLE fmeas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    process_flow_id UUID REFERENCES process_flows(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE SET NULL,
    fmea_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fmea_type VARCHAR(50) NOT NULL DEFAULT 'PROCESS', -- PROCESS, DESIGN, SYSTEM
    revision VARCHAR(10) DEFAULT '1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_REVIEW, APPROVED, ACTIVE, ARCHIVED
    severity_threshold INTEGER DEFAULT 7, -- Threshold for high severity (1-10)
    occurrence_threshold INTEGER DEFAULT 4, -- Threshold for high occurrence (1-10)  
    detection_threshold INTEGER DEFAULT 7, -- Threshold for poor detection (1-10)
    rpn_threshold INTEGER DEFAULT 100, -- Threshold for action required
    analysis_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    team_leader_id UUID REFERENCES users(id),
    created_by_id UUID NOT NULL REFERENCES users(id),
    updated_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fmea_number),
    CHECK (severity_threshold BETWEEN 1 AND 10),
    CHECK (occurrence_threshold BETWEEN 1 AND 10),
    CHECK (detection_threshold BETWEEN 1 AND 10),
    CHECK (rpn_threshold > 0)
);

-- Create indexes for FMEA table
CREATE INDEX idx_fmeas_project_id ON fmeas(project_id);
CREATE INDEX idx_fmeas_process_flow_id ON fmeas(process_flow_id);
CREATE INDEX idx_fmeas_status ON fmeas(status);
CREATE INDEX idx_fmeas_fmea_type ON fmeas(fmea_type);
CREATE INDEX idx_fmeas_created_by_id ON fmeas(created_by_id);

-- Failure Modes Table
CREATE TABLE failure_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fmea_id UUID NOT NULL REFERENCES fmeas(id) ON DELETE CASCADE,
    item_function TEXT NOT NULL, -- What is the intended function of the item
    failure_mode TEXT NOT NULL, -- How could the item fail to perform its function
    sequence_number INTEGER NOT NULL DEFAULT 1,
    severity_rating INTEGER NOT NULL DEFAULT 1, -- 1-10 scale
    severity_justification TEXT,
    
    -- Process step linkage (many-to-many via separate table)
    primary_process_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    
    -- Automotive specific fields
    failure_classification VARCHAR(50) DEFAULT 'PROCESS', -- PROCESS, PRODUCT, SYSTEM
    special_characteristic BOOLEAN DEFAULT FALSE, -- Critical/Key characteristic
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (severity_rating BETWEEN 1 AND 10),
    CHECK (sequence_number > 0)
);

-- Create indexes for failure_modes table
CREATE INDEX idx_failure_modes_fmea_id ON failure_modes(fmea_id);
CREATE INDEX idx_failure_modes_severity_rating ON failure_modes(severity_rating);
CREATE INDEX idx_failure_modes_primary_process_step_id ON failure_modes(primary_process_step_id);
CREATE INDEX idx_failure_modes_sequence ON failure_modes(fmea_id, sequence_number);

-- Effects of Failure Table
CREATE TABLE failure_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_mode_id UUID NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    effect_description TEXT NOT NULL, -- What are the consequences of the failure
    effect_type VARCHAR(50) NOT NULL DEFAULT 'LOCAL', -- LOCAL, NEXT_LEVEL, END_USER
    customer_impact TEXT, -- How does this affect the customer
    
    -- Automotive specific impact categories
    safety_impact BOOLEAN DEFAULT FALSE,
    regulatory_impact BOOLEAN DEFAULT FALSE, -- DOT, EPA, etc.
    warranty_impact BOOLEAN DEFAULT FALSE,
    
    sequence_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (sequence_number > 0)
);

-- Create indexes for failure_effects table
CREATE INDEX idx_failure_effects_failure_mode_id ON failure_effects(failure_mode_id);
CREATE INDEX idx_failure_effects_effect_type ON failure_effects(effect_type);

-- Causes of Failure Table  
CREATE TABLE failure_causes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_mode_id UUID NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    cause_description TEXT NOT NULL, -- What could cause the failure mode
    cause_category VARCHAR(100) DEFAULT 'OTHER', -- MACHINE, METHOD, MATERIAL, MANPOWER, MEASUREMENT, ENVIRONMENT
    
    occurrence_rating INTEGER NOT NULL DEFAULT 1, -- 1-10 scale
    occurrence_justification TEXT, -- Rationale for occurrence rating
    
    -- Root cause analysis
    is_root_cause BOOLEAN DEFAULT FALSE,
    cause_mechanism TEXT, -- How the cause leads to failure
    
    sequence_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (occurrence_rating BETWEEN 1 AND 10),
    CHECK (sequence_number > 0)
);

-- Create indexes for failure_causes table
CREATE INDEX idx_failure_causes_failure_mode_id ON failure_causes(failure_mode_id);
CREATE INDEX idx_failure_causes_occurrence_rating ON failure_causes(occurrence_rating);
CREATE INDEX idx_failure_causes_cause_category ON failure_causes(cause_category);

-- Controls Table (Prevention and Detection Controls)
CREATE TABLE failure_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_cause_id UUID NOT NULL REFERENCES failure_causes(id) ON DELETE CASCADE,
    control_description TEXT NOT NULL,
    control_type VARCHAR(50) NOT NULL, -- PREVENTION, DETECTION
    control_method VARCHAR(100), -- SPC, INSPECTION, POKA_YOKE, etc.
    
    detection_rating INTEGER NOT NULL DEFAULT 1, -- 1-10 scale (only for detection controls)
    detection_justification TEXT, -- Rationale for detection rating
    
    -- Control effectiveness
    validation_method TEXT, -- How is the control validated
    responsibility VARCHAR(255), -- Who is responsible for this control
    frequency VARCHAR(100), -- How often is control performed
    sample_size INTEGER, -- For inspection controls
    
    -- Process step linkage
    process_step_id UUID REFERENCES process_steps(id) ON DELETE SET NULL,
    control_point_id UUID REFERENCES control_points(id) ON DELETE SET NULL,
    
    sequence_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (detection_rating BETWEEN 1 AND 10),
    CHECK (sequence_number > 0),
    CHECK (control_type IN ('PREVENTION', 'DETECTION'))
);

-- Create indexes for failure_controls table
CREATE INDEX idx_failure_controls_failure_cause_id ON failure_controls(failure_cause_id);
CREATE INDEX idx_failure_controls_control_type ON failure_controls(control_type);
CREATE INDEX idx_failure_controls_detection_rating ON failure_controls(detection_rating);
CREATE INDEX idx_failure_controls_process_step_id ON failure_controls(process_step_id);

-- Action Items Table
CREATE TABLE fmea_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_mode_id UUID NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    action_description TEXT NOT NULL,
    action_type VARCHAR(50) NOT NULL DEFAULT 'CORRECTIVE', -- CORRECTIVE, PREVENTIVE, IMPROVEMENT
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Assignment and tracking
    assigned_to_id UUID REFERENCES users(id),
    assigned_department VARCHAR(100),
    target_date DATE,
    completed_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
    
    -- Cost and effort tracking
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    
    -- Results tracking
    completion_notes TEXT,
    verification_method TEXT,
    verification_date DATE,
    verified_by_id UUID REFERENCES users(id),
    
    -- RPN improvement tracking  
    target_severity INTEGER, -- Expected severity after action
    target_occurrence INTEGER, -- Expected occurrence after action
    target_detection INTEGER, -- Expected detection after action
    target_rpn INTEGER, -- Calculated target RPN
    
    actual_severity INTEGER, -- Actual severity after implementation
    actual_occurrence INTEGER, -- Actual occurrence after implementation  
    actual_detection INTEGER, -- Actual detection after implementation
    actual_rpn INTEGER, -- Calculated actual RPN
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (target_severity BETWEEN 1 AND 10),
    CHECK (target_occurrence BETWEEN 1 AND 10),
    CHECK (target_detection BETWEEN 1 AND 10),
    CHECK (actual_severity BETWEEN 1 AND 10),
    CHECK (actual_occurrence BETWEEN 1 AND 10),
    CHECK (actual_detection BETWEEN 1 AND 10),
    CHECK (estimated_cost >= 0),
    CHECK (actual_cost >= 0),
    CHECK (estimated_hours >= 0),
    CHECK (actual_hours >= 0)
);

-- Create indexes for fmea_action_items table
CREATE INDEX idx_fmea_action_items_failure_mode_id ON fmea_action_items(failure_mode_id);
CREATE INDEX idx_fmea_action_items_assigned_to_id ON fmea_action_items(assigned_to_id);
CREATE INDEX idx_fmea_action_items_status ON fmea_action_items(status);
CREATE INDEX idx_fmea_action_items_priority ON fmea_action_items(priority);
CREATE INDEX idx_fmea_action_items_target_date ON fmea_action_items(target_date);

-- =====================================================
-- LINKING TABLES FOR MANY-TO-MANY RELATIONSHIPS
-- =====================================================

-- Process Steps to Failure Modes Linking Table
CREATE TABLE process_step_failure_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_step_id UUID NOT NULL REFERENCES process_steps(id) ON DELETE CASCADE,
    failure_mode_id UUID NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'AFFECTS', -- AFFECTS, CONTROLS, MONITORS
    impact_level VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(process_step_id, failure_mode_id, relationship_type)
);

-- Create indexes for process_step_failure_modes table
CREATE INDEX idx_ps_failure_modes_process_step_id ON process_step_failure_modes(process_step_id);
CREATE INDEX idx_ps_failure_modes_failure_mode_id ON process_step_failure_modes(failure_mode_id);
CREATE INDEX idx_ps_failure_modes_relationship_type ON process_step_failure_modes(relationship_type);

-- FMEA Team Members Table
CREATE TABLE fmea_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fmea_id UUID NOT NULL REFERENCES fmeas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, -- TEAM_LEADER, ENGINEER, QUALITY, PRODUCTION, etc.
    expertise_area VARCHAR(255),
    responsibilities TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(fmea_id, user_id)
);

-- Create indexes for fmea_team_members table
CREATE INDEX idx_fmea_team_members_fmea_id ON fmea_team_members(fmea_id);
CREATE INDEX idx_fmea_team_members_user_id ON fmea_team_members(user_id);
CREATE INDEX idx_fmea_team_members_role ON fmea_team_members(role);

-- =====================================================
-- RPN CALCULATION AND AUDIT TRAIL
-- =====================================================

-- RPN Calculations History Table (for audit trail)
CREATE TABLE rpn_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    failure_mode_id UUID NOT NULL REFERENCES failure_modes(id) ON DELETE CASCADE,
    severity INTEGER NOT NULL,
    occurrence INTEGER NOT NULL,
    detection INTEGER NOT NULL,
    rpn INTEGER NOT NULL, -- S × O × D
    calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by_id UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    
    CHECK (severity BETWEEN 1 AND 10),
    CHECK (occurrence BETWEEN 1 AND 10),
    CHECK (detection BETWEEN 1 AND 10),
    CHECK (rpn = severity * occurrence * detection)
);

-- Create indexes for rpn_calculations table
CREATE INDEX idx_rpn_calculations_failure_mode_id ON rpn_calculations(failure_mode_id);
CREATE INDEX idx_rpn_calculations_rpn ON rpn_calculations(rpn);
CREATE INDEX idx_rpn_calculations_date ON rpn_calculations(calculation_date);

-- =====================================================
-- AUTOMOTIVE INDUSTRY REFERENCE TABLES
-- =====================================================

-- Severity Rating Scale Reference Table
CREATE TABLE severity_rating_scale (
    rating INTEGER PRIMARY KEY CHECK (rating BETWEEN 1 AND 10),
    description VARCHAR(100) NOT NULL,
    criteria TEXT NOT NULL,
    examples TEXT,
    automotive_standard VARCHAR(50) DEFAULT 'AIAG-VDA'
);

-- Insert standard automotive severity ratings
INSERT INTO severity_rating_scale (rating, description, criteria, examples, automotive_standard) VALUES
(10, 'Hazardous - without warning', 'Very high severity ranking when a potential failure mode affects safe vehicle operation and/or involves noncompliance with government regulation without warning', 'Loss of primary braking, loss of steering', 'AIAG-VDA'),
(9, 'Hazardous - with warning', 'Very high severity ranking when a potential failure mode affects safe vehicle operation and/or involves noncompliance with government regulation with warning', 'Loss of secondary braking, engine stall with warning', 'AIAG-VDA'),
(8, 'Very High', 'Vehicle/item inoperable (loss of primary function)', 'Vehicle will not start, complete loss of performance', 'AIAG-VDA'),
(7, 'High', 'Vehicle/item operable but at reduced level of performance. Customer very dissatisfied', 'Reduced acceleration, rough shifting', 'AIAG-VDA'),
(6, 'Moderate', 'Vehicle/item operable but comfort/convenience item(s) may not operate. Customer dissatisfied', 'Radio inoperative, A/C not cooling', 'AIAG-VDA'),
(5, 'Low', 'Vehicle/item operable but comfort/convenience item(s) operate at reduced level of performance. Customer somewhat dissatisfied', 'Radio with static, A/C not cooling adequately', 'AIAG-VDA'),
(4, 'Very Low', 'Fit & finish/squeak & rattle item does not conform. Defect noticed by most customers', 'Gap variation, paint defect', 'AIAG-VDA'),
(3, 'Minor', 'Fit & finish/squeak & rattle item does not conform. Defect noticed by average customers', 'Minor gap variation', 'AIAG-VDA'),
(2, 'Very Minor', 'Fit & finish/squeak & rattle item does not conform. Defect noticed by discriminating customers', 'Very minor gap variation', 'AIAG-VDA'),
(1, 'None', 'No effect', 'No discernible effect', 'AIAG-VDA');

-- Occurrence Rating Scale Reference Table
CREATE TABLE occurrence_rating_scale (
    rating INTEGER PRIMARY KEY CHECK (rating BETWEEN 1 AND 10),
    description VARCHAR(100) NOT NULL,
    probability_criteria TEXT NOT NULL,
    failure_rates TEXT,
    automotive_standard VARCHAR(50) DEFAULT 'AIAG-VDA'
);

-- Insert standard automotive occurrence ratings
INSERT INTO occurrence_rating_scale (rating, description, probability_criteria, failure_rates, automotive_standard) VALUES
(10, 'Very High', 'Failure is almost inevitable', '≥ 1 in 2', 'AIAG-VDA'),
(9, 'Very High', 'Very high failure rate', '1 in 3', 'AIAG-VDA'),
(8, 'High', 'High failure rate', '1 in 8', 'AIAG-VDA'),
(7, 'High', 'High failure rate', '1 in 20', 'AIAG-VDA'),
(6, 'Moderate', 'Moderate failure rate', '1 in 80', 'AIAG-VDA'),
(5, 'Moderate', 'Moderate failure rate', '1 in 400', 'AIAG-VDA'),
(4, 'Low', 'Relatively few failures', '1 in 2,000', 'AIAG-VDA'),
(3, 'Low', 'Relatively few failures', '1 in 15,000', 'AIAG-VDA'),
(2, 'Very Low', 'Remote failure rate', '1 in 150,000', 'AIAG-VDA'),
(1, 'Remote', 'Failure unlikely', '< 1 in 1,500,000', 'AIAG-VDA');

-- Detection Rating Scale Reference Table
CREATE TABLE detection_rating_scale (
    rating INTEGER PRIMARY KEY CHECK (rating BETWEEN 1 AND 10),
    description VARCHAR(100) NOT NULL,
    detection_criteria TEXT NOT NULL,
    control_types TEXT,
    automotive_standard VARCHAR(50) DEFAULT 'AIAG-VDA'
);

-- Insert standard automotive detection ratings
INSERT INTO detection_rating_scale (rating, description, detection_criteria, control_types, automotive_standard) VALUES
(10, 'Absolute Uncertainty', 'Design control will not and/or cannot detect a potential cause/mechanism and subsequent failure mode', 'No controls, or controls not effective', 'AIAG-VDA'),
(9, 'Very Remote', 'Very remote chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Visual inspection only', 'AIAG-VDA'),
(8, 'Remote', 'Remote chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Visual inspection with go/no-go', 'AIAG-VDA'),
(7, 'Very Low', 'Very low chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Manual inspection methods', 'AIAG-VDA'),
(6, 'Low', 'Low chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Manual inspection with templates', 'AIAG-VDA'),
(5, 'Moderate', 'Moderate chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Statistical process control', 'AIAG-VDA'),
(4, 'Moderately High', 'Moderately high chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Automatic detection', 'AIAG-VDA'),
(3, 'High', 'High chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Automatic detection with operator alerting', 'AIAG-VDA'),
(2, 'Very High', 'Very high chance the design control will detect a potential cause/mechanism and subsequent failure mode', 'Error proofing/mistake proofing', 'AIAG-VDA'),
(1, 'Almost Certain', 'Design control will almost certainly detect a potential cause/mechanism and subsequent failure mode', 'Error proofing - prevents defects', 'AIAG-VDA');

-- =====================================================
-- CALCULATED COLUMNS AND TRIGGERS
-- =====================================================

-- Function to calculate RPN
CREATE OR REPLACE FUNCTION calculate_rpn(p_failure_mode_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_severity INTEGER;
    v_max_occurrence INTEGER;
    v_max_detection INTEGER;
    v_rpn INTEGER;
BEGIN
    -- Get severity from failure mode
    SELECT severity_rating INTO v_severity 
    FROM failure_modes 
    WHERE id = p_failure_mode_id;
    
    -- Get maximum occurrence rating from all causes
    SELECT COALESCE(MAX(occurrence_rating), 1) INTO v_max_occurrence
    FROM failure_causes 
    WHERE failure_mode_id = p_failure_mode_id;
    
    -- Get maximum detection rating from all controls (worst detection)
    SELECT COALESCE(MAX(fc.detection_rating), 10) INTO v_max_detection
    FROM failure_controls fc
    JOIN failure_causes fca ON fc.failure_cause_id = fca.id
    WHERE fca.failure_mode_id = p_failure_mode_id
    AND fc.control_type = 'DETECTION';
    
    -- Calculate RPN
    v_rpn := v_severity * v_max_occurrence * v_max_detection;
    
    RETURN v_rpn;
END;
$$ LANGUAGE plpgsql;

-- Function to log RPN calculation
CREATE OR REPLACE FUNCTION log_rpn_calculation()
RETURNS TRIGGER AS $$
DECLARE
    v_rpn INTEGER;
    v_severity INTEGER;
    v_occurrence INTEGER;
    v_detection INTEGER;
    v_user_id UUID;
BEGIN
    -- Calculate current RPN
    v_rpn := calculate_rpn(NEW.id);
    
    -- Get individual components for logging
    SELECT severity_rating INTO v_severity FROM failure_modes WHERE id = NEW.id;
    
    SELECT COALESCE(MAX(occurrence_rating), 1) INTO v_occurrence
    FROM failure_causes WHERE failure_mode_id = NEW.id;
    
    SELECT COALESCE(MAX(fc.detection_rating), 10) INTO v_detection
    FROM failure_controls fc
    JOIN failure_causes fca ON fc.failure_cause_id = fca.id
    WHERE fca.failure_mode_id = NEW.id AND fc.control_type = 'DETECTION';
    
    -- Get current user (simplified - in real app would come from session)
    SELECT id INTO v_user_id FROM users LIMIT 1;
    
    -- Log the calculation
    INSERT INTO rpn_calculations (
        failure_mode_id, severity, occurrence, detection, rpn, calculated_by_id
    ) VALUES (
        NEW.id, v_severity, v_occurrence, v_detection, v_rpn, v_user_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for RPN calculation logging
CREATE TRIGGER trigger_log_rpn_on_failure_mode_update
    AFTER INSERT OR UPDATE ON failure_modes
    FOR EACH ROW EXECUTE FUNCTION log_rpn_calculation();

-- =====================================================
-- VIEWS FOR COMMON FMEA QUERIES
-- =====================================================

-- Comprehensive FMEA View with RPN calculations
CREATE VIEW fmea_analysis_view AS
SELECT 
    f.id as fmea_id,
    f.fmea_number,
    f.title as fmea_title,
    f.status as fmea_status,
    fm.id as failure_mode_id,
    fm.item_function,
    fm.failure_mode,
    fm.sequence_number,
    fm.severity_rating,
    
    -- Calculate current RPN
    calculate_rpn(fm.id) as current_rpn,
    
    -- Effects
    string_agg(DISTINCT fe.effect_description, '; ') as effects,
    
    -- Causes  
    string_agg(DISTINCT fc.cause_description, '; ') as causes,
    MAX(fc.occurrence_rating) as max_occurrence_rating,
    
    -- Controls
    string_agg(DISTINCT fco.control_description, '; ') as controls,
    MAX(fco.detection_rating) as max_detection_rating,
    
    -- Action items count
    COUNT(DISTINCT fai.id) as action_items_count,
    COUNT(DISTINCT CASE WHEN fai.status = 'OPEN' THEN fai.id END) as open_action_items,
    
    -- Process flow linkage
    pf.name as process_flow_name,
    ps.name as primary_process_step_name
    
FROM fmeas f
JOIN failure_modes fm ON f.id = fm.fmea_id
LEFT JOIN failure_effects fe ON fm.id = fe.failure_mode_id
LEFT JOIN failure_causes fc ON fm.id = fc.failure_mode_id
LEFT JOIN failure_controls fco ON fc.id = fco.failure_cause_id
LEFT JOIN fmea_action_items fai ON fm.id = fai.failure_mode_id
LEFT JOIN process_flows pf ON f.process_flow_id = pf.id
LEFT JOIN process_steps ps ON fm.primary_process_step_id = ps.id

GROUP BY 
    f.id, f.fmea_number, f.title, f.status,
    fm.id, fm.item_function, fm.failure_mode, fm.sequence_number, fm.severity_rating,
    pf.name, ps.name;

-- High Risk Items View (RPN > threshold)
CREATE VIEW high_risk_fmea_items AS
SELECT 
    fav.*,
    f.rpn_threshold
FROM fmea_analysis_view fav
JOIN fmeas f ON fav.fmea_id = f.id
WHERE calculate_rpn(fav.failure_mode_id) > f.rpn_threshold;

-- Action Items Due View
CREATE VIEW fmea_action_items_due AS
SELECT 
    fai.*,
    fm.item_function,
    fm.failure_mode,
    f.fmea_number,
    f.title as fmea_title,
    u.first_name || ' ' || u.last_name as assigned_to_name
FROM fmea_action_items fai
JOIN failure_modes fm ON fai.failure_mode_id = fm.id
JOIN fmeas f ON fm.fmea_id = f.id
LEFT JOIN users u ON fai.assigned_to_id = u.id
WHERE fai.status IN ('OPEN', 'IN_PROGRESS')
AND (fai.target_date IS NULL OR fai.target_date <= CURRENT_DATE + INTERVAL '30 days');

COMMIT;