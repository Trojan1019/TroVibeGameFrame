import React from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type DragAxis = 'x' | 'y' | 'both';

interface DragScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  axis?: DragAxis;
}

export const DragScrollArea = React.forwardRef<HTMLDivElement, DragScrollAreaProps>(function DragScrollArea(
  {
    axis = 'y',
    className,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    children,
    ...props
  },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const dragStateRef = React.useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const suppressClickRef = React.useRef(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const isInteractiveTarget = React.useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        [
          'button',
          'a',
          'input',
          'textarea',
          'select',
          'label',
          '[role="button"]',
          '[data-drag-scroll-ignore="true"]',
        ].join(','),
      ),
    );
  }, []);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  const resetDrag = React.useCallback(() => {
    dragStateRef.current.active = false;
    dragStateRef.current.moved = false;
    dragStateRef.current.pointerId = -1;
    setIsDragging(false);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || !innerRef.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: innerRef.current.scrollLeft,
      scrollTop: innerRef.current.scrollTop,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore unsupported capture contexts.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);

    const element = innerRef.current;
    const state = dragStateRef.current;
    if (!element || !state.active || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    const movedEnough = Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6;

    if (!state.moved && movedEnough) {
      state.moved = true;
      suppressClickRef.current = true;
      setIsDragging(true);
    }

    if (!state.moved) return;

    if (axis !== 'y') {
      element.scrollLeft = state.scrollLeft - deltaX;
    }
    if (axis !== 'x') {
      element.scrollTop = state.scrollTop - deltaY;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore unsupported capture contexts.
    }
    resetDrag();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore unsupported capture contexts.
    }
    resetDrag();
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    onClickCapture?.(event);
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={setRefs}
      className={cx(isDragging ? 'cursor-grabbing select-none' : 'cursor-grab', className)}
      style={{
        ...style,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      {...props}
    >
      {children}
    </div>
  );
});
