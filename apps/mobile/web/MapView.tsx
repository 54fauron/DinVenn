import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
type Point = { latitude: number; longitude: number };
const Context = createContext<L.Map | null>(null);
const latLng = (p: Point): L.LatLngTuple => [p.latitude, p.longitude];
export default forwardRef(function MapView(props: any, ref) {
  const element = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  useEffect(() => {
    const instance = L.map(element.current!).setView(
      latLng(props.initialRegion),
      5,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(instance);
    instance.on("click", () =>
      callbacks.current.onPress?.({ nativeEvent: { action: "map-press" } }),
    );
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(element.current!);
    setMap(instance);
    callbacks.current.onMapReady?.();
    return () => {
      resize.disconnect();
      instance.remove();
    };
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(point: Point) {
        map?.setView(latLng(point), 15);
      },
      fitToCoordinates(points: Point[]) {
        if (points.length)
          map?.fitBounds(L.latLngBounds(points.map(latLng)), {
            padding: [45, 70],
            maxZoom: 15,
          });
      },
    }),
    [map],
  );
  return (
    <>
      <div
        ref={element}
        role="region"
        aria-label={props.accessibilityLabel}
        style={{ position: "absolute", inset: 0 }}
      />
      <Context.Provider value={map}>{props.children}</Context.Provider>
    </>
  );
});
export function Marker(props: any) {
  const map = useContext(Context);
  const callback = useRef(props.onPress);
  callback.current = props.onPress;
  useEffect(() => {
    if (!map) return;
    const marker = L.circleMarker(latLng(props.coordinate), {
      radius: 11,
      color: "#fff",
      weight: 3,
      fillColor: props.pinColor,
      fillOpacity: 1,
      bubblingMouseEvents: false,
    }).addTo(map);
    const label = document.createElement("span");
    label.textContent = props.title;
    marker.bindTooltip(label);
    const element = marker.getElement();
    element?.setAttribute("role", "button");
    element?.setAttribute("tabindex", "0");
    element?.setAttribute("aria-label", props.title);
    element?.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        event.stopPropagation();
        callback.current?.({ stopPropagation() {} });
      }
    });
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      callback.current?.({ stopPropagation() {} });
    });
    return () => {
      marker.remove();
    };
  }, [
    map,
    props.coordinate.latitude,
    props.coordinate.longitude,
    props.pinColor,
    props.title,
  ]);
  return null;
}
