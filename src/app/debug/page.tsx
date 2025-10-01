'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnvVars({
      'NEXT_PUBLIC_FIREBASE_API_KEY': process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'NOT_FOUND',
      'NODE_ENV': process.env.NODE_ENV || 'NOT_FOUND',
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="bg-gray-100 p-4 rounded">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="mb-2">
            <span className="font-medium">{key}:</span>
            <span className="ml-2 font-mono text-sm">
              {key.includes('KEY') && value !== 'NOT_FOUND' ? '[API KEY SET]' : value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}