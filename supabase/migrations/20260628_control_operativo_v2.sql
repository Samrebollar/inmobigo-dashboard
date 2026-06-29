-- SQL Migration for Control Operativo v2.0
-- Safe, additive migrations only

-- 1. Add columns to existing tickets table
ALTER TABLE tickets 
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS reported_by_name TEXT,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
    ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- 2. Create team_tasks table
CREATE TABLE IF NOT EXISTS team_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    
    area TEXT NOT NULL, -- 'security', 'maintenance', 'cleaning', etc.
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_name TEXT, -- Desnormalizado
    
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL, -- 'security', 'maintenance', etc.
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    
    estimated_minutes INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date DATE,
    scheduled_at TIMESTAMPTZ,
    
    attachments TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    
    recurrence_rule TEXT, -- 'daily', 'weekly:1,5', 'monthly:15', etc.
    source_incident_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_team_tasks_org ON team_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_property ON team_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned ON team_tasks(assigned_to);

-- RLS for team_tasks
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization team tasks"
    ON team_tasks FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create organization team tasks"
    ON team_tasks FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update organization team tasks"
    ON team_tasks FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete organization team tasks"
    ON team_tasks FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));


-- 3. Create task_checklist_items table
CREATE TABLE IF NOT EXISTS task_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    label TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_by_name TEXT,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_task ON task_checklist_items(task_id);

-- RLS for task_checklist_items
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization checklist items"
    ON task_checklist_items FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage organization checklist items"
    ON task_checklist_items FOR ALL
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));


-- 4. Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization task comments"
    ON task_comments FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage organization task comments"
    ON task_comments FOR ALL
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));


-- 5. Create incident_comments table
CREATE TABLE IF NOT EXISTS incident_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_internal BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_comments_ticket ON incident_comments(ticket_id);

-- RLS for incident_comments
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization incident comments"
    ON incident_comments FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage organization incident comments"
    ON incident_comments FOR ALL
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));


-- 6. Create task_history table (for audits)
CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES team_tasks(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'reassign', 'start', 'complete', 'cancel', 'checklist_mark'
    details TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);

-- RLS for task_history
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization task history"
    ON task_history FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create organization task history"
    ON task_history FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid()));
