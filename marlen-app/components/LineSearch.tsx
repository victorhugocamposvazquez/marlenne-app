'use client';

import { forwardRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  autoFocus?: boolean;
  name?: string;
  style?: React.CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
};

/**
 * Una línea, como el buscador de Google. En el iPhone un input de búsqueda
 * enseña la barra de subir, bajar y check. Google marca el campo como
 * combobox y esa barra no sale.
 */
const LineSearch = forwardRef<HTMLTextAreaElement, Props>(function LineSearch({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  autoFocus,
  name = 'q',
  style,
  onFocus,
  onBlur,
}, ref) {
  return (
    <textarea
      ref={ref}
      rows={1}
      name={name}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={false}
      aria-haspopup="listbox"
      enterKeyHint="search"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      className={className}
      style={{ resize: 'none', overflow: 'hidden', whiteSpace: 'nowrap', ...style }}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={e => onChange(e.target.value.replace(/\n/g, ''))}
      onKeyDown={e => {
        if (e.key === 'Enter') e.preventDefault();
      }}
    />
  );
});

export default LineSearch;
