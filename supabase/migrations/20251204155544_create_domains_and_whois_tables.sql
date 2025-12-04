-- Create domains table
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, domain_name)
);

-- Create whois_records table
CREATE TABLE IF NOT EXISTS public.whois_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    whois_hash TEXT NOT NULL,
    whois_data JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create whois_changes table for tracking changes
CREATE TABLE IF NOT EXISTS public.whois_changes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    old_hash TEXT,
    new_hash TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_active ON public.domains(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whois_records_domain_id ON public.whois_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_whois_records_checked_at ON public.whois_records(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_whois_changes_domain_id ON public.whois_changes(domain_id);
CREATE INDEX IF NOT EXISTS idx_whois_changes_email_sent ON public.whois_changes(email_sent) WHERE email_sent = false;

-- Enable Row Level Security
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whois_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whois_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains table
CREATE POLICY "Users can view their own domains"
    ON public.domains FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains"
    ON public.domains FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
    ON public.domains FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
    ON public.domains FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for whois_records table
CREATE POLICY "Users can view whois records for their domains"
    ON public.whois_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.domains
            WHERE domains.id = whois_records.domain_id
            AND domains.user_id = auth.uid()
        )
    );

-- RLS Policies for whois_changes table
CREATE POLICY "Users can view whois changes for their domains"
    ON public.whois_changes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.domains
            WHERE domains.id = whois_changes.domain_id
            AND domains.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_domains_updated_at
    BEFORE UPDATE ON public.domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO authenticated;
GRANT SELECT ON public.whois_records TO authenticated;
GRANT SELECT ON public.whois_changes TO authenticated;
