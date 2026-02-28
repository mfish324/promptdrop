import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Something went wrong during sign in. Please try again.
      </p>
      <Link
        href="/"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
