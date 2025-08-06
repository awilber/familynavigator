-- Email Filtering System with Forensic-Grade Audit Trail
-- Migration 005: Master Email Address Filter Implementation

-- Core filter patterns with advanced matching
CREATE TABLE email_filter_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('exact', 'domain', 'wildcard', 'regex')),
  pattern_hash TEXT NOT NULL UNIQUE, -- SHA-256 for deduplication
  
  -- Scope configuration
  applies_to_fields TEXT NOT NULL DEFAULT 'from,to,cc,bcc', -- JSON array
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority patterns checked first
  
  -- Smart detection metadata
  auto_detected BOOLEAN DEFAULT false,
  confidence_score REAL DEFAULT 1.0,
  detection_method TEXT, -- 'user_input', 'frequency_analysis', 'contact_import'
  
  -- Usage analytics
  match_count INTEGER DEFAULT 0,
  last_matched_at DATETIME,
  false_positive_count INTEGER DEFAULT 0,
  
  -- Legal/forensic metadata
  legal_relevance TEXT DEFAULT 'medium' CHECK (legal_relevance IN ('high', 'medium', 'low')),
  retention_policy TEXT DEFAULT 'permanent',
  case_reference TEXT, -- Link to legal case/matter
  
  -- Audit trail
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Performance indexes for email_filter_patterns
CREATE INDEX idx_pattern_hash ON email_filter_patterns (pattern_hash);
CREATE INDEX idx_pattern_type ON email_filter_patterns (pattern_type);
CREATE INDEX idx_pattern_active ON email_filter_patterns (is_active, priority);
CREATE INDEX idx_pattern_legal ON email_filter_patterns (legal_relevance);
CREATE INDEX idx_pattern_usage ON email_filter_patterns (match_count DESC, last_matched_at DESC);

-- Email address frequency analysis for smart suggestions
CREATE TABLE email_address_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_address TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  
  -- Frequency data
  total_message_count INTEGER DEFAULT 0,
  incoming_count INTEGER DEFAULT 0,
  outgoing_count INTEGER DEFAULT 0,
  
  -- Temporal analysis
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  recent_activity_score REAL DEFAULT 0, -- Weighted recent activity
  
  -- Communication patterns
  avg_response_time_hours REAL,
  communication_frequency TEXT, -- 'daily', 'weekly', 'monthly', 'sporadic'
  
  -- Contact linking
  contact_id INTEGER REFERENCES contacts(id),
  display_name TEXT,
  
  -- Legal relevance scoring
  legal_importance_score REAL DEFAULT 0, -- 0-1 based on keywords, frequency
  case_relevance TEXT
);

-- Performance indexes for email_address_analytics
CREATE INDEX idx_email_freq ON email_address_analytics (total_message_count DESC);
CREATE INDEX idx_email_recent ON email_address_analytics (recent_activity_score DESC);
CREATE INDEX idx_email_legal ON email_address_analytics (legal_importance_score DESC);
CREATE INDEX idx_domain_analysis ON email_address_analytics (domain, total_message_count DESC);

-- Filter application audit trail (forensic compliance)
CREATE TABLE filter_application_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Operation details
  operation_type TEXT NOT NULL, -- 'sync_filter', 'display_filter', 'analysis_filter'
  filter_pattern_id INTEGER REFERENCES email_filter_patterns(id),
  
  -- Scope of application
  applied_to_table TEXT, -- 'communications', 'gmail_sync', 'analysis_view'
  record_count_affected INTEGER,
  
  -- Results
  matches_found INTEGER,
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_details TEXT,
  
  -- Forensic metadata
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_by TEXT NOT NULL,
  session_id TEXT, -- Link to sync/analysis session
  ip_address TEXT,
  user_agent TEXT,
  
  -- Legal compliance
  audit_required BOOLEAN DEFAULT false,
  retention_period INTEGER DEFAULT 7 -- Years to retain log
);

-- Performance indexes for filter_application_log
CREATE INDEX idx_filter_log_time ON filter_application_log (applied_at);
CREATE INDEX idx_filter_log_pattern ON filter_application_log (filter_pattern_id);
CREATE INDEX idx_filter_log_operation ON filter_application_log (operation_type, applied_at);

-- Filter configuration snapshots for rollback/audit
CREATE TABLE filter_configuration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  configuration_name TEXT NOT NULL,
  
  -- Complete filter state snapshot
  patterns_snapshot TEXT NOT NULL, -- JSON array of all active patterns
  settings_snapshot TEXT NOT NULL, -- JSON of filter settings
  
  -- Metadata
  total_patterns INTEGER,
  active_patterns INTEGER,
  estimated_match_rate REAL, -- Percentage of messages expected to match
  
  -- Change tracking
  change_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'bulk_import'
  change_description TEXT,
  previous_config_id INTEGER REFERENCES filter_configuration_history(id),
  
  -- Forensic tracking
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL,
  hash_signature TEXT NOT NULL -- SHA-256 of complete config for integrity
);

-- Performance indexes for filter_configuration_history
CREATE INDEX idx_config_history_time ON filter_configuration_history (created_at);
CREATE INDEX idx_config_history_user ON filter_configuration_history (created_by, created_at);

-- Real-time filter performance metrics
CREATE TABLE filter_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filter_pattern_id INTEGER REFERENCES email_filter_patterns(id),
  
  -- Performance data
  avg_match_time_ms REAL,
  total_evaluations INTEGER DEFAULT 0,
  successful_matches INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  
  -- Optimization data
  pattern_complexity_score INTEGER, -- 1-10 scale
  optimization_suggestions TEXT, -- JSON array
  
  -- Time window
  measurement_period_start DATETIME,
  measurement_period_end DATETIME,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for filter_performance_metrics
CREATE INDEX idx_perf_pattern ON filter_performance_metrics (filter_pattern_id);
CREATE INDEX idx_perf_time ON filter_performance_metrics (measurement_period_start, measurement_period_end);

-- Initialize with default configuration snapshot
INSERT INTO filter_configuration_history (
  configuration_name, 
  patterns_snapshot, 
  settings_snapshot, 
  total_patterns, 
  active_patterns,
  change_type,
  change_description,
  created_by,
  hash_signature
) VALUES (
  'Initial Setup',
  '[]',
  '{"sync_filtering_enabled": false, "display_filtering_enabled": false}',
  0,
  0,
  'create',
  'Initial filter system setup',
  'system_migration',
  '0000000000000000000000000000000000000000000000000000000000000000'
);