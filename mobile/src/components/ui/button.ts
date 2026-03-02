// Shim for legacy lowercase import paths. Prefer importing from './Button'.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Btn = require('./Button.tsx');
const Button = Btn.default ?? Btn;
export default Button;
export { Button };
