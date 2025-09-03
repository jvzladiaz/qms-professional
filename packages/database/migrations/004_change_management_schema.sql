-- =====================================================
-- PHASE 4: CHANGE MANAGEMENT & VERSION CONTROL SCHEMA
-- =====================================================
-- Migration: 004_change_management_schema.sql
-- Description: Comprehensive change management system with version control,
--              audit trails, and compliance tracking for integrated QMS

-- Project Versions (Snapshot System)
CREATE TABLE project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    version_name VARCHAR(255),
    description TEXT,
    
    -- Version Control
    major_version INTEGER NOT NULL DEFAULT 1,
    minor_version INTEGER NOT NULL DEFAULT 0,
    patch_version INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Snapshot Data (JSON snapshots of entire project state)
    process_flow_snapshot JSONB,
    fmea_snapshot JSONB,
    control_plan_snapshot JSONB,
    
    -- Metadata
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    restored_from_version_id UUID REFERENCES project_versions(id),
    
    -- Change Summary
    total_process_steps INTEGER DEFAULT 0,
    total_failure_modes INTEGER DEFAULT 0,
    total_control_items INTEGER DEFAULT 0,
    total_rpn_score DECIMAL(10,2) DEFAULT 0,
    high_risk_items INTEGER DEFAULT 0,
    
    CONSTRAINT unique_project_version UNIQUE(project_id, version_number)
);

CREATE INDEX idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX idx_project_versions_created_at ON project_versions(created_at);
CREATE INDEX idx_project_versions_active ON project_versions(is_active, is_baseline);

