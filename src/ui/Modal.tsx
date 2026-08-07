import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({
  title,
  onClose,
  children,
  wide,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  actions?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-head">
          <h2>{title}</h2>
          {actions}
          <button className="btn icon" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="panel-body">{children}</div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {actions}
        <button className="btn icon" onClick={onClose} aria-label="Close panel">
          <Icon name="close" />
        </button>
      </div>
      <div className="panel-body">{children}</div>
    </aside>
  );
}
