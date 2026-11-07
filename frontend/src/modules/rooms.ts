const ACTIVE_THUMB = ['ring-2', 'ring-gold', 'ring-offset-2', 'ring-offset-white', 'opacity-100'];
const INACTIVE_THUMB = ['ring-1', 'ring-line', 'opacity-75', 'hover:opacity-100'];

function setActiveThumb(button: HTMLButtonElement): void {
  button.classList.remove(...INACTIVE_THUMB);
  button.classList.add(...ACTIVE_THUMB);
  button.setAttribute('aria-pressed', 'true');
}

function setInactiveThumb(button: HTMLButtonElement): void {
  button.classList.remove(...ACTIVE_THUMB);
  button.classList.add(...INACTIVE_THUMB);
  button.setAttribute('aria-pressed', 'false');
}

export function initRooms(): void {
  document.querySelectorAll<HTMLElement>('[data-room-gallery]').forEach((gallery) => {
    const main = gallery.querySelector<HTMLImageElement>('[data-gallery-main]');
    const thumbs = Array.from(gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-thumb]'));

    if (!main || thumbs.length === 0) {
      return;
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.src;
        const alt = thumb.dataset.alt;

        if (!src) {
          return;
        }

        main.style.opacity = '0.25';
        window.setTimeout(() => {
          main.src = src;
          main.alt = alt ?? main.alt;
          main.style.opacity = '1';
        }, 120);

        thumbs.forEach(setInactiveThumb);
        setActiveThumb(thumb);
      });
    });
  });
}
