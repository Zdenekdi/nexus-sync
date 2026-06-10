import { describe, it, expect } from 'vitest';
import {
  getResponsiveValue,
  getResponsivePadding,
  getResponsiveGap,
  getResponsiveFontSize,
  getResponsiveGridColumns,
  getResponsiveMaxWidth,
  getResponsiveModalWidth,
  getResponsiveHeight,
  getResponsiveFlexDirection,
  getResponsiveMarginBottom,
  safePadding
} from './responsive';

describe('Responsive Utils', () => {
  it('getResponsiveValue returns correct value based on isMobile flag', () => {
    expect(getResponsiveValue('mobileVal', 'desktopVal', true)).toBe('mobileVal');
    expect(getResponsiveValue('mobileVal', 'desktopVal', false)).toBe('desktopVal');
  });

  it('getResponsivePadding returns correct padding', () => {
    expect(getResponsivePadding(true)).toBe('1rem');
    expect(getResponsivePadding(false)).toBe('2rem');
  });

  it('getResponsiveGap returns correct gap', () => {
    expect(getResponsiveGap(true)).toBe('0.75rem');
    expect(getResponsiveGap(false)).toBe('1.5rem');
  });

  it('getResponsiveFontSize returns correct font size based on type', () => {
    expect(getResponsiveFontSize('heading', true)).toBe('1.5rem');
    expect(getResponsiveFontSize('heading', false)).toBe('2.5rem');
    expect(getResponsiveFontSize('unknown', true)).toBe('0.9rem'); // fallback to body
    expect(getResponsiveFontSize(undefined, false)).toBe('1rem'); // fallback to body
  });

  it('getResponsiveGridColumns returns correct grid columns', () => {
    expect(getResponsiveGridColumns(true)).toBe('1fr');
    expect(getResponsiveGridColumns(false)).toBe('repeat(3, 1fr)');
    expect(getResponsiveGridColumns(false, 4)).toBe('repeat(4, 1fr)');
  });

  it('getResponsiveMaxWidth returns 100% for both', () => {
      expect(getResponsiveMaxWidth(true)).toBe('100%');
      expect(getResponsiveMaxWidth(false)).toBe('100%');
  });

  it('getResponsiveModalWidth returns correct modal width', () => {
    expect(getResponsiveModalWidth(true)).toBe('calc(100% - 2rem)');
    expect(getResponsiveModalWidth(false)).toBe('400px');
  });

  it('getResponsiveHeight returns correct height calc on mobile', () => {
      expect(getResponsiveHeight(true)).toContain('100dvh');
      expect(getResponsiveHeight(false)).toBe('100vh');
  });

  it('getResponsiveFlexDirection uses correct flex direction', () => {
    expect(getResponsiveFlexDirection(true)).toBe('column');
    expect(getResponsiveFlexDirection(false)).toBe('row');
    expect(getResponsiveFlexDirection(false, 'row-reverse')).toBe('row-reverse');
  });

  it('getResponsiveMarginBottom uses correct margin bottom', () => {
    expect(getResponsiveMarginBottom(true)).toBe('1.5rem');
    expect(getResponsiveMarginBottom(false)).toBe('3rem');
  });

  it('safePadding calculates complex paddings', () => {
    const mobilePadding = safePadding(true);
    expect(mobilePadding.padding).toContain('env(safe-area-inset-left)');
    expect(mobilePadding.paddingBottom).toContain('max(env(safe-area-inset-bottom), 1rem)');

    const desktopPadding = safePadding(false);
    expect(desktopPadding.padding).toBe('2rem');
    expect(desktopPadding.paddingBottom).toBe('2rem');
  });
});
