type SubmitButtonProps = {
  pending: boolean;
  label: string;
  pendingLabel: string;
};

export function SubmitButton({ pending, label, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm bg-ink px-6 text-base font-medium text-cream transition-[background-color,transform] duration-200 hover:bg-ink-soft active:translate-y-px disabled:cursor-progress disabled:bg-ink-soft"
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-cream/30 border-t-cream motion-safe:animate-spin"
        />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}
