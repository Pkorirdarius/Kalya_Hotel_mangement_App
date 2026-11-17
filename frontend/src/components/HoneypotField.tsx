import { forwardRef } from 'react';

interface HoneypotFieldProps {
  id: string;
}

/**
 * Hidden field for the server-side bot check. It is off-screen rather than
 * `display: none` so simple form-filling bots still populate it, while real
 * guests cannot see it or reach it with the keyboard.
 */
export const HoneypotField = forwardRef<HTMLInputElement, HoneypotFieldProps>(
  function HoneypotField({ id }, ref) {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        <label htmlFor={id}>Website</label>
        <input
          ref={ref}
          id={id}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore
          aria-hidden="true"
          defaultValue=""
        />
      </div>
    );
  },
);
