-- Initialize QMS Automotive Database
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE qms_automotive_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set default timezone
SET timezone = 'UTC';

-- Create schema for application
CREATE SCHEMA IF NOT EXISTS qms;

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON SCHEMA qms TO qms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA qms TO qms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA qms TO qms_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA qms GRANT ALL ON TABLES TO qms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA qms GRANT ALL ON SEQUENCES TO qms_user;