-- Change Events (Real-time change tracking)
CREATE TABLE change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id UUID REFERENCES project_versions(id) ON DELETE SET NULL,
    
    -- Change Details
    entity_type VARCHAR(50) NOT NULL, -- 'PROCESS_STEP', 'FAILURE_MODE', 'CONTROL_ITEM'
    entity_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'
    change_action VARCHAR(255), -- Detailed action description
    
    -- Change Data
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Impact Analysis
    impact_level VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    affected_modules TEXT[], -- ['PROCESS_FLOW', 'FMEA', 'CONTROL_PLAN']
    propagation_required BOOLEAN DEFAULT FALSE,
    propagation_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    
    -- Workflow
    approval_required BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'AUTO_APPROVED', -- 'PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED'
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    triggered_by_id UUID NOT NULL REFERENCES users(id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Batch Processing
    batch_id UUID,
    is_batch_parent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_change_events_project_id ON change_events(project_id);
CREATE INDEX idx_change_events_entity ON change_events(entity_type, entity_id);
CREATE INDEX idx_change_events_triggered_at ON change_events(triggered_at);
CREATE INDEX idx_change_events_batch_id ON change_events(batch_id);
CREATE INDEX idx_change_events_propagation ON change_events(propagation_required, propagation_status);
CREATE INDEX idx_change_events_approval ON change_events(approval_required, approval_status);

-- Change Propagation Rules
CREATE TABLE change_propagation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger Conditions
    source_entity_type VARCHAR(50) NOT NULL,
    source_change_type VARCHAR(50) NOT NULL,
    source_field_patterns TEXT[], -- Field name patterns that trigger this rule
    
    -- Target Actions
    target_entity_type VARCHAR(50) NOT NULL,
    target_action VARCHAR(50) NOT NULL, -- 'UPDATE', 'CREATE', 'VALIDATE', 'NOTIFY'
    target_field_mappings JSONB, -- Field mapping rules
    
    -- Conditions
    conditions JSONB, -- Complex conditions for rule activation
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_propagation_rules_source ON change_propagation_rules(source_entity_type, source_change_type);
CREATE INDEX idx_propagation_rules_priority ON change_propagation_rules(priority, is_active);

-- Change Impact Analysis
CREATE TABLE change_impact_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_event_id UUID NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Impact Assessment
    impact_score DECIMAL(5,2), -- 0.00 to 10.00
    risk_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    affected_stakeholders TEXT[],
    estimated_effort_hours DECIMAL(6,2),
    
    -- Affected Items
    affected_process_steps JSONB,
    affected_failure_modes JSONB,
    affected_control_items JSONB,
    
    -- Dependencies
    dependent_changes UUID[], -- References to other change_events
    prerequisite_changes UUID[],
    blocking_issues TEXT[],
    
    -- Analysis Results
    risk_mitigation_actions TEXT[],
    recommended_approvers UUID[],
    testing_requirements TEXT[],
    
    -- Status
    analysis_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
    analysis_started_at TIMESTAMP WITH TIME ZONE,
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    analyzed_by_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_impact_analysis_change_event ON change_impact_analysis(change_event_id);
CREATE INDEX idx_impact_analysis_project_id ON change_impact_analysis(project_id);
CREATE INDEX idx_impact_analysis_risk_level ON change_impact_analysis(risk_level);

-- Change Notifications
CREATE TABLE change_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_event_id UUID NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- 'CHANGE_CREATED', 'APPROVAL_REQUIRED', 'IMPACT_HIGH', 'PROPAGATION_FAILED'
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Recipients
    recipient_user_id UUID REFERENCES users(id),
    recipient_role VARCHAR(50),
    recipient_department VARCHAR(100),
    
    -- Delivery
    delivery_method VARCHAR(20) DEFAULT 'IN_APP', -- 'IN_APP', 'EMAIL', 'SMS', 'WEBHOOK'
    delivery_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'
    
    -- Actions
    action_required BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    action_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_change_notifications_recipient ON change_notifications(recipient_user_id, is_read);
CREATE INDEX idx_change_notifications_project ON change_notifications(project_id);
CREATE INDEX idx_change_notifications_status ON change_notifications(delivery_status);
CREATE INDEX idx_change_notifications_created_at ON change_notifications(created_at);

-- Risk Analytics (Aggregated risk data)
CREATE TABLE risk_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Overall Risk Metrics
    total_failure_modes INTEGER DEFAULT 0,
    total_rpn_score DECIMAL(10,2) DEFAULT 0,
    average_rpn DECIMAL(6,2) DEFAULT 0,
    high_risk_items INTEGER DEFAULT 0, -- RPN > threshold
    critical_items INTEGER DEFAULT 0, -- RPN > critical threshold
    
    -- Risk Distribution
    low_risk_count INTEGER DEFAULT 0, -- RPN 1-49
    medium_risk_count INTEGER DEFAULT 0, -- RPN 50-99
    high_risk_count INTEGER DEFAULT 0, -- RPN 100-299
    critical_risk_count INTEGER DEFAULT 0, -- RPN 300+
    
    -- Control Effectiveness
    total_prevention_controls INTEGER DEFAULT 0,
    total_detection_controls INTEGER DEFAULT 0,
    control_effectiveness_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    
    -- Trend Data
    rpn_trend VARCHAR(20), -- 'IMPROVING', 'STABLE', 'WORSENING'
    rpn_change_percentage DECIMAL(5,2), -- Compared to previous period
    new_risks_added INTEGER DEFAULT 0,
    risks_mitigated INTEGER DEFAULT 0,
    
    -- Compliance Status
    compliance_score DECIMAL(5,2) DEFAULT 0, -- 0-100
    missing_controls INTEGER DEFAULT 0,
    overdue_actions INTEGER DEFAULT 0,
    incomplete_items INTEGER DEFAULT 0,
    
    -- Process-Level Breakdown
    process_risk_breakdown JSONB, -- Risk by process step
    failure_mode_categories JSONB, -- Risk by failure category
    control_type_distribution JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_risk_analytics_project_date ON risk_analytics(project_id, analysis_date);
CREATE INDEX idx_risk_analytics_date ON risk_analytics(analysis_date);
CREATE INDEX idx_risk_analytics_compliance ON risk_analytics(compliance_score);

-- Change Approval Workflows
CREATE TABLE change_approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Workflow Configuration
    trigger_conditions JSONB, -- When this workflow is triggered
    approval_steps JSONB, -- Array of approval step configurations
    parallel_approval BOOLEAN DEFAULT FALSE,
    auto_approve_conditions JSONB,
    
    -- Timeouts and Escalation
    default_timeout_hours INTEGER DEFAULT 48,
    escalation_rules JSONB,
    emergency_bypass_roles TEXT[],
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_workflows_project ON change_approval_workflows(project_id, is_active);

-- Change Approvals (Individual approval instances)
CREATE TABLE change_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_event_id UUID NOT NULL REFERENCES change_events(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES change_approval_workflows(id),
    
    -- Approval Details
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255),
    approver_role VARCHAR(50),
    approver_user_id UUID REFERENCES users(id),
    
    -- Status
    approval_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED', 'BYPASSED'
    decision_date TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    
    -- Timing
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_approvals_change_event ON change_approvals(change_event_id);
CREATE INDEX idx_change_approvals_approver ON change_approvals(approver_user_id, approval_status);
CREATE INDEX idx_change_approvals_due_date ON change_approvals(due_date, approval_status);

-- User Activity Tracking
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'APPROVE'
    entity_type VARCHAR(50), -- What was accessed/modified
    entity_id UUID,
    description TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    
    -- Timing
    duration_ms INTEGER, -- How long the action took
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id, timestamp);
CREATE INDEX idx_user_activity_project ON user_activity_logs(project_id, timestamp);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type, timestamp);

