import Svg, { Path } from "react-native-svg";
// Original vector artwork. Both variants share the same baseline at y=100.
export function CheeseArt({ sock = false }: { sock?: boolean }) {
  const offset = sock ? 0 : 16;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 120 102"
      preserveAspectRatio="xMidYMax meet"
    >
      {sock && (
        <>
          <Path
            d="M24 76h15v13l10 3q5 2 3 6q-1 3-6 3H26q-5 0-5-5V81q0-5 3-5Z"
            fill="#FFF4DE"
            stroke="#B9A78A"
            strokeWidth="2"
          />
          <Path
            d="M73 76h15v13l10 3q5 2 3 6q-1 3-6 3H75q-5 0-5-5V81q0-5 3-5Z"
            fill="#FFF4DE"
            stroke="#B9A78A"
            strokeWidth="2"
          />
          <Path d="M23 82h15M72 82h15" stroke="#D16B64" strokeWidth="4" />
          <Path
            d="M42 92q-3 5 0 8M91 92q-3 5 0 8"
            stroke="#C7BAA0"
            strokeWidth="2"
          />
        </>
      )}
      <Path
        transform={`translate(0 ${offset})`}
        d="M14 34L84 15L106 29L101 84H12Z"
        fill="#F4C347"
        stroke="#B77C27"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M14 34L84 15L106 29L34 51Z"
        fill="#FFE28B"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M34 51L106 29L101 84H32Z"
        fill="#F4BF41"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M14 34L34 51L32 84H12Z"
        fill="#DEA334"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M47 30a8 4 0 1 0 16 0a8 4 0 1 0-16 0M74 24a5 3 0 1 0 10 0a5 3 0 1 0-10 0"
        fill="#D59B31"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M49 61a7 9 0 1 0 14 0a7 9 0 1 0-14 0M79 48a6 8 0 1 0 12 0a6 8 0 1 0-12 0M78 74a6 6 0 1 0 12 0a6 6 0 1 0-12 0"
        fill="#CE8D2C"
      />
      <Path
        transform={`translate(0 ${offset})`}
        d="M51 65q1 5 6 5M81 52q1 3 4 3M80 77q2 2 4 2"
        fill="none"
        stroke="#FFE08B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
