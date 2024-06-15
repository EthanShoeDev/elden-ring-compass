import { useState } from 'react';
import { Input } from './components/ui/input';
import { parseEldenRingUrl } from './lib/er-save-parser';
import { useQuery } from '@tanstack/react-query';

function App() {
  const [url, setUrl] = useState<string>('http://localhost:8080/ER0000.sl2');

  const erSaveQuery = useQuery({
    queryKey: ['er-save', url],
    queryFn: async () => {
      const erData = await parseEldenRingUrl(url);
      return erData;
    },
    enabled: !!url,
  });

  return (
    <main className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Elden Ring Save Parser
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Set up a local server to host your Elden Ring save file, then enter the
        URL below. The save file is stored at: C:\Users\username
        \AppData\Roaming\EldenRing\RANDOM\ER0000.sl2
      </p>

      <p className="mb-4 text-gray-600 dark:text-gray-400">
        NodeJS:
        <code className="rounded-md bg-gray-200 px-2 py-1 dark:bg-gray-700">
          npx http-server -p 8080 --cors -c-1
        </code>
      </p>
      <Input
        value={url}
        placeholder="http://localhost:8080/ER0000.sl2"
        onChange={(e) => {
          setUrl(e.target.value);
        }}
        className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      {erSaveQuery.isPending && (
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      )}
      {erSaveQuery.isError && (
        <p className="text-red-500 dark:text-red-400">
          Error: {erSaveQuery.error.message}
        </p>
      )}
      {erSaveQuery.data && (
        <pre className="overflow-auto rounded-md bg-gray-200 p-4 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          {JSON.stringify(erSaveQuery.data, null, 2)}
        </pre>
      )}
    </main>
  );
}

export default App;
