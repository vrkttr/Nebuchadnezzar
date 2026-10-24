const ICON_PATH = 'assets/icons/';
const ICON_VERSION = 106;

export function createIcon(name, className = 'icon') {
  const image = document.createElement('img');
  image.className = className;
  image.src = `${ICON_PATH}${name}.svg?v=${ICON_VERSION}`;
  image.alt = '';
  image.draggable = false;

  return image;
}
