declare module '@elderjs/shortcodes' {
  export default () => object;
  export function add(shortcodeName: string, handlerFunction: () => void);
}
