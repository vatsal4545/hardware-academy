import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/cn";

export interface SvgCanvasProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "title"> {
  viewBox: string;
  /** accessible name; also rendered as the SVG <title> */
  title: string;
  children: ReactNode;
}

/** A responsive, labelled SVG. Width fills the container; height follows the viewBox aspect ratio. */
export function SvgCanvas({ viewBox, title, className, children, ...rest }: SvgCanvasProps) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={title}
      className={cn("h-auto w-full select-none", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}
