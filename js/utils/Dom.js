const PROPERTIES = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'textContent']);

function append(node, child) {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((entry) => append(node, entry));
    return;
  }
  node.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = value;
    } else if (key.startsWith('on')) {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (PROPERTIES.has(key)) {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }

  append(node, children);
  return node;
}

export function clear(node) {
  node.replaceChildren();
}
