import React from 'react';

/**
 * FormRow — responsive 2-column (or N-column) form row
 * Stacks to 1 column at 640px.
 * Usage: <FormRow cols={2}><Field .../><Field .../></FormRow>
 */
export default function FormRow({ children, cols = 2, gap = 14, style = {} }) {
  return (
    <div
      className={`tn-form-row tn-form-row-${cols}`}
      style={{ display: 'grid', gap, ...style }}
    >
      {children}
    </div>
  );
}
