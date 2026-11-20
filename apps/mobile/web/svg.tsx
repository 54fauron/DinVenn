import React from "react";
export default function Svg({ children, ...props }: any) {
  return <svg {...props}>{children}</svg>;
}
export function Path(props: any) {
  return <path {...props} />;
}
