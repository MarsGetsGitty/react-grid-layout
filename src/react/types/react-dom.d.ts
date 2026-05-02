/**
 * Minimal type declarations for react-dom.
 * @types/react-dom is not installed; this covers the subset we use.
 */
declare module "react-dom" {
  import { ReactNode, ReactPortal } from "react";
  export function createPortal(
    children: ReactNode,
    container: Element,
    key?: string
  ): ReactPortal;
}
