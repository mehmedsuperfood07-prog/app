export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
  step,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        step={step}
        className="w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700"
      />
    </div>
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
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-xl border border-zinc-300 bg-surface px-3.5 py-2.5 text-sm dark:border-zinc-700"
      >
        {children}
      </select>
    </div>
  );
}
