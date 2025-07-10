'use client';

import { useEffect, useState } from 'react';

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  useEffect(() => {
    const confirmed = localStorage.getItem('ageConfirmed');
    if (confirmed === 'true') setAgeConfirmed(true);
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setAgeConfirmed(true);
  };

  if (!ageConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-700 p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Are you 13 years or older?</h1>
        <p className="mb-4 text-gray-700">You must be at least 13 to use this app.</p>
        <button
          onClick={handleConfirm}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Yes, I am 13 or older
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
