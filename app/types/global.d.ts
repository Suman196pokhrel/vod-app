// This tells the ts language server that css files are valid modules, stop complaining about them when i import them
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}