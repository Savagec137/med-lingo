import { useId, useState } from "react";

export function FillBlankCard({
  prompt,
  disabled = false,
  onSubmit,
}: {
  prompt: string;
  disabled?: boolean;
  onSubmit?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState("");

  return (
    <form
      className="panel grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const answer = value.trim();
        if (answer) onSubmit?.(answer);
      }}
    >
      <label htmlFor={id} className="text-lg font-extrabold">
        {prompt}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="rounded-2xl border-2 border-border bg-background px-4 py-3 font-bold outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={disabled || value.trim() === ""}
        className="rounded-2xl bg-primary px-5 py-3 font-extrabold text-primary-foreground disabled:opacity-40"
      >
        Valider
      </button>
    </form>
  );
}
