const ICON_PATH = 'assets/icons/';

export function createIcon(name, className = 'icon') {
  const image = document.createElement('img');
  image.className = className;
  image.src = `${ICON_PATH}${name}.svg`;
  image.alt = '';
  image.draggable = false;

  return image;
}
