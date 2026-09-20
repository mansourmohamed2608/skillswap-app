import { assertSuccessfulPaymentMatches } from '../core/payments';

describe('authoritative subscription payment fulfillment', () => {
  const stored = { amount: 750, currency: 'EGP', userId: 'member-1' };

  it('accepts matching server-stored terms', () => {
    expect(() => assertSuccessfulPaymentMatches(stored, {
      amount: 750,
      currency: 'egp',
      customer: { id: 'member-1' },
    })).not.toThrow();
  });

  it.each([
    [{ amount: 1, currency: 'EGP', customer: { id: 'member-1' } }, 'Payment amount mismatch'],
    [{ amount: 750, currency: 'SAR', customer: { id: 'member-1' } }, 'Payment currency mismatch'],
    [{ amount: 750, currency: 'EGP', customer: { id: 'other-member' } }, 'Payment customer mismatch'],
  ])('rejects mismatched webhook terms %#', (webhook, message) => {
    expect(() => assertSuccessfulPaymentMatches(stored, webhook)).toThrow(message);
  });

  it.each([
    ['EGP', 50],
    ['SAR', 45],
  ])('accepts an in-flight legacy session using canonical %s pricing', (currency, amount) => {
    expect(() => assertSuccessfulPaymentMatches({
      plan: 'Basic',
      duration: '6_months',
      userId: 'member-1',
    }, {
      amount,
      currency,
      customer: { id: 'member-1' },
    })).not.toThrow();
  });

  it('rejects a legacy session whose amount is not canonical', () => {
    expect(() => assertSuccessfulPaymentMatches({
      plan: 'Basic',
      duration: '6_months',
      userId: 'member-1',
    }, {
      amount: 1,
      currency: 'EGP',
      customer: { id: 'member-1' },
    })).toThrow('Payment amount mismatch');
  });
});
