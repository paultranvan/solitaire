import { ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './Sheet.css';

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="sheet-stage" aria-hidden={false}>
            <motion.div
              className="sheet"
              role="dialog"
              aria-label={title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            >
              <div className="sheet__handle" />
              <header className="sheet__header">
                <h2 className="sheet__title">{title}</h2>
                <button
                  type="button"
                  className="sheet__close"
                  onClick={onClose}
                  aria-label="close"
                >
                  ✕
                </button>
              </header>
              <div className="sheet__body">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
