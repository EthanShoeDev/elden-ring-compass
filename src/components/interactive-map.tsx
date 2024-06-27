import aboveMapSrc from '@/assets/erdb/map/lod_0.jpeg';
import { cn } from '@/lib/utils';
import {
  LocateIcon,
  MapIcon,
  MapPinIcon,
  PinIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import React, { HTMLAttributes, useState } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformContext,
  useTransformEffect,
} from 'react-zoom-pan-pinch';
import { Button } from './ui/button';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useSelectedSlot } from '@/stores/slot-selection-store';

const HITBOX_TEST = false as boolean;

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
  const setOriginTransformState = useMapStore(
    (state) => state.setOriginTransformState
  );
  const { zoomIn, zoomOut, setTransform } = useControls();
  return (
    <>
      <div
        className={cn(
          'relative aspect-[19/18] h-[720px] min-h-[720px] w-[760px] min-w-[760px] overflow-visible',
          isPanning && 'cursor-grabbing'
          // placingOrigin && 'cursor-crosshair'
        )}
      >
        <TransformComponent wrapperClass="!overflow-visible">
          <div className="relative">
            <img src={aboveMapSrc} alt="4k Elden Ring Map" />
            <OriginPin />
            <PlayerLocationPin />
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
          <MapIcon />
        </Button>
      </div>
      <div className="absolute left-4 top-4 flex flex-col font-mono leading-4">
        <p>x: {transformState.positionX.toFixed(2)}</p>
        <p>y: {transformState.positionY.toFixed(2)}</p>
        <p>scale: {transformState.scale.toFixed(2)}</p>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-4">
        <Button
          onClick={() => {
            setOriginTransformState(transformState);
          }}
        >
          <LocateIcon />
        </Button>
      </div>
    </>
  );
}

function OriginPin() {
  const originTransformState = useMapStore(
    (state) => state.originTransformState
  );
  return (
    <MapWidget
      toolTipLabel="Origin"
      top={(360 - originTransformState.positionY) / originTransformState.scale}
      left={(380 - originTransformState.positionX) / originTransformState.scale}
    >
      <PinIcon
        className={cn(
          'size-6 -translate-y-1/2',
          HITBOX_TEST && 'border border-blue-400'
        )}
      />
    </MapWidget>
  );
}

function PlayerLocationPin() {
  const slot = useSelectedSlot();
  if (!slot) return null;

  console.log(slot.player_coords);

  return (
    <MapWidget toolTipLabel="Player Location" top={0} left={0}>
      <MapPinIcon
        className={cn(
          'size-6 -translate-y-1/2',
          HITBOX_TEST && 'border border-blue-400'
        )}
      />
    </MapWidget>
  );
}

function MapWidget({
  toolTipLabel,
  top,
  left,
  children,
}: {
  toolTipLabel: string;
  children: React.ReactNode;
  top: number;
  left: number;
}) {
  return (
    <div
      className={cn(
        'absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2',
        HITBOX_TEST && 'border border-red-500'
      )}
      style={{
        left,
        top,
      }}
    >
      <BetterKeepScale>
        <Tooltip>
          <TooltipTrigger>{children}</TooltipTrigger>
          <TooltipContent>{toolTipLabel}</TooltipContent>
        </Tooltip>
      </BetterKeepScale>
    </div>
  );
}

function BetterKeepScale(props: HTMLAttributes<HTMLDivElement>) {
  const instance = useTransformContext();
  const [scale, setScale] = useState(instance.props.initialScale ?? 1);

  useTransformEffect(({ instance }) => {
    setScale(instance.transformState.scale);
  });

  const transform = instance.handleTransformStyles(0, 0, 1 / scale);

  return (
    <div
      {...props}
      // ref={localRef}
      style={{
        ...props.style,
        transform,
      }}
    />
  );
}
