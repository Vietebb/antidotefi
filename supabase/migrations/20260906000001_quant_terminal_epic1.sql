-- =============================================================================
-- QUANT TERMINAL - EPIC 1 MIGRATION
-- Safe additive migration: Isolated from existing tables (e.g. plate_reads)
-- =============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Public Users Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_chat_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.users IS 'Quant Terminal users mapped to Supabase auth.users';
COMMENT ON COLUMN public.users.telegram_chat_id IS '64-bit Telegram chat ID stored as text to avoid JS integer precision truncation';

-- 3. Paper Wallets Table
CREATE TABLE IF NOT EXISTS public.paper_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    asset_symbol TEXT NOT NULL,
    balance NUMERIC(24, 8) NOT NULL DEFAULT 0.00000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_asset UNIQUE (user_id, asset_symbol),
    CONSTRAINT positive_or_zero_balance CHECK (balance >= 0)
);

COMMENT ON TABLE public.paper_wallets IS 'User paper trading balances. New users receive 100,000 fake USD via trigger';

-- 4. Trade History Table
CREATE TABLE IF NOT EXISTS public.trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    asset_symbol TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
    amount NUMERIC(24, 8) NOT NULL CHECK (amount > 0),
    price NUMERIC(24, 8) NOT NULL CHECK (price > 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.trade_history IS 'Execution audit log for simulated market orders';

-- 5. RAG Memory Table (pgvector 768-dim for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS public.rag_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.rag_memory IS 'Semantic market knowledge base with 768-dim embeddings';

-- Indexes for Query Acceleration
CREATE INDEX IF NOT EXISTS idx_paper_wallets_user ON public.paper_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_user ON public.trade_history(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_timestamp ON public.trade_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rag_memory_embedding_hnsw 
    ON public.rag_memory 
    USING hnsw (embedding vector_cosine_ops);

-- =============================================================================
-- AUTOMATED PROVISIONING TRIGGERS: Default New Users to $100,000 USD
-- =============================================================================

-- Step A: Sync auth.users -> public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- Step B: Automatically seed $100,000 USD fake balance upon user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.paper_wallets (user_id, asset_symbol, balance)
    VALUES (NEW.id, 'USD', 100000.00000000)
    ON CONFLICT (user_id, asset_symbol) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created_init_wallet ON public.users;
CREATE TRIGGER on_user_created_init_wallet
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_wallet();

-- =============================================================================
-- RAG SIMILARITY SEARCH RPC
-- =============================================================================
CREATE OR REPLACE FUNCTION public.match_rag_memory(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rm.id,
        rm.content,
        rm.metadata,
        1 - (rm.embedding <=> query_embedding) AS similarity
    FROM public.rag_memory rm
    WHERE 1 - (rm.embedding <=> query_embedding) > match_threshold
    ORDER BY rm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_memory ENABLE ROW LEVEL SECURITY;

-- Policies for public.users
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access on users"
    ON public.users FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policies for public.paper_wallets
CREATE POLICY "Users can view own paper wallets"
    ON public.paper_wallets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paper wallets"
    ON public.paper_wallets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paper wallets"
    ON public.paper_wallets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on paper_wallets"
    ON public.paper_wallets FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policies for public.trade_history
CREATE POLICY "Users can view own trade history"
    ON public.trade_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can record own trade history"
    ON public.trade_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on trade_history"
    ON public.trade_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policies for public.rag_memory
CREATE POLICY "Authenticated users can query rag_memory"
    ON public.rag_memory FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Service role full access on rag_memory"
    ON public.rag_memory FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
