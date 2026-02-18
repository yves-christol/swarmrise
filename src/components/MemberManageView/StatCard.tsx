export function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="
        flex flex-col items-center
        p-2.5
        bg-surface-primary
        border border-border-default
        rounded-lg
      "
    >
      <span className="text-xl font-semibold text-text-description">{value}</span>
      <span className="text-xs text-text-secondary mt-0.5">{label}</span>
    </div>
  );
}
