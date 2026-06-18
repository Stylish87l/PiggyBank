// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#080613', color: '#f0eeff', padding: 24 }}>
        <h2>Something went wrong loading PiggyBank.</h2>
        <p style={{ opacity: 0.7, fontSize: 13 }}>{error.message}</p>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}