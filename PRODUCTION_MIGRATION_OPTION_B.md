# Production Database Migration (Option B) - Manual SQL Application

This guide provides the SQL commands to manually apply the Device Groups and Deployment Templates schema changes to your production database when `npm run db:push` isn't accessible or you prefer manual control.

## Prerequisites

- Direct PostgreSQL access with sufficient permissions
- PostgreSQL 12+
- Backup of existing database (strongly recommended)

## Step 1: Backup Your Database (Critical)

```bash
# Using pg_dump
pg_dump -U your_user -h your_host -d your_database > bootah_backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Replit Connections if using Replit Database
# Use the Replit Database UI to export a backup
```

## Step 2: Connect to PostgreSQL

```bash
# Local or remote connection
psql -U bootah_user -h your_database_host -d bootah_database

# For Replit Database, use your DATABASE_URL
psql "postgresql://user:password@host:port/database"
```

## Step 3: Apply Schema Changes

Run these SQL statements in order. They add the new tables and columns needed for Device Groups and Deployment Templates features.

### 3A. Create Device Groups Table

```sql
-- Create device_groups table for organizing devices by project/location
CREATE TABLE IF NOT EXISTS device_groups (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  created_by varchar REFERENCES users(id),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_device_groups_created_by ON device_groups(created_by);
```

### 3B. Add Columns to Devices Table

```sql
-- Add tags column for flexible categorization
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add group_id to link devices to groups
ALTER TABLE devices ADD COLUMN IF NOT EXISTS group_id varchar REFERENCES device_groups(id) ON DELETE SET NULL;

-- Create index for faster filtering by group
CREATE INDEX IF NOT EXISTS idx_devices_group_id ON devices(group_id);
CREATE INDEX IF NOT EXISTS idx_devices_tags ON devices USING GIN(tags);
```

### 3C. Add Columns to Deployment Templates Table

```sql
-- Add imageId to save which image this template uses
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS image_id varchar REFERENCES images(id) ON DELETE SET NULL;

-- Add postDeploymentProfileId to save post-deployment configuration
ALTER TABLE deployment_templates ADD COLUMN IF NOT EXISTS post_deployment_profile_id varchar;

-- Create indexes for template lookups
CREATE INDEX IF NOT EXISTS idx_templates_image_id ON deployment_templates(image_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON deployment_templates(category);
```

### 3D. Verify Changes

```sql
-- Check device_groups table exists
\dt device_groups

-- Check devices table has new columns
\d devices

-- Check deployment_templates table has new columns
\d deployment_templates

-- Verify counts
SELECT COUNT(*) FROM device_groups;
SELECT COUNT(*) FROM devices;
SELECT COUNT(*) FROM deployment_templates;
```

## Step 4: Update Application

1. Restart your Bootah application to use the new schema
2. The application will automatically use the new Device Groups and Templates features
3. Existing devices and templates will continue to work

```bash
# Docker restart
docker-compose restart bootah

# Or Linux/bare metal
systemctl restart bootah
```

## Step 5: Verify in Application

1. Login to Bootah web interface
2. Check Device Groups page - should load without errors
3. Check Templates page - should load without errors
4. Create a test device group to confirm functionality

## Troubleshooting

### If foreign key errors occur:

```sql
-- Check for orphaned records
SELECT * FROM devices WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM device_groups);

-- Delete orphaned references if needed
DELETE FROM devices WHERE group_id IS NOT NULL AND group_id NOT IN (SELECT id FROM device_groups);
```

### If columns already exist:

The `ADD COLUMN IF NOT EXISTS` commands are safe and won't error if columns already exist. You can re-run them without issues.

### If you need to rollback:

```sql
-- Drop new columns
ALTER TABLE devices DROP COLUMN IF EXISTS tags;
ALTER TABLE devices DROP COLUMN IF EXISTS group_id;
ALTER TABLE deployment_templates DROP COLUMN IF EXISTS image_id;
ALTER TABLE deployment_templates DROP COLUMN IF EXISTS post_deployment_profile_id;

-- Drop new table
DROP TABLE IF EXISTS device_groups;
```

## For Database Services (Supabase, Render, etc.)

If using a managed PostgreSQL service:

1. Access your database through their admin console/SQL editor
2. Copy and paste each SQL section into the editor
3. Execute sequentially
4. Verify changes in their database browser

## For Docker Deployments

```bash
# Connect to database container
docker exec -it bootah-postgres psql -U bootah -d bootah

# Then paste the SQL commands above
```

## Support

If migrations fail:
1. Review the error message carefully
2. Check backup is valid
3. Restore from backup if needed
4. Contact support with error details
