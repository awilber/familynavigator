-- Family Navigator Communications Database Schema
-- Secure, encrypted storage for Gmail and Messages data

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Contacts table - centralized contact management
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    display_name TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    metadata JSON, -- Additional contact information
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique primary identifiers
    UNIQUE(primary_email),
    UNIQUE(primary_phone)
);

-- Contact identifiers - multiple emails/phones per contact
CREATE TABLE contact_identifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    identifier_type TEXT NOT NULL, -- 'email', 'phone', 'name_variation'
    identifier_value TEXT NOT NULL,
    confidence_score REAL DEFAULT 1.0, -- AI confidence in this identifier
    verified BOOLEAN DEFAULT FALSE, -- User verified this identifier
    source TEXT, -- Where this identifier came from
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    UNIQUE(contact_id, identifier_type, identifier_value)
);

-- Communications table - unified storage for all communication types
CREATE TABLE communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL, -- 'gmail', 'messages'
    source_id TEXT, -- Original ID from source system
    contact_id INTEGER,
    direction TEXT NOT NULL, -- 'incoming', 'outgoing'
    timestamp DATETIME NOT NULL,
    subject TEXT, -- For emails, NULL for messages
    content TEXT, -- Message content (encrypted in production)
    content_type TEXT DEFAULT 'text', -- 'text', 'html', 'image', 'attachment'
    message_type TEXT, -- 'direct', 'third_party', 'group'
    confidence_score REAL DEFAULT 1.0, -- AI confidence this relates to contact
    third_party_source TEXT, -- For third-party emails (evite.com, etc.)
    thread_id TEXT, -- Conversation threading
    metadata JSON, -- Additional message metadata
    encrypted_data BLOB, -- Encrypted sensitive content
    checksum TEXT, -- Data integrity verification
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Ensure unique source messages
    UNIQUE(source, source_id)
);

-- Attachments table - handle email attachments and message media
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    communication_id INTEGER NOT NULL,
    filename TEXT,
    file_type TEXT,
    file_size INTEGER,
    file_path TEXT, -- Local encrypted storage path
    checksum TEXT, -- File integrity verification
    metadata JSON, -- EXIF, creation date, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (communication_id) REFERENCES communications(id) ON DELETE CASCADE
);

-- Processing jobs - track import and analysis progress
CREATE TABLE processing_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL, -- 'gmail_import', 'messages_import', 'analysis'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    source_info JSON, -- Source file or account information
    progress_current INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    progress_message TEXT,
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit log - track all database operations for legal compliance
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSON,
    new_values JSON,
    user_context TEXT, -- User or system performing operation
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT
);

-- Configuration table - app settings and encryption keys
CREATE TABLE app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_communications_timestamp ON communications(timestamp);
CREATE INDEX idx_communications_contact ON communications(contact_id);
CREATE INDEX idx_communications_source ON communications(source);
CREATE INDEX idx_communications_direction ON communications(direction);
CREATE INDEX idx_communications_type ON communications(message_type);
CREATE INDEX idx_communications_thread ON communications(thread_id);

CREATE INDEX idx_contact_identifiers_type ON contact_identifiers(identifier_type);
CREATE INDEX idx_contact_identifiers_value ON contact_identifiers(identifier_value);
CREATE INDEX idx_contact_identifiers_contact ON contact_identifiers(contact_id);

CREATE INDEX idx_attachments_communication ON attachments(communication_id);
CREATE INDEX idx_attachments_type ON attachments(file_type);

CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_processing_jobs_type ON processing_jobs(job_type);

CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- Full-text search for communications content
CREATE VIRTUAL TABLE communications_fts USING fts5(
    content,
    subject,
    content=communications,
    content_rowid=id
);

-- Triggers to maintain FTS index
CREATE TRIGGER communications_ai AFTER INSERT ON communications BEGIN
    INSERT INTO communications_fts(rowid, content, subject) 
    VALUES (new.id, new.content, new.subject);
END;

CREATE TRIGGER communications_ad AFTER DELETE ON communications BEGIN
    INSERT INTO communications_fts(communications_fts, rowid, content, subject) 
    VALUES('delete', old.id, old.content, old.subject);
END;

CREATE TRIGGER communications_au AFTER UPDATE ON communications BEGIN
    INSERT INTO communications_fts(communications_fts, rowid, content, subject) 
    VALUES('delete', old.id, old.content, old.subject);
    INSERT INTO communications_fts(rowid, content, subject) 
    VALUES (new.id, new.content, new.subject);
END;

-- Triggers for audit logging
CREATE TRIGGER audit_contacts_insert AFTER INSERT ON contacts BEGIN
    INSERT INTO audit_log (table_name, record_id, operation, new_values, user_context, session_id)
    VALUES ('contacts', new.id, 'INSERT', json_object(
        'name', new.name,
        'display_name', new.display_name,
        'primary_email', new.primary_email,
        'primary_phone', new.primary_phone
    ), 'system', 'session_id_placeholder');
END;

CREATE TRIGGER audit_communications_insert AFTER INSERT ON communications BEGIN
    INSERT INTO audit_log (table_name, record_id, operation, new_values, user_context, session_id)
    VALUES ('communications', new.id, 'INSERT', json_object(
        'source', new.source,
        'contact_id', new.contact_id,
        'direction', new.direction,
        'timestamp', new.timestamp,
        'message_type', new.message_type
    ), 'system', 'session_id_placeholder');
END;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_contacts_timestamp AFTER UPDATE ON contacts BEGIN
    UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

CREATE TRIGGER update_communications_timestamp AFTER UPDATE ON communications BEGIN
    UPDATE communications SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

CREATE TRIGGER update_processing_jobs_timestamp AFTER UPDATE ON processing_jobs BEGIN
    UPDATE processing_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

-- Initial configuration
INSERT INTO app_config (key, value, description) VALUES 
    ('schema_version', '1.0.0', 'Database schema version'),
    ('encryption_enabled', 'true', 'Whether encryption is enabled'),
    ('audit_retention_days', '365', 'Days to retain audit logs'),
    ('max_attachment_size', '104857600', 'Maximum attachment size in bytes (100MB)');

-- Create views for common queries
CREATE VIEW active_communications AS
SELECT 
    c.*,
    ct.name as contact_name,
    ct.display_name as contact_display_name
FROM communications c
LEFT JOIN contacts ct ON c.contact_id = ct.id
ORDER BY c.timestamp DESC;

CREATE VIEW contact_summary AS
SELECT 
    c.*,
    COUNT(comm.id) as message_count,
    MAX(comm.timestamp) as last_communication,
    MIN(comm.timestamp) as first_communication
FROM contacts c
LEFT JOIN communications comm ON c.id = comm.contact_id
GROUP BY c.id;

-- Comments for documentation
COMMENT ON TABLE contacts IS 'Central contact management with support for multiple identifiers';
COMMENT ON TABLE communications IS 'Unified storage for all communication types with encryption support';
COMMENT ON TABLE contact_identifiers IS 'Multiple email addresses, phone numbers, and name variations per contact';
COMMENT ON TABLE processing_jobs IS 'Track long-running import and analysis operations';
COMMENT ON TABLE audit_log IS 'Complete audit trail for legal compliance and security';