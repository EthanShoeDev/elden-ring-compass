import aboveMapSrc from '@/assets/erdb/map/lod_0.jpeg';
import { cn } from '@/lib/utils';
import {
  InfoIcon,
  LocateIcon,
  MapPinIcon,
  PinIcon,
  Trash2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import { HTMLAttributes, PropsWithChildren, useState } from 'react';
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformContext,
  useTransformEffect,
} from 'react-zoom-pan-pinch';

import { useDataTableData } from '@/lib/data-table-data';
import { ERDB, useAllErdb } from '@/lib/erdb';
import { MapItem } from '@/lib/map-db';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useDataTableStore } from '../data-table/data-table-store';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { TooltipButton } from '../ui/tooltip-button';

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

  const tableStore = useDataTableStore();
  const eventsItems = useDataTableData('events');

  const setEventRowSelection = tableStore.setRowSelection('events');

  return (
    <>
      <div className="flex flex-col gap-2 p-4 sm:px-8 md:px-24 lg:px-32">
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
          {HITBOX_TEST && (
            <div className="pointer-events-none absolute left-0 right-1/2 h-full border border-blue-400" />
          )}
          {HITBOX_TEST && (
            <div className="pointer-events-none absolute bottom-1/2 top-0 w-full border border-blue-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const graces = eventsItems.filter(
                (e) => e.type == 'grace' && e.on && e.map_data
              );
              setEventRowSelection(
                graces.reduce<Record<string, boolean>>((acc, e) => {
                  acc[e.id.toString()] = true;
                  return acc;
                }, {})
              );
            }}
          >
            Discovered Graces
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const graces = eventsItems.filter(
                (e) => e.type == 'grace' && !e.on && e.map_data
              );
              setEventRowSelection(
                graces.reduce<Record<string, boolean>>((acc, e) => {
                  acc[e.id.toString()] = true;
                  return acc;
                }, {})
              );
            }}
          >
            Undiscovered Graces
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const bosses = eventsItems.filter(
                (e) => e.type == 'boss' && e.on && e.map_data
              );
              setEventRowSelection(
                bosses.reduce<Record<string, boolean>>((acc, e) => {
                  acc[e.id.toString()] = true;
                  return acc;
                }, {})
              );
            }}
          >
            Completed Bosses
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const bosses = eventsItems.filter(
                (e) => e.type == 'boss' && !e.on && e.map_data
              );
              setEventRowSelection(
                bosses.reduce<Record<string, boolean>>((acc, e) => {
                  acc[e.id.toString()] = true;
                  return acc;
                }, {})
              );
            }}
          >
            Incomplete Bosses
          </Button>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              <p>Not all bosses or graces have map data.</p>
              <p>Feel free to submit a PR to help correct the data!</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
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

  const tableState = useDataTableStore((store) => store.tableState);
  const eventsItems = useDataTableData('events');
  const regionItems = useDataTableData('regions');
  const allErdb = useAllErdb();

  const selectedMapItems = Object.entries(tableState).reduce<Array<MapItem>>(
    (acc, [tableId, tableState]) => [
      ...acc,
      ...Object.entries(tableState?.rowSelection ?? {})
        .filter(([, v]) => v)
        .map(([id]) => {
          if (tableId == 'events')
            return (
              eventsItems.find((e) => e.id.toString() == id)?.map_data ?? []
            );
          if (tableId == 'regions')
            return (
              regionItems.find((r) => r.id.toString() == id)?.map_data ?? []
            );
          return (
            allErdb[tableId as keyof typeof ERDB].items.find(
              (e) => e.id.toString() == id
            )?.map_data ?? []
          );
        })
        .flat(),
    ],
    []
  );

  const clearPins = useDataTableStore((s) => s.clearAllRowSelection);

  return (
    <>
      <div
        className={cn(
          'relative aspect-[19/18] h-[720px] min-h-[720px] w-[760px] min-w-[760px] overflow-visible',
          HITBOX_TEST && 'border border-red-400',
          isPanning && 'cursor-grabbing'
          // placingOrigin && 'cursor-crosshair'
        )}
      >
        <TransformComponent wrapperClass="!overflow-visible">
          <div id="er-map">
            <img src={aboveMapSrc} alt="4k Elden Ring Map" />
            <OriginPin />
            {selectedMapItems
              .toSorted((a, b) => b.x - a.x)
              .map((item, idx) => (
                <MapDbWidget item={item} key={idx} />
              ))}
          </div>
        </TransformComponent>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-4">
        <TooltipButton
          tooltip="Zoom In"
          onClick={() => {
            zoomIn();
          }}
        >
          <ZoomInIcon />
        </TooltipButton>
        <TooltipButton
          tooltip="Zoom Out"
          onClick={() => {
            zoomOut();
          }}
        >
          <ZoomOutIcon />
        </TooltipButton>
        <TooltipButton
          tooltip="Reset Position"
          onClick={() => {
            setTransform(
              originTransformState.positionX,
              originTransformState.positionY,
              originTransformState.scale
            );
          }}
        >
          <LocateIcon />
        </TooltipButton>
      </div>
      <div className="absolute left-4 top-4 flex flex-col font-mono leading-4">
        <p>x: {transformState.positionX.toFixed(2)}</p>
        <p>y: {transformState.positionY.toFixed(2)}</p>
        <p>scale: {transformState.scale.toFixed(2)}</p>
      </div>
      <div className="absolute bottom-4 left-4 flex gap-4">
        <TooltipButton
          tooltip="Set Origin"
          onClick={() => {
            setOriginTransformState(transformState);
          }}
        >
          <PinIcon />
        </TooltipButton>
        <TooltipButton tooltip="Clear Pins" onClick={clearPins}>
          <Trash2Icon />
        </TooltipButton>
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
      top={
        (360 - originTransformState.positionY) / originTransformState.scale - 15
      }
      left={
        (380 - originTransformState.positionX) / originTransformState.scale - 12
      }
    >
      <Tooltip>
        <TooltipTrigger
          className={cn(
            '-translate-y-1/2',
            HITBOX_TEST && 'outline outline-1 outline-red-400'
          )}
        >
          {
            <PinIcon
              className={cn(
                'size-6',
                HITBOX_TEST && 'outline outline-1 outline-blue-400'
              )}
            />
          }
        </TooltipTrigger>
        <TooltipContent>Origin</TooltipContent>
      </Tooltip>
    </MapWidget>
  );
}

