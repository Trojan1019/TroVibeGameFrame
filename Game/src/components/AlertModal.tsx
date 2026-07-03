import React from 'react';
import { X } from 'lucide-react';
import { ShellButton, ShellPanel, ShellTitle } from './shell/ShellPrimitives';
import { ShellModal } from './shell/ShellModal';

interface AlertModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'blue';
}

interface AlertModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  actions?: AlertModalAction[];
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '知道了',
  actions,
}) => {
  if (!isOpen) return null;

  return (
    <ShellModal zIndex={100} containerClassName="select-none">
      <ShellPanel className="relative flex w-full max-w-[292px] flex-col items-center px-5 pb-5 pt-8 text-center shadow-[0_8px_0_var(--shell-shadow)] animate-scale-up">
        <ShellTitle className="absolute -top-5 text-sm">{title}</ShellTitle>
        {onClose && (
          <ShellButton
            onClick={onClose}
            variant="danger"
            size="sm"
            className="absolute right-3 top-3 h-8 w-8 rounded-full px-0"
          >
            <X className="h-3 w-3 stroke-[3]" />
          </ShellButton>
        )}
        <p className="mb-5 mt-3 text-[12px] font-extrabold leading-relaxed text-[var(--shell-ink)]">
          {message}
        </p>
        {actions && actions.length > 0 ? (
          <div className="flex gap-2 w-full">
            {actions.map((action, i) => (
              <ShellButton
                key={i}
                onClick={action.onClick}
                variant={action.variant === 'blue' ? 'primary' : action.variant === 'secondary' ? 'secondary' : 'primary'}
                fullWidth
                size="md"
                className={action.variant === 'blue' ? 'bg-[linear-gradient(180deg,#78b9ff_0%,#4688e5_100%)] shadow-[0_4px_0_#3561a8] disabled:shadow-[0_4px_0_#3561a8]' : ''}
              >
                {action.label}
              </ShellButton>
            ))}
          </div>
        ) : (
          <ShellButton
            onClick={onClose}
            fullWidth
            size="md"
          >
            {confirmText}
          </ShellButton>
        )}
      </ShellPanel>
    </ShellModal>
  );
};
