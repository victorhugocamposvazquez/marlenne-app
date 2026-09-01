import { CAT_COLORS } from '@/lib/categories';

export default function ColorDots({
  value, onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAT_COLORS.map(c => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          onClick={() => onChange(c)}
          className={`h-9 w-9 rounded-full motion-safe:active:scale-[.94] ${value === c ? 'ring-2 ring-ink ring-offset-2' : ''}`}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}
