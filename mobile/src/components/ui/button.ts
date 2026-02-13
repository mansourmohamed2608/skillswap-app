// Shim for legacy lowercase import paths. Prefer importing from './Button'.
// We use a dynamic require with explicit extension to avoid Windows case-collision.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Button = require('./Button.tsx').default;
export default Button;
export { Button };
