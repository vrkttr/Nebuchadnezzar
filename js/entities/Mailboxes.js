import { createMailbox } from '../world/builders/Mailbox.js';

export function createMailboxes(scene) {
  const boxes = new Map();

  function add(data) {
    if (boxes.has(data.id)) return;

    const object = createMailbox();
    object.position.set(data.x, data.y ?? 0, data.z);
    object.rotation.y = data.rotationY ?? 0;
    object.userData.isMailbox = true;
    object.userData.mailboxId = data.id;

    scene.add(object);
    boxes.set(data.id, object);
  }

  function clear() {
    for (const object of boxes.values()) scene.remove(object);
    boxes.clear();
  }

  function sync(list) {
    clear();
    for (const data of list) add(data);
  }

  function getObjects() {
    return Array.from(boxes.values());
  }

  return { sync, clear, getObjects };
}
