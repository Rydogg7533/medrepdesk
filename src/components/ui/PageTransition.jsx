import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <div
      className={clsx(
        'transition-all duration-200 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      )}
    >
      {children}
    </div>
  );
}
