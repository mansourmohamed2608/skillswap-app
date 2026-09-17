import { describe, expect, it } from 'vitest';
import { getUnreadConversationCount } from './chatRTDB';

describe('getUnreadConversationCount', () => {
  it('counts only conversations newer than the current user read marker', () => {
    expect(getUnreadConversationCount([
      { lastMessageAt: 20, perUserLastReadAt: { 'user-1': 10 } },
      { lastMessageAt: 20, perUserLastReadAt: { 'user-1': 20 } },
      { lastMessageAt: 5, perUserLastReadAt: { 'other-user': 100 } },
    ], 'user-1')).toBe(2);
  });

  it('does not report unread conversations without an authenticated user', () => {
    expect(getUnreadConversationCount([{ lastMessageAt: 20 }], null)).toBe(0);
  });
});
