import React from 'react';

interface PlayingModuleLayoutProps {
  statusBanner?: React.ReactNode;
  playfield: React.ReactNode;
  controls?: React.ReactNode;
  footerTools?: React.ReactNode;
}

export const PlayingModuleLayout: React.FC<PlayingModuleLayoutProps> = ({
  statusBanner,
  playfield,
  controls,
  footerTools,
}) => {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {statusBanner ? (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-4 text-center select-none">
          {statusBanner}
        </div>
      ) : null}

      <div className="flex-1 flex items-center justify-center py-2 relative z-10">
        {playfield}
      </div>

      {controls ? (
        <div className="py-1.5 flex flex-col items-center justify-center gap-1.5 z-10">
          {controls}
        </div>
      ) : null}

      {footerTools ? (
        <div className="relative z-10 mt-2 flex items-center justify-around rounded-[24px] border border-[rgba(83,101,122,0.14)] bg-[rgba(255,255,255,0.92)] p-3 shadow-[0_14px_28px_rgba(38,54,72,0.10)]">
          {footerTools}
        </div>
      ) : null}
    </div>
  );
};
