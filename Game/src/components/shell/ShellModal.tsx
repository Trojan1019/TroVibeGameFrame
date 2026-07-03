import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

interface ShellModalProps {
  children: React.ReactNode;
  zIndex?: number;
  backdropClassName?: string;
  containerClassName?: string;
}

export const ShellModal: React.FC<ShellModalProps> = ({
  children,
  zIndex = 50,
  backdropClassName,
  containerClassName,
}) => (
  <div className="absolute inset-0" style={{ zIndex }}>
    <div className={cx('absolute inset-0 bg-black/60', backdropClassName)} />
    <div className={cx('absolute inset-0 flex items-center justify-center overflow-hidden p-4', containerClassName)}>
      {children}
    </div>
  </div>
);