-- Compliance Reports
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Report Details
    report_type VARCHAR(50) NOT NULL, -- 'AIAG_VDA', 'ISO_9001', 'TS_16949', 'CUSTOM'
    report_name VARCHAR(255) NOT NULL,
    standard_version VARCHAR(50),
    
    -- Assessment Results
    overall_compliance_score DECIMAL(5,2), -- 0-100
    compliance_level VARCHAR(20), -- 'NON_COMPLIANT', 'PARTIAL', 'COMPLIANT', 'EXEMPLARY'
    
    -- Detailed Assessment
    requirement_assessments JSONB, -- Array of requirement assessments
    non_conformances JSONB, -- Array of non-conformance items
    recommendations JSONB, -- Array of improvement recommendations
    
    -- Evidence
    evidence_items JSONB, -- References to supporting documentation
    audit_trail_summary JSONB,
    
    -- Status
    report_status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED'
    generated_by_id UUID NOT NULL REFERENCES users(id),
    reviewed_by_id UUID REFERENCES users(id),
    approved_by_id UUID REFERENCES users(id),
    
    -- Timing
    assessment_period_start DATE,
    assessment_period_end DATE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    next_assessment_due DATE
);

CREATE INDEX idx_compliance_reports_project ON compliance_reports(project_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type, report_status);
CREATE INDEX idx_compliance_reports_due_date ON compliance_reports(next_assessment_due);

-- Dashboard Configurations
CREATE TABLE dashboard_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Dashboard Settings
    dashboard_name VARCHAR(255) NOT NULL DEFAULT 'My Dashboard',
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    -- Layout Configuration
    layout_config JSONB NOT NULL, -- Widget layout and configuration
    refresh_interval INTEGER DEFAULT 300, -- Seconds
    
    -- Filters and Preferences
    default_filters JSONB,
    date_range_preference VARCHAR(20) DEFAULT '30_DAYS',
    chart_preferences JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboard_configs_user ON dashboard_configurations(user_id, is_default);
CREATE INDEX idx_dashboard_configs_project ON dashboard_configurations(project_id);

-- Performance Metrics (System-wide analytics)
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- System Usage
    total_active_projects INTEGER DEFAULT 0,
    total_active_users INTEGER DEFAULT 0,
    total_changes_today INTEGER DEFAULT 0,
    total_risk_items INTEGER DEFAULT 0,
    
    -- Performance Metrics
    average_response_time_ms DECIMAL(8,2),
    change_processing_time_avg DECIMAL(8,2),
    notification_delivery_rate DECIMAL(5,2),
    
    -- Quality Metrics
    system_availability_percentage DECIMAL(5,2),
    error_rate_percentage DECIMAL(5,2),
    user_satisfaction_score DECIMAL(3,2),
    
    -- Business Metrics
    risk_reduction_percentage DECIMAL(5,2),
    compliance_improvement_percentage DECIMAL(5,2),
    change_approval_rate DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_system_metrics_date ON system_metrics(metric_date);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to create project snapshot
