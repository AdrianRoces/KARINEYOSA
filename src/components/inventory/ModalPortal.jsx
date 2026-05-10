import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ModalPortal = ({ children }) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default ModalPortal;
