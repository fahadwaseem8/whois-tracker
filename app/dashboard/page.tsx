import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                WHOIS Tracker
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Your Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Start tracking your domains and receive instant notifications.
          </p>
        </div>

        {/* Dashboard Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Stats Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tracked Domains
              </h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">No domains tracked yet</p>
          </div>

          {/* Add Domain Card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Add Your First Domain</h3>
            <p className="text-blue-100 mb-4">
              Start monitoring domain WHOIS changes by adding your first domain.
            </p>
            <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-gray-100 transition-colors">
              Add Domain
            </button>
          </div>

          {/* Quick Links Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                  View all domains
                </a>
              </li>
              <li>
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Notification settings
                </a>
              </li>
              <li>
                <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Account settings
                </a>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
