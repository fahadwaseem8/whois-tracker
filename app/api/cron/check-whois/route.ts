import { createServiceClient } from '@/lib/supabase/service';
import { fetchWhoisData, hashWhoisData, compareWhoisData } from '@/lib/whois';
import { sendWhoisChangeEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = await createServiceClient();

    // Fetch all active domains
    const { data: domains, error: domainsError } = await supabase
      .from('domains')
      .select('*')
      .eq('is_active', true);

    if (domainsError) {
      throw new Error(`Failed to fetch domains: ${domainsError.message}`);
    }

    if (!domains || domains.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active domains to check',
        checked: 0,
        changes: 0,
      });
    }

    let checkedCount = 0;
    let changesCount = 0;
    const errors: string[] = [];
    const checkedDomains: string[] = [];
    const changedDomains: string[] = [];

    for (const domain of domains) {
      try {
        // Fetch current WHOIS data
        const whoisData = await fetchWhoisData(domain.domain_name);
        const whoisHash = hashWhoisData(whoisData);

        // Get the most recent WHOIS record for this domain
        const { data: lastRecord } = await supabase
          .from('whois_records')
          .select('*')
          .eq('domain_id', domain.id)
          .order('checked_at', { ascending: false })
          .limit(1)
          .single();

        // Insert new WHOIS record
        await supabase.from('whois_records').insert({
          domain_id: domain.id,
          whois_hash: whoisHash,
          whois_data: whoisData,
        });

        checkedCount++;
        checkedDomains.push(domain.domain_name);

        // Check if WHOIS data has changed
        if (lastRecord && lastRecord.whois_hash !== whoisHash) {
          const changes = compareWhoisData(
            lastRecord.whois_data as Record<string, unknown>,
            whoisData
          );

          // Only proceed if there are actual meaningful changes
          if (changes.length > 0) {
            // Insert change record
            await supabase.from('whois_changes').insert({
              domain_id: domain.id,
              old_hash: lastRecord.whois_hash,
              new_hash: whoisHash,
              old_data: lastRecord.whois_data,
              new_data: whoisData,
              email_sent: false,
            });

            // Send email notification
            try {
              // Fetch user email separately
              const { data: userData } = await supabase.auth.admin.getUserById(domain.user_id);
              const userEmail = userData?.user?.email;
              
              if (userEmail) {
                await sendWhoisChangeEmail({
                  to: userEmail,
                  domain: domain.domain_name,
                  oldData: lastRecord.whois_data as Record<string, unknown>,
                  newData: whoisData,
                  changes,
                });

                // Update email_sent status
                await supabase
                  .from('whois_changes')
                  .update({ 
                    email_sent: true, 
                    email_sent_at: new Date().toISOString() 
                  })
                  .eq('domain_id', domain.id)
                  .eq('new_hash', whoisHash);

                changesCount++;
                changedDomains.push(domain.domain_name);
              }
            } catch (emailError) {
              errors.push(`Failed to send email for ${domain.domain_name}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
            }
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (domainError) {
        errors.push(`Error checking ${domain.domain_name}: ${domainError instanceof Error ? domainError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'WHOIS check completed',
      checked: checkedCount,
      checkedDomains,
      changes: changesCount,
      changedDomains,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run WHOIS check',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
