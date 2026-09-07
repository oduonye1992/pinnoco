# Pinnoco design memory

This is the designer's persistent memory for visual review iterations. Reviewers are intentionally stateless and receive only the current screenshot; this document carries the decisions forward between reviews.

## Product promise

Pinnoco is a quiet chess study. A person plays a real board, then talks with an agent about why a move matters. The web page stays focused on the position and the line being explored.

## Approved direction

- Dark editorial study surface, not a dashboard or marketing poster.
- Flat ink, spruce, ivory, and one coral action color.
- Calibri/Carlito typography with a clear, calm hierarchy.
- Board is the hero object. The copy explains the next action.
- No gradients, glass, neon, decorative cards, or chat panel in the game.
- The first-run board must be a true 8×8 starting position.
- The current move needs an obvious origin and destination.
- The Start action must clearly begin the exercise.

## Recurring review findings

1. The board is the strongest visual anchor, but the pieces must remain legible on both square colors.
2. A split board/copy composition can feel like a concept slide when the copy leaves a large dead zone.
3. Repeating “White to move” and “e2 → e4” makes metadata feel decorative. Each fact should have one primary home.
4. Generic AI language (“ask Codex what…”, “see the line”) weakens the chess-world voice. Copy should describe the human action in plain language.
5. Tiny coordinates and quiet study labels disappear in a normal screenshot.
6. A visible learning sequence helps the screen read as a real tool: play, ask, follow the line.
7. Reviewers repeatedly penalize image-set inconsistency and fuzzy piece treatment.

## Changes already made

- Replaced the malformed 9-row onboarding grid with a real 8×8 board.
- Added file/rank coordinates and e2/e4 source/destination labels.
- Made the layout full-bleed and removed the outer card treatment.
- Changed the first action to “Try e4” and made the lesson copy explain the center in plain language.
- Added a compact three-step study path (Center / Develop / Castle) at the bottom of the copy.
- Flattened piece rendering and added only small contrast edges where a piece crosses a similar square tone.
- Added explicit source, destination, and center-square states to the opening board.
- Reworked the move mark into a grid-routed arrow and gave the board a quiet flat frame.
- Tightened the board/copy relationship, replaced generic onboarding phrasing with a concrete center lesson, and unified piece rendering with one flat fill/stroke treatment across square colors.
- Reversed the desktop split so the lesson leads from the left, centered the lesson block on the board, simplified the board annotation to one move path plus controlled squares, and made the opening copy chess-specific.
- Re-centered the board in its pane, made `e2 → e4` the primary proof, replaced the pseudo-chat prompt with a single factual takeaway, and added explicit lesson count plus readable target coordinates.

## Next review priorities

1. Check piece legibility at screenshot size, especially black pieces on spruce and white pieces on ivory.
2. Check that the board caption, move cue, and study path read as one system rather than separate labels.
3. Keep the lower right area purposeful without adding dashboard clutter.
4. If the onboarding reaches a strong bar, review the live scenario state using the same visual principles.

## Reference study: Awwwards Mobile & Apps

The reference set is broad, but the repeated studio-level moves are consistent: one dominant visual per viewport, generous breathing room, restrained utility chrome, strong type scale contrast, and short labels that anchor each image or interaction. The strongest pages make the product itself the image; they do not surround it with extra cards. For Pinnoco this means the board stays the hero, the lesson copy is one clear editorial block, and the move state gets a single memorable accent. The references also favor a clean grid and disciplined spacing over decorative effects, so the dark study surface remains flat and the visual interest comes from composition, typography, and the board state.

## Review history

Scores have generally been in the 6–7 range. The low scores were useful evidence, not training of the reviewer: the designer must apply the recurring findings above and verify each change visually.
