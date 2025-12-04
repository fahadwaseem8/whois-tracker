import { createClient } from '@/lib/supabase/server';
import { fetchWhoisData, hashWhoisData } from '@/lib/whois';
import { NextResponse } from 'next/server';

// POST - Manually trigger WHOIS check for a specific domain
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify domain belongs to user and get domain name
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Fetch WHOIS data
    const whoisData = await fetchWhoisData(domain.domain_name);
    const whoisHash = hashWhoisData(whoisData);

    // Insert new WHOIS record
    const { data: newRecord, error: insertError } = await supabase
      .from('whois_records')
      .insert({
        domain_id: id,
        whois_hash: whoisHash,
        whois_data: whoisData,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Update last_checked timestamp on domain
    await supabase
      .from('domains')
      .update({ last_checked: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'WHOIS data fetched successfully',
      record: {
        id: newRecord.id,
        whois_hash: newRecord.whois_hash,
        checked_at: newRecord.checked_at,
      },
      whois_data: whoisData,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch WHOIS data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
