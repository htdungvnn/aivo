// WASM asset import types
// When using `?url` suffix, the import resolves to a string URL

declare module '*.wasm?url' {
  const value: string;
  export default value;
}

declare module '*.wasm' {
  const value: WebAssembly.Module;
  export default value;
}
