import Link from 'next/link';

export const metadata = {
  title: 'Request removal - PromptDrop',
};

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function TakedownPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Request removal of imported content</h1>
      <p className="text-gray-600 dark:text-gray-400">
        Some prompts and agents on PromptDrop are imported from public sources such as GitHub and Hugging Face. Each
        one links back to its original source, names the original author, and shows its license. We only import from
        repositories with an open license, but if you are the author and want an item removed or corrected, tell us and
        we will take it down.
      </p>

      <p className="text-gray-600 dark:text-gray-400">Please include:</p>
      <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-1">
        <li>The PromptDrop page URL of the item</li>
        <li>A link to the original source, so we can confirm you are the author</li>
        <li>Whether you want it removed or just corrected</li>
      </ul>

      {contactEmail ? (
        <p>
          Email{' '}
          <a href={`mailto:${contactEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {contactEmail}
          </a>
          .
        </p>
      ) : (
        <p className="text-gray-500">Contact details are not configured yet.</p>
      )}

      <Link href="/" className="inline-block text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        Back to browse
      </Link>
    </div>
  );
}
