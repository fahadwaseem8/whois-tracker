import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Return only relevant user and session information
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
      },
      session: {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
      },
      message: 'Login successful!',
    });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
