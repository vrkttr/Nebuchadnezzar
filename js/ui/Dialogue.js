export function createDialogue() {
  const box = document.getElementById('dialogue-box');
  const text = document.getElementById('dialogue-text');
  const closeButton = document.getElementById('dialogue-close');

  closeButton.addEventListener('click', () => {
    box.classList.add('hidden');
  });

  function show(message) {
    text.textContent = message;
    box.classList.remove('hidden');
  }

  return { show };
}
