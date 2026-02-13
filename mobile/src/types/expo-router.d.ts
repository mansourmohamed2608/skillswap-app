declare module 'expo-router' {
  export const Stack: any;
  export const Tabs: any;
  export const Link: any;
  export function useLocalSearchParams<T = Record<string, any>>(): T;
  export function useRouter(): { replace: (path: string) => void; push: (path: string) => void; back: () => void };
  export function usePathname(): string;
}
