import {
  KeepScale,
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
} from 'react-zoom-pan-pinch';
import { Button } from './ui/button';
import { ZoomInIcon, ZoomOutIcon, FullscreenIcon, PinIcon } from 'lucide-react';
import aboveMapSrc from '@/assets/erdb/map/lod_0.jpeg';
import { useState } from 'react';
import { cn } from '@/lib/utils';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type Location = { x: number; y: number; type: 'pin' };
type TransformState = {
  positionX: number;
  positionY: number;
  scale: number;
};

const defaultTransformState = {
  positionX: -5064.85,
  positionY: -10256.01,
  scale: 18.78,
};

const useMapStore = create<{
  transformState: TransformState;
  setTransformState: (state: TransformState) => void;
  locations: Array<Location>;
  setLocations: (locations: Array<Location>) => void;
  originTransformState: TransformState;
  setOriginTransformState: (state: TransformState) => void;
}>()(
  persist(
    (set) => ({
      transformState: defaultTransformState,
      setTransformState: (state) => {
        set({
          transformState: { ...state },
        });
      },
      locations: [],
      setLocations: (locations) => {
        set({
          locations: [...locations],
        });
      },
      originTransformState: defaultTransformState,
      setOriginTransformState: (state) => {
        set({
          originTransformState: { ...state },
        });
      },
    }),
    {
      name: 'elden-ring-db-map',
    }
  )
);

const initTransformState = useMapStore.getState().transformState;

export function InteractiveMap() {
  const setTransformState = useMapStore((state) => state.setTransformState);
  const [smoothStep, setSmoothStep] = useState(0.002);
  return (
    <div className="p-4 sm:px-8 md:px-24 lg:px-32">
      <div className="relative flex w-full justify-center overflow-hidden rounded-lg border border-muted">
        <TransformWrapper
          maxScale={250.0}
          minScale={1}
          initialPositionX={initTransformState.positionX}
          initialPositionY={initTransformState.positionY}
          initialScale={initTransformState.scale}
          smooth={true}
          wheel={{ smoothStep }}
          onTransformed={(transform) => {
            setTransformState(transform.state);
            setSmoothStep(transform.state.scale * 0.0004754385);
          }}
        >
          <MapInner />
        </TransformWrapper>
        <div className="pointer-events-none absolute inset-y-0 left-0 right-1/2" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2" />
      </div>
    </div>
  );
}

function MapInner() {
  const [isPanning, setIsPanning] = useState(false);
  useTransformEffect(({ instance }) => {
    setIsPanning(instance.isPanning);
  });
  const transformState = useMapStore((state) => state.transformState);
  const originTransformState = useMapStore(
    (state) => state.originTransformState
  );
  const { zoomIn, zoomOut, setTransform } = useControls();
  useTransformEffect(({ instance }) => {
    console.log(instance.lastMousePosition);
  });

  return (
    <>
      <div
        className={cn(
          'relative aspect-[19/18] h-[720px] min-h-[720px] w-[760px] min-w-[760px] overflow-visible',
          isPanning && 'cursor-grabbing'
        )}
      >
        <TransformComponent wrapperClass="!overflow-visible">
          <div className="relative">
            <img src={aboveMapSrc} alt="4k Elden Ring Map" />

            <div
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
              style={{
                top:
                  -originTransformState.positionY *
                  (1 / originTransformState.scale) *
                  1.035,
                left:
                  -originTransformState.positionY *
                  (1 / originTransformState.scale) *
                  0.5256,
              }}
            >
              <KeepScale>
                <PinIcon className="size-6 -translate-y-1/2" />
              </KeepScale>
            </div>
          </div>
        </TransformComponent>
      </div>
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
            setTransform(
              originTransformState.positionX,
              originTransformState.positionY,
              originTransformState.scale
            );
          }}
        >
          <FullscreenIcon />
        </Button>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-4">
        <div className="flex flex-col font-mono leading-4">
          <p>x: {transformState.positionX.toFixed(2)}</p>
          <p>y: {transformState.positionY.toFixed(2)}</p>
          <p>scale: {transformState.scale.toFixed(2)}</p>
        </div>
        <Button
          onClick={() => {
            zoomIn();
          }}
        >
          <PinIcon />
        </Button>
      </div>
    </>
  );
}
