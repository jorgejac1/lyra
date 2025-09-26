declare module "*.lyra.tsx" {
  const Component: (props?: any) => any;
  export default Component;
}

declare namespace JSX {
  interface HTMLAttributes<T> {
    [attr: `${string}:${string}`]: any;  // allow directive-style props like "on:click"
  }
}
