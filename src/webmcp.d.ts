/**
 * WebMCP declarative API attributes (https://developer.chrome.com/docs/ai/webmcp/declarative-api).
 * Astro's JSX attribute interfaces don't know about these yet, so merge them in.
 */
declare namespace astroHTML.JSX {
  interface FormHTMLAttributes {
    toolname?: string | undefined;
    tooldescription?: string | undefined;
    toolautosubmit?: boolean | undefined;
  }

  interface InputHTMLAttributes {
    toolparamdescription?: string | undefined;
  }
}
