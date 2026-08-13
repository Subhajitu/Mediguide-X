import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`input-container ${containerClassName}`}>
        {leftIcon && <div className="input-icon-left">{leftIcon}</div>}
        <input
          ref={ref}
          className={`input-field ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''} ${className}`}
          {...props}
        />
        {rightIcon && <div className="input-icon-right">{rightIcon}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';
