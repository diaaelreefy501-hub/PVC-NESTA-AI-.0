-- P0 Sequence Generators for Quotes and Contracts

CREATE OR REPLACE FUNCTION generate_document_number(
    doc_type text,
    p_company_id text,
    p_year text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seq_name text;
    next_val int;
    doc_prefix text;
BEGIN
    -- Determine prefix
    IF doc_type = 'quotation' THEN
        doc_prefix := 'Q-';
    ELSIF doc_type = 'contract' THEN
        doc_prefix := 'CTR-';
    ELSE
        doc_prefix := 'DOC-';
    END IF;

    -- Create a unique sequence name for this company and year
    seq_name := format('seq_%s_%s_%s', doc_type, replace(p_company_id, '-', '_'), p_year);

    -- Ensure sequence exists (this is safe to call concurrently with IF NOT EXISTS in PG 9.5+)
    -- Note: Creating sequences dynamically in a function requires EXECUTE.
    BEGIN
        EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I', seq_name);
    EXCEPTION WHEN duplicate_table THEN
        -- Ignore if it was just created by another transaction
    END;

    -- Get next value
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;

    -- Return formatted number e.g. Q-company-2026-0001
    -- Wait, user said: Q-NH-2026-0001 (using company prefix if available, but company ID is a UUID/string like 'company-123')
    -- Let's just use a padded 4 digit number.
    RETURN doc_prefix || upper(substring(p_company_id from 1 for 4)) || '-' || p_year || '-' || lpad(next_val::text, 4, '0');
END;
$$;
