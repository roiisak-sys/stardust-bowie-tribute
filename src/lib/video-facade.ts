// The click-to-load player: builds the youtube-nocookie iframe and swaps it in
// for the facade. DOM access goes through small structural types, so the logic
// can be unit-tested with plain objects (no DOM library needed).
//
// Two ways in, one player:
//  - a click on the facade loads it at once and starts playback (autoplay, focus);
//  - otherwise it is loaded, without autoplay and without stealing focus, when
//    the frame comes near the viewport, so the page has a real on-page video
//    for crawlers and for visitors who scroll to it instead of clicking.

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

/** The embed URL: no-cookie host, inline playback on iOS, and autoplay only after a click. */
export function embedUrl(id: string, autoplay = true): string {
  return `https://www.youtube-nocookie.com/embed/${id}?${autoplay ? 'autoplay=1&' : ''}playsinline=1`;
}

/** Replace everything in `frame` with the player. With autoplay (a click) also move focus to it. */
export function swapInPlayer<T extends IframeLike>(
  frame: FrameLike,
  createIframe: () => T,
  data: PlayerData,
  autoplay = true,
): T {
  const iframe = createIframe();
  iframe.src = embedUrl(data.id, autoplay);
  iframe.title = data.title;
  iframe.allow = data.allow;
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
  if (autoplay) iframe.focus();
  return iframe;
}

/** Loads the player at most once; whichever of click or near-viewport comes first wins. */
export function facadeController<T extends IframeLike>(frame: FrameLike, createIframe: () => T, data: PlayerData) {
  let loaded = false;
  const load = (autoplay: boolean): T | null => {
    if (loaded) return null;
    loaded = true;
    return swapInPlayer(frame, createIframe, data, autoplay);
  };
  return {
    /** The visitor pressed play: load and start. */
    click: () => load(true),
    /** The frame is near the viewport: load quietly. */
    near: () => load(false),
    get loaded() {
      return loaded;
    },
  };
}
