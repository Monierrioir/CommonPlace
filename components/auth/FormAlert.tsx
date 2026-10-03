type FormAlertProps = {
  message: string | null;
  tone?: "error" | "notice";
};

/** Always-mounted live region so screen readers hear each new message. */
export function FormAlert({ message, tone = "error" }: FormAlertProps) {
  return (
    <div role="alert" aria-atomic="true" className="empty:-mb-5">
      {message && (
        <p
          className={`border-l-2 px-3.5 py-2.5 text-sm leading-relaxed ${
            tone === "error" ? "border-burgundy bg-burgundy/[0.06] text-burgundy" : "border-ochre bg-ochre/10 text-ink-soft"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
