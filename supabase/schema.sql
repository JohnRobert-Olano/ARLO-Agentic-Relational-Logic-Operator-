-- Multi-Tenant Database Schema for ARLO

-- 1. Finances Table (Income & Expense tracking)
CREATE TABLE IF NOT EXISTS finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Expense', 'Gross Income')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Checklist Table (Task list)
CREATE TABLE IF NOT EXISTS checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Schedules Table (Calendar time-blocks)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_end_after_start CHECK (end_time >= start_time)
);

-- 4. Speed & Search Indexes
CREATE INDEX IF NOT EXISTS idx_finances_user_type ON finances(user_id, type);
CREATE INDEX IF NOT EXISTS idx_finances_user_created ON finances(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_checklist_user_status ON checklist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_checklist_user_due ON checklist(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_schedules_user_range ON schedules(user_id, start_time, end_time);

-- 5. Grant Permissions to Postgres Roles
-- Ensures the PostgREST server has access to query and write to the tables.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE finances TO anon, authenticated, service_role;
GRANT ALL ON TABLE checklist TO anon, authenticated, service_role;
GRANT ALL ON TABLE schedules TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- 7. Strict RLS Access Policies (Users can only manage their own data)
DROP POLICY IF EXISTS "Users can manage their own finances" ON finances;
CREATE POLICY "Users can manage their own finances" 
    ON finances 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own checklist" ON checklist;
CREATE POLICY "Users can manage their own checklist" 
    ON checklist 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own schedules" ON schedules;
CREATE POLICY "Users can manage their own schedules" 
    ON schedules 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 8. Enable Realtime Subscriptions for Dashboard Synchronization
-- Uses PL/pgSQL block to check membership and avoid "already member" errors.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_publication p ON p.oid = pr.prpubid
            JOIN pg_class c ON c.oid = pr.prrelid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'finances'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE finances;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_publication p ON p.oid = pr.prpubid
            JOIN pg_class c ON c.oid = pr.prrelid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'checklist'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE checklist;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_rel pr
            JOIN pg_publication p ON p.oid = pr.prpubid
            JOIN pg_class c ON c.oid = pr.prrelid
            WHERE p.pubname = 'supabase_realtime' AND c.relname = 'schedules'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE schedules;
        END IF;
    END IF;
END $$;

-- 9. Get Financial Summary RPC
-- Can be called via Supabase REST API (RPC endpoint)
CREATE OR REPLACE FUNCTION get_financial_summary(
    p_user_id UUID,
    p_timeframe TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_search_term TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_total_income NUMERIC;
    v_total_expense NUMERIC;
    v_net_balance NUMERIC;
    v_matching_transactions JSON;
BEGIN
    -- Determine date range based on timeframe
    IF p_timeframe ILIKE 'today' THEN
        v_start_date := date_trunc('day', NOW() AT TIME ZONE 'Asia/Manila');
        v_end_date := v_start_date + interval '1 day' - interval '1 second';
    ELSIF p_timeframe ILIKE 'this_week' THEN
        v_start_date := date_trunc('week', NOW() AT TIME ZONE 'Asia/Manila');
        v_end_date := v_start_date + interval '1 week' - interval '1 second';
    ELSIF p_timeframe ILIKE 'this_month' THEN
        v_start_date := date_trunc('month', NOW() AT TIME ZONE 'Asia/Manila');
        v_end_date := v_start_date + interval '1 month' - interval '1 second';
    ELSIF p_timeframe ILIKE 'last_month' THEN
        v_start_date := date_trunc('month', NOW() AT TIME ZONE 'Asia/Manila') - interval '1 month';
        v_end_date := date_trunc('month', NOW() AT TIME ZONE 'Asia/Manila') - interval '1 second';
    ELSIF p_timeframe ILIKE 'weekend' THEN
        -- Rough approximation for the upcoming/current weekend
        v_start_date := date_trunc('week', NOW() AT TIME ZONE 'Asia/Manila') + interval '5 days';
        v_end_date := v_start_date + interval '2 days' - interval '1 second';
    ELSE
        -- Default to all time if not specified
        v_start_date := '1970-01-01'::TIMESTAMPTZ;
        v_end_date := '2099-12-31'::TIMESTAMPTZ;
    END IF;

    -- Calculate Totals
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'Gross Income'), 0),
        COALESCE(SUM(amount) FILTER (WHERE type = 'Expense'), 0)
    INTO v_total_income, v_total_expense
    FROM finances
    WHERE user_id = p_user_id
      AND created_at BETWEEN v_start_date AND v_end_date
      AND (p_category IS NULL OR p_category ILIKE 'ALL' OR category ILIKE p_category)
      AND (p_search_term IS NULL OR description ILIKE '%' || p_search_term || '%');

    v_net_balance := v_total_income - v_total_expense;

    -- Get top 10 matching transactions
    SELECT json_agg(row_to_json(t)) INTO v_matching_transactions
    FROM (
        SELECT id, type, amount, category, description, created_at
        FROM finances
        WHERE user_id = p_user_id
          AND created_at BETWEEN v_start_date AND v_end_date
          AND (p_category IS NULL OR p_category ILIKE 'ALL' OR category ILIKE p_category)
          AND (p_search_term IS NULL OR description ILIKE '%' || p_search_term || '%')
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    -- Return as JSON
    RETURN json_build_object(
        'total_income', v_total_income,
        'total_expense', v_total_expense,
        'net_balance', v_net_balance,
        'timeframe', p_timeframe,
        'category_filter', p_category,
        'search_term', p_search_term,
        'transactions', COALESCE(v_matching_transactions, '[]'::JSON)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
