import { TAG_STYLES } from './constants';

/**
 * Displays a customer tag as a styled badge
 * Shows the final tag (respecting manual overrides)
 * 
 * Props:
 * - tag: string - The tag to display (New, Regular, Loyal, Bogus)
 * - size: string - Badge size ('sm' | 'md' | 'lg') - default 'md'
 * - onClick: function - Optional callback when badge is clicked
 * - className: string - Additional CSS classes
 */
function CustomerTagBadge({ tag, size = 'md', onClick, className = '' }) {
  if (!tag) return null;

  const style = TAG_STYLES[tag];
  if (!style) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-block rounded-full font-semibold border
        ${sizeClasses[size] || sizeClasses.md}
        ${style.bg} ${style.text} ${style.border}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
    >
      {tag}
    </span>
  );
}

export default CustomerTagBadge;
