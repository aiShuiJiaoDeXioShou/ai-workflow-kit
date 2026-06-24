import { MinimapRender } from "@flowgram.ai/minimap-plugin";

export function FlowgramMinimap() {
  return (
    <div className="flowgram-minimap">
      <MinimapRender
        containerStyles={{
          pointerEvents: "auto",
          position: "relative",
          inset: "unset",
        }}
        inactiveStyle={{
          opacity: 1,
          scale: 1,
          translateX: 0,
          translateY: 0,
        }}
      />
    </div>
  );
}
