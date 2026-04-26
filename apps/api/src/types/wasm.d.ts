declare module '*.wasm' {
  const src: string;
  export default src;
}

// Package-specific WASM imports
declare module '@aivo/compute/aivo_compute_bg.wasm' {
  const src: string;
  export default src;
}

declare module '@aivo/infographic-generator/infographic_generator_bg.wasm' {
  const src: string;
  export default src;
}
