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
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg
      "
    >
      <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}
