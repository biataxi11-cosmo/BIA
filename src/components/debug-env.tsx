'use client';

import { useEffect, useState } from 'react';

export function DebugEnv() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setEnvVars({
      'NODE_ENV': process.env.NODE_ENV || 'NOT_FOUND',
    });
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50">
      <h3 className="font-bold mb-2">Environment Debug</h3>
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key} className="mb-1">
          <span className="text-yellow-400">{key}:</span>
          <span className="ml-2 text-green-400">
            {value === 'NOT_FOUND' ? '❌ Not Found' : '✅ Found'}
          </span>
        </div>
      ))}
    </div>
  );
}





