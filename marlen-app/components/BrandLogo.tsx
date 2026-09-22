import { BRAND_NAME } from '@/lib/brand';

/** Logotipo oficial (M + sonrisa). Decorativo si `alt` va vacío. */
export default function BrandLogo({
  size = 56,
  alt = BRAND_NAME,
  className = '',
}: {
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`select-none ${className}`}
    />
  );
}
