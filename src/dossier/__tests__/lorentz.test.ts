import { describe, expect, it } from 'vitest';
import { touchGesture } from '../figures/LorentzFigure';

describe('a finger on the Lorentz plot', () => {
  it('is a tap until it has travelled the slop', () => {
    expect(touchGesture(0, 0)).toBe('undecided');
    expect(touchGesture(5, -5)).toBe('undecided');
  });

  it('sets the speed only when it drags sideways', () => {
    expect(touchGesture(12, 3)).toBe('sideways');
    expect(touchGesture(-20, 19)).toBe('sideways');
  });

  it('scrolls the document when it moves up or down, even at 45°', () => {
    expect(touchGesture(2, 9)).toBe('scroll');
    expect(touchGesture(-3, -30)).toBe('scroll');
    expect(touchGesture(10, 10)).toBe('scroll');
  });
});
