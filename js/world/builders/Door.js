export function addDoor(batch, { x, z, y = 0, face, frame, width = 1.8, height = 2.5 }) {
  const leaf = 0.1;
  const trim = 0.16;
  const centerY = y + height / 2;
  batch.box(frame, width, height, leaf, { x, y: centerY, z: z + 0.08, tile: 1 });
  batch.quad(face, width, height, { x, y: centerY, z: z + 0.08 + leaf / 2 + 0.004 });
  for (const side of [-1, 1]) {
    batch.box(frame, trim, height + trim, 0.2, { x: x + side * (width / 2 + trim / 2), y: y + (height + trim) / 2, z: z + 0.1, tile: 1 });
  }
  batch.box(frame, width + trim * 2, trim, 0.2, { x, y: y + height + trim / 2, z: z + 0.1, tile: 1 });
  batch.box(frame, width + trim * 2, 0.06, 0.34, { x, y: y + 0.03, z: z + 0.17, tile: 1 });
}