CREATE OR REPLACE FUNCTION create_project_snapshot(
    p_project_id UUID,
    p_version_name VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_created_by_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_version_number VARCHAR;
    v_process_flow_data JSONB;
    v_fmea_data JSONB;
    v_control_plan_data JSONB;
BEGIN
    -- Generate version number
    SELECT COALESCE(MAX(major_version), 0) + 1 INTO v_version_number
    FROM project_versions WHERE project_id = p_project_id;
    
    -- Capture process flow snapshot
    SELECT jsonb_agg(
        jsonb_build_object(
            'processFlow', pf.*,
            'processSteps', ps_data.steps,
            'connections', conn_data.connections
        )
    ) INTO v_process_flow_data
    FROM process_flows pf
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(ps.*) as steps
        FROM process_steps ps
        WHERE ps.process_flow_id = pf.id
    ) ps_data ON true
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(sc.*) as connections
        FROM step_connections sc
        WHERE sc.process_flow_id = pf.id
    ) conn_data ON true
    WHERE pf.project_id = p_project_id;
    
    -- Capture FMEA snapshot
    SELECT jsonb_agg(
        jsonb_build_object(
            'fmea', f.*,
            'failureModes', fm_data.modes
        )
    ) INTO v_fmea_data
    FROM fmeas f
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'failureMode', fm.*,
                'effects', fe_data.effects,
                'causes', fc_data.causes
            )
        ) as modes
        FROM failure_modes fm
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(fe.*) as effects
            FROM failure_effects fe WHERE fe.failure_mode_id = fm.id
        ) fe_data ON true
        LEFT JOIN LATERAL (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'cause', fc.*,
                    'controls', fctrl_data.controls
                )
            ) as causes
            FROM failure_causes fc
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(fctrl.*) as controls
                FROM failure_controls fctrl WHERE fctrl.failure_cause_id = fc.id
            ) fctrl_data ON true
            WHERE fc.failure_mode_id = fm.id
        ) fc_data ON true
        WHERE fm.fmea_id = f.id
    ) fm_data ON true
    WHERE f.project_id = p_project_id;
    
    -- Capture control plan snapshot
    SELECT jsonb_agg(
        jsonb_build_object(
            'controlPlan', cp.*,
            'items', cpi_data.items
        )
    ) INTO v_control_plan_data
    FROM control_plans cp
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(cpi.*) as items
        FROM control_plan_items cpi
        WHERE cpi.control_plan_id = cp.id
    ) cpi_data ON true
    WHERE cp.project_id = p_project_id;
    
    -- Create version record
    INSERT INTO project_versions (
        project_id,
        version_number,
        version_name,
        description,
        process_flow_snapshot,
        fmea_snapshot,
        control_plan_snapshot,
        created_by_id
    ) VALUES (
        p_project_id,
        v_version_number || '.0.0',
        COALESCE(p_version_name, 'Version ' || v_version_number),
        p_description,
        v_process_flow_data,
        v_fmea_data,
        v_control_plan_data,
        p_created_by_id
    ) RETURNING id INTO v_version_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate risk analytics
