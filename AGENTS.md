# Pinnoco agent instructions

These instructions apply to the whole repository. Read them before changing code or running a gameplay check.

## Product boundary

Pinnoco is a chess board for a person and Codex. The web page owns the live board, optional future-line board, and move history. The conversation belongs in Codex.

During a gameplay interaction, use Pinnoco's WebMCP tools and resources as the only source of board state. Do not read repository source files, inspect implementation details, use `agent-browser`, use computer automation, or ask the player to describe a move that WebMCP can report. Browser automation is permitted only for an explicit visual QA task, never as a substitute for WebMCP gameplay.

## Startup protocol

When the WebMCP connection is available:

1. Call `pinnoco_get_started` once and read `pinnoco://guide` when available.
2. Call `pinnoco_get_game_state` or read `pinnoco://game/current` before discussing the board.
3. Ask whether the player wants a normal game or a practice scenario. A normal game keeps the current position; a practice scenario asks for opening, middlegame, or endgame and who moves first, then calls `pinnoco_set_scenario` with the latest `expectedRevision`.
4. Ask for permission to start the board, then call the `pinnoco_start_game` tool. It closes onboarding and does not make a move.
5. If it is the player's turn, call `pinnoco_wait_for_human_move`. If it is Codex's turn in a normal game, privately analyze when useful and use `pinnoco_play_move` for Codex's reply.

The registered `pinnoco_start_game` prompt contains this full flow. The `pinnoco_start_game` tool is the separate action that opens the board after consent.

## WebMCP contracts

Registered tools, in alphabetical order:

- `pinnoco_analyze_position`
- `pinnoco_clear_scenario`
- `pinnoco_get_game_state`
- `pinnoco_get_started`
- `pinnoco_play_move`
- `pinnoco_reset_app`
- `pinnoco_restart_game`
- `pinnoco_set_scenario`
- `pinnoco_show_scenario`
- `pinnoco_start_game`
- `pinnoco_wait_for_human_move`

Registered resources:

- `pinnoco://guide`
- `pinnoco://game/current`
- `pinnoco://game/history`
- `pinnoco://scenario/current`

The page also registers the `pinnoco_start_game` prompt. Keep prompt, resource, and tool registrations alphabetically ordered.

Every mutation must use the latest `expectedRevision`. A stale command must return `STALE_REVISION` and must not change state. Every state response includes `gameId`, `revision`, and `schemaVersion`.

`pinnoco_set_scenario` starts a new live position. It accepts a ready-made opening, middlegame, or endgame, or a complete six-part FEN, and requires `turn: human | agent`. It clears the old live history and stores the scenario title.

`pinnoco_show_scenario` displays a hypothetical line rooted at the current live position. It must never change the live game. The live-game and scenario timelines remain independent and can move backward or forward without rewriting domain state.

## Move authority

- The human may move only the human color.
- Codex may move only the agent color.
- In a normal game, the player's agreement to play authorizes Codex to make its own opponent move after the player's move. It does not authorize Codex to move the human color.
- Codex should use `pinnoco_analyze_position` as a private Stockfish advisor when useful, then choose and commit its own move with `pinnoco_play_move`.
- Keep explanations and critiques on demand. Do not reveal Codex's plan or announce that a human move was wrong unless the player asks.
- Use `pinnoco_play_move` for the human color only when the player explicitly asks Codex to make that exact move for them.
- Read the fresh game state after every accepted move before explaining it.

## Architecture

Keep the ports-and-adapters direction intact:

- `src/domains/` contains immutable chess and scenario models. It must not import React, browser APIs, persistence, or WebMCP.
- `src/application/` contains commands, queries, and the serialized session store. Commands are the only mutation path.
- `src/ports/` contains interfaces for chess rules, repositories, engine, onboarding, and agent integrations.
- `src/adapters/` contains chess.js, Stockfish, local storage, and WebMCP implementations. Protocol-specific types stay here.
- `src/presentation/` renders boards and owns temporary cursors, selection, and other view state. It must not access local storage or register WebMCP capabilities.
- `src/app/` composes adapters during bootstrap.

The store serializes human, agent, and reset commands. Stockfish analysis is read-only and cannot mutate the live game. Accepted mutations publish one persisted snapshot and increment the revision. View cursors never alter the live position returned to Codex.

## Persistence and safety

Persist one validated, versioned game document atomically. Keep the onboarding preference separate from chess state. Keep WebMCP connection tokens out of persistence. Validate untrusted protocol input at the adapter boundary and translate shared domain errors without changing their meaning.

Do not add learner-memory features until the current architecture and verification gates remain green. Do not weaken stale-revision, participant-authority, scenario-isolation, or cleanup guarantees.

## Verification

Run the smallest relevant check while iterating, then run the full gate before handing off:

```bash
npm run architecture
npm run test
npm run build
npm run check
```

The full check must cover architecture boundaries, domain/application tests, persistence tests, WebMCP contract tests, engine-advisor tests, type checking, and the production build. Keep the app runnable at the end of every change.
