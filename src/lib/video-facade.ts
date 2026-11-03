// The click-to-load player: builds the youtube-nocookie iframe and swaps it in
// for the facade. DOM access goes through small structural types, so the logic
// can be unit-tested with plain objects (no DOM library needed).

export interface PlayerData {
  id: string;
  title: string;
  allow: string;
}

export interface IframeLike {
  src: string;
  title: string;
  allow: string;
  allowFullscreen: boolean;
  focus(): void;
}

export interface FrameLike {
  replaceChildren(...nodes: any[]): void;
}

/** The embed URL: no-cookie host, autoplay (the click is the user gesture), inline on iOS. */
export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1`;
}

/** Replace everything in `frame` with the player and move focus to it. */
export function swapInPlayer<T extends IframeLike>(frame: FrameLike, createIframe: () => T, data: PlayerData): T {
  const iframe = createIframe();
  iframe.src = embedUrl(data.id);
  iframe.title = data.title;
  iframe.allow = data.allow;
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
  iframe.focus();
  return iframe;
}
