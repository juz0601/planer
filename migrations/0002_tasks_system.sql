-- Migration 0002: Multi-user task management system
-- Creates tables for users, tasks, tags, recurrence, sharing, and friendships

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,              -- Firebase UID
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,            -- owner of the task
    title TEXT NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    deadline_datetime DATETIME,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT CHECK(status IN ('planned', 'in_progress', 'done', 'skipped', 'canceled')) DEFAULT 'planned',
    is_recurring BOOLEAN DEFAULT 0,
    recurrence_rule_id TEXT,
    is_archived BOOLEAN DEFAULT 0,    -- soft delete
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recurrence_rule_id) REFERENCES recurrence_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_datetime ON tasks(start_datetime);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);

-- ============================================================
-- TAGS TABLE (individual per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,            -- owner of the tag
    name TEXT NOT NULL,
    color TEXT DEFAULT '#1976d2',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)             -- unique tag name per user
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- ============================================================
-- TASK_TAGS TABLE (many-to-many relationship)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- ============================================================
-- RECURRENCE_RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS recurrence_rules (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom', 'workdays', 'weekends')) NOT NULL,
    interval INTEGER DEFAULT 1,       -- every N days/weeks/months
    days_of_week TEXT,                -- JSON array [0,1,2,3,4,5,6] for weekly
    day_of_month INTEGER,             -- for monthly recurrence
    end_type TEXT CHECK(end_type IN ('never', 'date', 'count')) DEFAULT 'never',
    end_date DATETIME,
    end_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TASK_INSTANCES TABLE (for recurring tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_instances (
    id TEXT PRIMARY KEY,
    parent_task_id TEXT NOT NULL,     -- reference to parent task
    scheduled_date DATETIME NOT NULL,
    status TEXT CHECK(status IN ('planned', 'in_progress', 'done', 'skipped', 'canceled')) DEFAULT 'planned',
    is_modified BOOLEAN DEFAULT 0,    -- whether instance was individually modified
    modified_title TEXT,
    modified_description TEXT,
    modified_time TIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_instances_parent_id ON task_instances(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_instances_scheduled_date ON task_instances(scheduled_date);

-- ============================================================
-- TASK_SHARES TABLE (sharing tasks with friends)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_shares (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,           -- who shared the task
    shared_with_id TEXT NOT NULL,     -- who received the share
    permission TEXT CHECK(permission IN ('view', 'edit')) DEFAULT 'view',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(task_id, shared_with_id)
);

CREATE INDEX IF NOT EXISTS idx_task_shares_task_id ON task_shares(task_id);
CREATE INDEX IF NOT EXISTS idx_task_shares_shared_with_id ON task_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_task_shares_owner_id ON task_shares(owner_id);

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================================
-- TASK_HISTORY TABLE (change tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,            -- who made the change
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_at ON task_history(changed_at);










