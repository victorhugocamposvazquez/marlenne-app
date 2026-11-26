/** Icono Meta (formularios de anuncios). */
export default function MetaLogo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      className={className}
      aria-hidden
    >
      <path
        fill="#0081FB"
        d="M28.885 3C24.872 3 21.479 5.533 18 10.305 14.521 5.533 11.128 3 7.115 3 3.366 3 0 8.722 0 17.275c0 5.476 2.747 9.339 6.654 9.339 3.474 0 6.449-4.005 11.08-9.119L20 15.171l2.266 2.384c4.631 5.114 7.606 9.119 11.08 9.119 3.907 0 6.654-3.863 6.654-9.339C36 8.722 30.634 3 28.885 3Z"
      />
    </svg>
  );
}