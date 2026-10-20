import * as THREE from 'three';

export function createViewCapture(renderer) {
  const savedViewport = new THREE.Vector4();

  function capture(scene, camera, context, size) {
    const pixelRatio = renderer.getPixelRatio();
    const bufferHeight = renderer.domElement.height;
    const sourceSize = Math.round(size * pixelRatio);
    const scissorWasEnabled = renderer.getScissorTest();

    renderer.getViewport(savedViewport);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, size, size);
    renderer.setScissor(0, 0, size, size);
    renderer.render(scene, camera);

    context.drawImage(
      renderer.domElement,
      0,
      bufferHeight - sourceSize,
      sourceSize,
      sourceSize,
      0,
      0,
      context.canvas.width,
      context.canvas.height
    );

    renderer.setScissorTest(scissorWasEnabled);
    renderer.setViewport(savedViewport);
  }

  return { capture };
}
