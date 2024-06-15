import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

export function InteractiveMap() {
  return (
    <TransformWrapper>
      <TransformComponent>
        <img src="image.jpg" alt="test" />
      </TransformComponent>
    </TransformWrapper>
  );
}
