import { useEffect, useState } from 'react';

export const LoadingSpinner = ({ fullScreen = false, text = 'Loading...' }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-crm-border rounded-full"></div>
        <div className="absolute inset-0 border-4 border-crm-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      {text && <p className="text-crm-textMuted text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-crm-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return <div className="p-8 w-full flex justify-center">{spinner}</div>;
};
