import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './safe-return-path';

describe('safeReturnPath', () => {
  it('keeps an in-app plan checkout intent', () => {
    expect(safeReturnPath('/pricing?plan=standard&duration=6mo&currency=sar&autostart=1')).toBe(
      '/pricing?plan=standard&duration=6mo&currency=sar&autostart=1',
    );
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])('rejects open redirect %s', (value) => {
    expect(safeReturnPath(value, '/')).toBe('/');
  });
});
