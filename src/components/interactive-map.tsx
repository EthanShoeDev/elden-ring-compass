import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from 'react-zoom-pan-pinch';
import { Button } from './ui/button';
import { ZoomInIcon, ZoomOutIcon, FullscreenIcon } from 'lucide-react';

export function InteractiveMap() {
  return (
    <div className="relative size-full">
      <TransformWrapper maxScale={50.0}>
        <TransformComponent>
          <img
            src="https://eldenring.wiki.fextralife.com/file/Elden-Ring/the_lands_between_map_elden_ring_wiki_guide_3840px.jpg?v=1648140602316"
            alt="4k Elden Ring Map"
          />
        </TransformComponent>
        <Controls />
      </TransformWrapper>
    </div>
  );
}

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <div className="absolute bottom-4 right-4 flex gap-4">
      <Button
        onClick={() => {
          zoomIn();
        }}
      >
        <ZoomInIcon />
      </Button>
      <Button
        onClick={() => {
          zoomOut();
        }}
      >
        <ZoomOutIcon />
      </Button>
      <Button
        onClick={() => {
          resetTransform();
        }}
      >
        <FullscreenIcon />
      </Button>
    </div>
  );
}
