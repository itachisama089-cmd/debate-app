import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-[var(--color-gold)] hover:bg-[var(--color-gold-hover)] text-[var(--color-bg)] shadow-lg",
      secondary: "bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]",
      ghost: "bg-transparent hover:bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      danger: "bg-[var(--color-con)] hover:bg-[#A33E40] text-[var(--color-text)]",
    };

    const sizes = {
      sm: "text-sm px-3 py-1.5 rounded-md",
      md: "text-base px-5 py-2.5 rounded-lg",
      lg: "text-lg px-8 py-3 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';