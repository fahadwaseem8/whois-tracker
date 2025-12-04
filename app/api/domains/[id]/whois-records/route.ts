import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch WHOIS records for a specific domain
export async function GET(
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

    // Verify domain belongs to user
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Fetch WHOIS records
    const { data: records, error } = await supabase
      .from('whois_records')
      .select('*')
      .eq('domain_id', id)
      .order('checked_at', { ascending: false })
      .limit(50); // Limit to last 50 checks

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      count: records?.length || 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
