import "astro/astro-jsx"

// https://github.com/ota-meshi/eslint-plugin-astro/issues/168
declare global {
  namespace JSX {
    type Element = HTMLElement
    type IntrinsicElements = astroHTML.JSX.IntrinsicElements
  }
}
