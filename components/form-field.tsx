const inputClasses =
  "w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700";

// The label wraps its control so tapping the label text focuses the
// input — a plain <label> sibling without htmlFor does nothing.
export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  step,
  autoComplete,
  minLength,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  autoComplete?: string;
  minLength?: number;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        step={step}
        autoComplete={autoComplete}
        minLength={minLength}
        className={inputClasses}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  required,
  children,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={inputClasses}
      >
        {children}
      </select>
    </label>
  );
}
