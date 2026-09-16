export function getJoinPrimaryAction(authenticated: boolean) {
  return authenticated
    ? { href: '/listings/new', translationKey: 'home.joinCta.authenticatedPrimary' }
    : { href: '/auth/signup', translationKey: 'home.joinCta.primary' };
}

export function getCategoryBrowseAction() {
  return { href: '/listings', translationKey: 'home.categories.viewAll' } as const;
}
