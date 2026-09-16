import { normalizeBusinessEmail } from '../core/business-email';

describe('business email policy', () => {
  const original = process.env.CONSUMER_EMAIL_DOMAINS;
  afterEach(() => {
    if (original === undefined) delete process.env.CONSUMER_EMAIL_DOMAINS;
    else process.env.CONSUMER_EMAIL_DOMAINS = original;
  });

  it('normalizes a valid business-domain address', () => {
    expect(normalizeBusinessEmail(' Person@Agency.ORG ')).toBe('person@agency.org');
  });

  it.each(['person@gmail.com', 'person@OUTLOOK.com', 'person@yahoo.com', 'person@hotmail.com'])(
    'rejects consumer provider %s',
    (email) => expect(normalizeBusinessEmail(email)).toBeNull(),
  );

  it('rejects malformed email addresses', () => {
    expect(normalizeBusinessEmail('not-an-email')).toBeNull();
  });

  it('honors additional configured consumer domains case-insensitively', () => {
    process.env.CONSUMER_EMAIL_DOMAINS = 'Example-Free.test';
    expect(normalizeBusinessEmail('person@example-free.test')).toBeNull();
  });
});
