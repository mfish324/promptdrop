import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="text-6xl mb-6">404</div>
      <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
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
