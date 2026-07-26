import { useState } from "react";

export function CalculationCard({
  question,
  unit,
  disabled = false,
  onSubmit,
}: {
  question: string;
  unit?: string;
  disabled?: boolean;
  onSubmit?: (value: number) => void;
}) {
  const [value, setValue] = useState("");
  const numericValue = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(numericValue);

  return (
    <form
      className="panel grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onSubmit?.(numericValue);
      }}
    >
      <label htmlFor="calculation-answer" className="text-lg font-extrabold">
        {question}
      </label>
      <div className="flex items-center gap-3">
        <input
          id="calculation-answer"
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg font-bold outline-none focus:border-primary"
        />
        {unit ? <span className="font-bold text-muted-foreground">{unit}</span> : null}
      </div>
      <button
        type="submit"
        disabled={disabled || !valid}
        className="rounded-2xl bg-primary px-5 py-3 font-extrabold text-primary-foreground disabled:opacity-40"
      >
        Valider
      </button>
    </form>
  );
}
