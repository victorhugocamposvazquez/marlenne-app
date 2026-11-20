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
  /** En listas (Clientas) va en plano; en pickers, combobox. */
  variant?: 'combobox' | 'plain';
};

/**
 * Una línea. En el iPhone, Safari pone encima del teclado la barra de
 * anterior, siguiente y check en cualquier campo editable. La página no
 * puede quitarla (WebKit 319762, iOS 27). Se apaga en la cáscara nativa.
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
  variant = 'combobox',
}, ref) {
  const combo = variant === 'combobox';
  return (
    <textarea
      ref={ref}
      rows={1}
      name={name}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      {...(combo
        ? {
            role: 'combobox' as const,
            'aria-autocomplete': 'list' as const,
            'aria-expanded': false,
            'aria-haspopup': 'listbox' as const,
          }
        : { role: 'searchbox' as const })}
      inputMode="search"
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
