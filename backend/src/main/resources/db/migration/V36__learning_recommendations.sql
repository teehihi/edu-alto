-- V36: Schema for zero-LLM personalized course & learning recommendation engine (EDU-129)

CREATE TABLE IF NOT EXISTS user_learning_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_level VARCHAR(40),
    learning_goal VARCHAR(500),
    weekly_target_hours INTEGER,
    personalization_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_learning_pref_level CHECK (
        preferred_level IS NULL OR preferred_level IN ('ALL_LEVELS', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED')
    ),
    CONSTRAINT chk_user_learning_pref_hours CHECK (
        weekly_target_hours IS NULL OR (weekly_target_hours >= 1 AND weekly_target_hours <= 80)
    )
);

CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    signal_type VARCHAR(50) NOT NULL,
    source_id UUID,
    signal_weight DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_learning_signal_type CHECK (
        signal_type IN (
            'COURSE_VIEWED',
            'COURSE_WISHLISTED',
            'COURSE_UNWISHLISTED',
            'COURSE_ENROLLED',
            'LESSON_COMPLETED',
            'QUIZ_SUBMITTED',
            'ASSIGNMENT_GRADED',
            'COURSE_COMPLETED',
            'PREFERENCES_UPDATED',
            'RECOMMENDATION_CLICKED',
            'RECOMMENDATION_DISMISSED'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_learning_signals_source_type
    ON learning_signals(source_id, signal_type)
    WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_signals_user_time
    ON learning_signals(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_signals_course_time
    ON learning_signals(course_id, occurred_at DESC)
    WHERE course_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recommendation_snapshots (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_scope VARCHAR(30) NOT NULL,
    context_course_id UUID,
    algorithm_version VARCHAR(50) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rec_snapshot_scope CHECK (
        recommendation_scope IN ('COURSE', 'LEARNING_NEXT')
    )
);

CREATE INDEX IF NOT EXISTS idx_rec_snapshots_lookup
    ON recommendation_snapshots(user_id, recommendation_scope, stale, expires_at DESC);

CREATE TABLE IF NOT EXISTS recommendation_items (
    id UUID PRIMARY KEY,
    snapshot_id UUID NOT NULL REFERENCES recommendation_snapshots(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    course_id UUID NOT NULL,
    lesson_id UUID,
    rank_position INTEGER NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    tier VARCHAR(40) NOT NULL,
    reason_code VARCHAR(50) NOT NULL,
    reason_text VARCHAR(500) NOT NULL,
    estimated_minutes INTEGER,
    target_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rec_item_type CHECK (
        item_type IN ('COURSE', 'LESSON', 'QUIZ_REVIEW')
    ),
    CONSTRAINT chk_rec_item_rank CHECK (rank_position >= 1)
);

CREATE INDEX IF NOT EXISTS idx_rec_items_snapshot_rank
    ON recommendation_items(snapshot_id, rank_position ASC);

CREATE TABLE IF NOT EXISTS recommendation_feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES recommendation_snapshots(id) ON DELETE SET NULL,
    recommendation_item_id UUID REFERENCES recommendation_items(id) ON DELETE SET NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id UUID NOT NULL,
    feedback_type VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rec_feedback_target_type CHECK (
        target_type IN ('COURSE', 'LESSON', 'QUIZ_REVIEW')
    ),
    CONSTRAINT chk_rec_feedback_type CHECK (
        feedback_type IN ('CLICKED', 'STARTED', 'DISMISSED', 'HELPFUL')
    )
);

CREATE INDEX IF NOT EXISTS idx_rec_feedbacks_user_target
    ON recommendation_feedbacks(user_id, target_type, target_id, created_at DESC);

-- Seed RBAC permissions for recommendation & preference endpoints
INSERT INTO permissions (name, api_path, method, module, description)
VALUES
    ('VIEW_LEARNING_PREFERENCES', '/api/v1/me/learning-preferences', 'GET', 'STUDENT', 'Xem sở thích và mục tiêu học tập cá nhân'),
    ('UPDATE_LEARNING_PREFERENCES', '/api/v1/me/learning-preferences', 'PUT', 'STUDENT', 'Cập nhật sở thích và mục tiêu học tập cá nhân'),
    ('VIEW_NEXT_LEARNING_RECOMMENDATIONS', '/api/v1/me/recommendations/learning', 'GET', 'STUDENT', 'Xem gợi ý bài học và ôn tập tiếp theo'),
    ('SUBMIT_RECOMMENDATION_FEEDBACK', '/api/v1/me/recommendations/feedback', 'POST', 'STUDENT', 'Gửi phản hồi tương tác với gợi ý học tập'),
    ('RECORD_COURSE_VIEW_SIGNAL', '/api/v1/me/recommendations/signals/course-view', 'POST', 'STUDENT', 'Ghi nhận tín hiệu xem chi tiết khóa học')
ON CONFLICT (api_path, method) DO UPDATE SET
    name = EXCLUDED.name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('STUDENT', 'INSTRUCTOR', 'ADMIN')
  AND p.api_path IN (
      '/api/v1/me/learning-preferences',
      '/api/v1/me/recommendations/learning',
      '/api/v1/me/recommendations/feedback',
      '/api/v1/me/recommendations/signals/course-view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