// function PlayerLocationPin() {
//   const slot = useSelectedSlot();
//   if (!slot) return null;

//   console.log(slot.player_coords);

//   return (
//     <MapWidget toolTipLabel="Player Location" top={0} left={0}>
//       <MapPinIcon
//         className={cn('size-6', HITBOX_TEST && 'border border-blue-400')}
//       />
//     </MapWidget>
//   );
// }

export function MapDbWidget({ item }: { item: MapItem }) {
  // Correct Isolated Divine Tower Result:
  // site.y = 156.395274
  // site.x = -134.453125

  const bx = -46.5;
  const by = -65.5;

  const dx = (456.126816621 - bx) / 156.395274;
  const dy = (364.36796875 - by) / 134.453125;

  // const bx = 0;
  // const by = 0;

  // const dx = 2.9165;
  // const dy = 2.71;

  const x = item.y * dx + bx;
  const y = -item.x * dy + by;

  // if (item.name == 'Isolated Divine Tower') console.log(`x: ${x} y: ${y}`);

  return (
    <MapWidget left={x} top={y}>
      <Tooltip>
        <TooltipTrigger className="-translate-y-1/2">
          <MapPinIcon
            className={cn('size-6', HITBOX_TEST && 'border border-blue-400')}
          />
        </TooltipTrigger>
        <TooltipContent
          className="select-text"
          avoidCollisions={false}
          side="top"
          onDoubleClick={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="">
            <strong>{item.name}</strong>
            <p>{item.category}</p>
            <p
              className="prose max-w-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    </MapWidget>
  );
}

function MapWidget({
  top,
  left,
  children,
}: {
  top: number;
  left: number;
} & PropsWithChildren) {
  return (
    <BetterKeepScale
      className={cn(
        'absolute',
        HITBOX_TEST && 'outline outline-1 outline-green-500'
      )}
      style={{
        left,
        top,
      }}
    >
      {children}
    </BetterKeepScale>
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
