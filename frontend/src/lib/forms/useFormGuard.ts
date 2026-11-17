import { useRef, useState } from 'react';

/**
 * Client half of the server-side bot check.
 *
 * `form_started_at` is captured when the form mounts; the backend rejects
 * submissions that arrive faster than its configured minimum. The honeypot
 * value is read from the hidden input at submit time.
 */
export function useFormGuard() {
  const [startedAt] = useState(() => Date.now());
  const honeypotRef = useRef<HTMLInputElement>(null);

  const guardPayload = () => ({
    website: honeypotRef.current?.value ?? '',
    form_started_at: startedAt,
  });

  return { honeypotRef, guardPayload };
}
