// Every number of the Detective rules lives here (docs/detective/SPEC.md). (C) = Claude's proposal within
// the plan approved on 23.11; change it here, not in the logic.

export const DETECTIVE = {
  /**
   * The game's name where it is installed and in the shared daily result: the working name until the final
   * one is chosen (docs/DECISIONS.md). The short name under the icon is app.name in the dictionaries.
   */
  name: 'way1ong Detective',
  /**
   * Addresses: the studio's site for the "Made by way1ong" line, and the game itself for the shared daily
   * result. null — not public yet: the line has no link, the result has no address.
   */
  links: { site: null as string | null, game: null as string | null },
  /** Every room is drawn on a sheet of this size, in scene units. */
  scene: { width: 1200, height: 800 },
  /** Things to find in a room: in a case and in free search (C). */
  thingsPerScene: 10,
  /** How many of them are evidence in a case (C). */
  cluesPerCase: 3,
  /** Suspects in a case (C; the approved phone sample shows six). */
  suspectsPerCase: 6,
  /**
   * A touch counts within this many CSS pixels of a thing, so even a small thing is a 44 px target (C).
   */
  hitRadiusPx: 22,
  /** The hint draws a ring of this radius (scene units) around a thing not found yet (C). */
  hintRadius: 64,
  /** Zoom: one step multiplies the scale; never closer than this many CSS pixels per scene unit (C). */
  zoomStep: 1.5,
  maxScale: 2,
  /** A screen at least this wide (CSS px per scene unit when the whole room fits) opens with the whole room. */
  wholeRoomScale: 0.55,
  /** Large mode opens the room this much closer (C). */
  bigZoom: 1.3,
  /** The keyboard pointer moves by this many scene units; with Shift — by the bigger step (C). */
  cursorStep: 16,
  cursorBigStep: 80,
} as const;