CREATE OR REPLACE FUNCTION calculate_risk_analytics(p_project_id UUID, p_analysis_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    v_total_failure_modes INTEGER;
    v_total_rpn DECIMAL(10,2);
    v_avg_rpn DECIMAL(6,2);
    v_high_risk INTEGER;
    v_critical INTEGER;
    v_low_risk INTEGER;
    v_medium_risk INTEGER;
    v_high_risk_count INTEGER;
    v_critical_risk_count INTEGER;
BEGIN
    -- Calculate overall metrics
    SELECT 
        COUNT(*),
        SUM(COALESCE(rpn_calc.rpn, 0)),
        AVG(COALESCE(rpn_calc.rpn, 0))
    INTO v_total_failure_modes, v_total_rpn, v_avg_rpn
    FROM failure_modes fm
    JOIN fmeas f ON fm.fmea_id = f.id
    LEFT JOIN LATERAL (
        SELECT fm.severity_rating * fc.occurrence_rating * fctrl.detection_rating as rpn
        FROM failure_causes fc
        JOIN failure_controls fctrl ON fc.id = fctrl.failure_cause_id
        WHERE fc.failure_mode_id = fm.id
        ORDER BY (fm.severity_rating * fc.occurrence_rating * fctrl.detection_rating) DESC
        LIMIT 1
    ) rpn_calc ON true
    WHERE f.project_id = p_project_id;
    
    -- Calculate risk distribution
    SELECT 
        COUNT(*) FILTER (WHERE rpn_calc.rpn BETWEEN 1 AND 49),
        COUNT(*) FILTER (WHERE rpn_calc.rpn BETWEEN 50 AND 99),
        COUNT(*) FILTER (WHERE rpn_calc.rpn BETWEEN 100 AND 299),
        COUNT(*) FILTER (WHERE rpn_calc.rpn >= 300)
    INTO v_low_risk, v_medium_risk, v_high_risk_count, v_critical_risk_count
    FROM failure_modes fm
    JOIN fmeas f ON fm.fmea_id = f.id
    LEFT JOIN LATERAL (
        SELECT fm.severity_rating * fc.occurrence_rating * fctrl.detection_rating as rpn
        FROM failure_causes fc
        JOIN failure_controls fctrl ON fc.id = fctrl.failure_cause_id
        WHERE fc.failure_mode_id = fm.id
        ORDER BY (fm.severity_rating * fc.occurrence_rating * fctrl.detection_rating) DESC
        LIMIT 1
    ) rpn_calc ON true
    WHERE f.project_id = p_project_id;
    
    -- Insert or update risk analytics
    INSERT INTO risk_analytics (
        project_id,
        analysis_date,
        total_failure_modes,
        total_rpn_score,
        average_rpn,
        high_risk_items,
        critical_items,
        low_risk_count,
        medium_risk_count,
        high_risk_count,
        critical_risk_count
    ) VALUES (
        p_project_id,
        p_analysis_date,
        v_total_failure_modes,
        v_total_rpn,
        v_avg_rpn,
        v_high_risk_count + v_critical_risk_count,
        v_critical_risk_count,
        v_low_risk,
        v_medium_risk,
        v_high_risk_count,
        v_critical_risk_count
    ) ON CONFLICT (project_id, analysis_date) 
    DO UPDATE SET
        total_failure_modes = EXCLUDED.total_failure_modes,
        total_rpn_score = EXCLUDED.total_rpn_score,
        average_rpn = EXCLUDED.average_rpn,
        high_risk_items = EXCLUDED.high_risk_items,
        critical_items = EXCLUDED.critical_items,
        low_risk_count = EXCLUDED.low_risk_count,
        medium_risk_count = EXCLUDED.medium_risk_count,
        high_risk_count = EXCLUDED.high_risk_count,
        critical_risk_count = EXCLUDED.critical_risk_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default change propagation rules
INSERT INTO change_propagation_rules (rule_name, description, source_entity_type, source_change_type, target_entity_type, target_action, priority) VALUES
('Process Step Update -> FMEA Review', 'When a process step is updated, flag related FMEA items for review', 'PROCESS_STEP', 'UPDATE', 'FAILURE_MODE', 'VALIDATE', 100),
('FMEA Control Update -> Control Plan Sync', 'When FMEA controls are updated, sync with control plan items', 'FAILURE_CONTROL', 'UPDATE', 'CONTROL_ITEM', 'UPDATE', 90),
('High RPN -> Notification', 'When RPN exceeds threshold, notify stakeholders', 'FAILURE_MODE', 'UPDATE', 'NOTIFICATION', 'CREATE', 80),
('Process Step Delete -> Cascade Review', 'When process step is deleted, review dependent items', 'PROCESS_STEP', 'DELETE', 'FAILURE_MODE', 'VALIDATE', 95);

-- Insert default compliance report templates
INSERT INTO compliance_reports (project_id, report_type, report_name, standard_version, overall_compliance_score, compliance_level, requirement_assessments, generated_by_id)
SELECT 
    p.id,
    'AIAG_VDA',
    'AIAG-VDA FMEA Compliance Assessment',
    '1st Edition June 2019',
    85.00,
    'COMPLIANT',
    '[
        {"requirement": "FMEA Structure", "status": "COMPLIANT", "score": 90},
        {"requirement": "Risk Assessment", "status": "COMPLIANT", "score": 85},
        {"requirement": "Control Plan Integration", "status": "COMPLIANT", "score": 80}
    ]'::jsonb,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM compliance_reports cr WHERE cr.project_id = p.id AND cr.report_type = 'AIAG_VDA');

COMMENT ON TABLE project_versions IS 'Version control system capturing complete project snapshots';
COMMENT ON TABLE change_events IS 'Real-time change tracking for all QMS entities';
COMMENT ON TABLE change_impact_analysis IS 'Impact analysis results for change events';
COMMENT ON TABLE risk_analytics IS 'Aggregated risk metrics and analytics data';
COMMENT ON TABLE compliance_reports IS 'Automotive industry compliance assessment reports';