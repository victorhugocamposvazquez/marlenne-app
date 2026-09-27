'use client';

export default function PersonalChip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center rounded-pill px-[15px] text-[13.5px] font-semibold transition motion-safe:active:scale-[.97] ${
        on ? 'bg-ink text-white' : 'border-[1.5px] border-surface-line bg-white text-ink'
      }`}
    >
      {label}
    </button>
  );
}
