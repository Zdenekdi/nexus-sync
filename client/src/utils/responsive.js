/**
 * Responsive utilities for mobile-first design
 * Used throughout the app to ensure proper mobile optimization
 */

export const getResponsiveValue = (mobile, desktop, isMobile) => {
  return isMobile ? mobile : desktop;
};

export const getResponsivePadding = (isMobile) => {
  return isMobile ? '1rem' : '2rem';
};

export const getResponsiveGap = (isMobile) => {
  return isMobile ? '0.75rem' : '1.5rem';
};

export const getResponsiveFontSize = (type, isMobile) => {
  const effectiveType = type || 'body';
  const sizes = {
    heading: isMobile ? '1.5rem' : '2.5rem',
    subheading: isMobile ? '1.25rem' : '1.75rem',
    body: isMobile ? '0.9rem' : '1rem',
    small: isMobile ? '0.75rem' : '0.85rem',
    tiny: isMobile ? '0.65rem' : '0.75rem'
  };
  return sizes[effectiveType] || sizes.body;
};

export const getResponsiveGridColumns = (isMobile, defaultColumns = 3) => {
  if (isMobile) return '1fr';
  return `repeat(${defaultColumns}, 1fr)`;
};

export const getResponsiveMaxWidth = (isMobile) => {
  return isMobile ? '100%' : '100%';
};

export const getResponsiveModalWidth = (isMobile) => {
  return isMobile ? 'calc(100% - 2rem)' : '400px';
};

export const getResponsiveHeight = (isMobile) => {
  // Account for navbar and safe areas on mobile
  return isMobile ? 'calc(100dvh - max(env(safe-area-inset-top), 1rem) - max(env(safe-area-inset-bottom), 1rem) - 3rem)' : '100vh';
};

export const getResponsiveFlexDirection = (isMobile, defaultDirection = 'row') => {
  return isMobile ? 'column' : defaultDirection;
};

export const getResponsiveMarginBottom = (isMobile) => {
  return isMobile ? '1.5rem' : '3rem';
};

export const safePadding = (isMobile) => ({
  padding: isMobile ? 'calc(1rem + env(safe-area-inset-left)) 1rem calc(1rem + env(safe-area-inset-right))' : '2rem',
  paddingBottom: isMobile ? 'calc(1.5rem + max(env(safe-area-inset-bottom), 1rem))' : '2rem'
});

