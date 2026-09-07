# Pinnoco Architecture Plan

## Objective

Refactor Pinnoco from a single-component prototype into a domain-first application without breaking its current behavior.

The finished application must keep the live game, hypothetical analysis, persistence, agent integrations, and presentation code in separate architectural boundaries.

## Delivery rules

- Keep the application runnable at the end of every phase.
- Complete each verification gate before starting the next phase.
- Keep directories, files, exports, and registered MCP items alphabetically ordered.
- Add comments only when they explain a decision, restriction, or non-obvious invariant.
- Do not add Stockfish or learner-memory features until the architectural refactor passes its tests.

## Cross-cutting invariants

These rules apply to every phase and adapter.

### Command serialization and revisions

- The application processes commands through one serialized command queue.
- Every accepted domain mutation increments a monotonically increasing `revision`.
- Every state snapshot and agent-facing response includes its `revision`.
- External mutation commands include the `expectedRevision` they were based on.
- A command with an old `expectedRevision` fails with `STALE_REVISION` and cannot mutate state.
- Human and agent actions use the same command queue.

### Domain state and view state

Domain state contains facts about the chess session:

- Active scenario.
- Current live position.
- Game status.
- Move history.
- Participants and their authority.

View state contains temporary interface choices:

- Game-history cursor.
- Last announcement.
- Scenario-history cursor.
- Selected square.

View state cannot change the live position. Agent resources return the current domain position even when the human is viewing an earlier position.

### Participant authority

Every `GameSession` defines:

- `agentColor`.
- `agentMode`: `opponent`, `teacher`, or `opponentAndTeacher`.
- `humanColor`.
- `sideToMove`.

The domain enforces these rules:

- The agent cannot play a move for the human unless the human explicitly requests that exact action.
- The agent cannot make consecutive live moves for both sides.
- The agent cannot play when it is not the authorized side.
- Teaching and scenario actions never grant permission to make a live move.
- Turn authority is checked again when the command executes, not only when it is proposed.

### Scenario lifecycle

- A scenario is rooted at an immutable live-game position.
- A scenario records its source move number and source position identifier.
- A live move never rebases or mutates an existing scenario.
- The interface labels a scenario with its source move when the live game has advanced.
- Opening a new scenario replaces the active scenario.
- Only an explicit clear, replacement, or game restart removes the active scenario.

### Typed errors

Commands return a shared result type instead of throwing unstructured strings.

```ts
type DomainError =
  | { code: 'ILLEGAL_MOVE'; message: string }
  | { code: 'INVALID_POSITION'; message: string }
  | { code: 'NOT_AUTHORIZED'; message: string }
  | { code: 'NOT_LIVE_POSITION'; message: string }
  | { code: 'STALE_REVISION'; message: string }
  | { code: 'WRONG_TURN'; message: string }

type Result<T> =
  | { ok: true; value: T }
  | { error: DomainError; ok: false }
```

Adapters translate these errors for their protocol or interface without changing their meaning.

### Versioned contracts

Every persisted document, MCP resource, tool result, and application snapshot includes:

```ts
interface ContractMetadata {
  gameId: string
  revision: number
  schemaVersion: number
}
```

Contract changes require an explicit schema-version decision and contract tests.

### Agent integration lifecycle and security

- Agent capabilities register idempotently.
- Consequential tools require clear player intent before execution.
- Development hot reload cannot create duplicate registrations.
- Disconnecting or unmounting releases registrations and event listeners.
- Legacy connection tokens remain in the bridge session and never enter game persistence.
- Protocol input is untrusted and validated before reaching application commands.
- Reconnection restores one capability set without duplicating tools, prompts, or resources.
- Remote bridge code remains version-pinned and integrity-checked until it is vendored or removed.
- The legacy bridge is an adapter and cannot leak its types into the application or domain layers.

### Persistence document

Pinnoco stores one validated document atomically:

```ts
interface PinnocoDocument {
  analysis: AnalysisWorkspace | null
  game: GameSession
  revision: number
  schemaVersion: number
}
```

The repository validates the complete replacement document before publishing it to the application store.

The first-visit onboarding flag is a separate UI preference. It contains no chess state. If browser storage is unavailable, game commands fall back to an in-memory repository and remain playable for the current page session.

## Phase 1: Establish the architecture

### Work

- Add the target directory structure.
- Document dependency boundaries.
- Document naming and ordering conventions.
- Define the live-game and scenario invariants.
- Define the allowed import graph.
- Define the shared error and result contracts.
- Configure automated dependency-boundary checks where practical.

### Verification gate

- Every planned module has one clear responsibility.
- Import direction is documented and enforceable.
- No implementation behavior changes.

## Phase 2: Protect current behavior

### Work

Add characterization tests for:

- Clearing a scenario.
- Creating and navigating a scenario.
- Loading and migrating persisted state.
- Making legal and illegal moves.
- Navigating live-game history.
- Rejecting stale revisions.
- Registering MCP prompts, resources, and tools.
- Restarting a game.
- Separating live state from history cursors.
- Serializing simultaneous human and agent commands.

### Verification gate

- The current production build passes.
- All existing behavior is represented by tests.
- Browser tests confirm the board still works.

## Phase 3: Extract the domains

### Work

Create pure TypeScript models for:

- `AnalysisWorkspace`
- `ChessMove`
- `GameParticipants`
- `GameSession`
- `PositionNode`
- `ScenarioTree`

Replace parallel arrays and duplicated FEN state with immutable position nodes.

### Domain invariants

- A live move can only extend the latest live position.
- A live move must satisfy participant and turn authority.
- A scenario is rooted at a specific live-game position.
- A scenario can never mutate the live game.
- Every non-root position has one parent move.
- Every stored FEN must be valid.
- History cursors select positions; they do not rewrite history.
- Replacing a scenario cannot change the live-game revision except through the accepted scenario command.

### Verification gate

- Domain tests run without React, DOM APIs, local storage, or WebMCP.
- Illegal state transitions return explicit errors.
- Main lines and scenario branches replay deterministically.

## Phase 4: Add the application layer

### Commands

- `clearScenario`
- `playMove`
- `restartGame`
- `showScenario`

### Queries

- `getAgentGuide`
- `getGameHistory`
- `getGameState`
- `getScenarioState`

### Ports

- `AgentPort`
- `EnginePort`
- `GameRepository`

### State

Create one observable `ChessSessionStore`. React and agent adapters must call the same commands and read the same immutable snapshots.

The store must:

- Increment `revision` after each accepted mutation.
- Publish one snapshot after the complete mutation succeeds.
- Reject stale external commands.
- Serialize human and agent commands.
- Keep domain state separate from presentation view state.

### Verification gate

- No component or adapter mutates chess state directly.
- Commands are the only mutation path.
- Queries do not mutate state.
- React refs no longer mirror application state.
- Simultaneous commands cannot interleave state changes.
- Stale commands cannot change the application state.

## Phase 5: Isolate persistence

### Work

- Implement `LocalStorageGameRepository`.
- Persist one `PinnocoDocument` value atomically.
- Validate persisted values at the adapter boundary.
- Preserve explicit schema versions.
- Move migrations into named migration functions.
- Recover safely from missing or corrupt data.

### Verification gate

- React does not access `localStorage`.
- Reloading restores the game and analysis workspace.
- Old storage formats migrate successfully.
- Invalid storage does not crash the application.
- Partial or invalid migrations never replace the last valid in-memory state.
- View-only state cannot be mistaken for the current live position.

## Phase 6: Isolate agent integrations

### Native WebMCP adapter

Use the current browser WebMCP API for tools only.

### Jason MCP bridge adapter

Use the legacy bridge for MCP prompts, resources, and tools.

### Prompt

- `pinnoco_start_game`

### Resources

- `pinnoco://game/current`
- `pinnoco://game/history`
- `pinnoco://guide`
- `pinnoco://scenario/current`

### Tools

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

### Restrictions

- Validate every input before calling an application command.
- Include contract metadata in resources and tool results.
- Keep connection tokens outside application persistence.
- Keep protocol-specific types inside their adapters.
- Keep registrations alphabetically ordered.
- Register adapters during application bootstrap, not inside React views.
- Require clear player intent before changing the live game.
- Require `expectedRevision` for external mutation commands.
- Let the agent wait for a human move by revision, so the player does not have to narrate board actions.
- Unregister capabilities and listeners during cleanup.

### Verification gate

- Native and legacy adapters can be tested independently.
- Registration and reconnection are idempotent.
- Tool contracts have validation and contract tests.
- The MCP bridge lists the expected prompt, resources, and tools.
- Agent actions and human actions produce identical domain state.
- Stale agent commands return `STALE_REVISION` without changing state.

## Phase 7: Split the presentation layer

### Components

- `ChessBoard`
- `GameBoard`
- `ScenarioBoard`
- `TimelineControls`

### Hooks

- `useChessSession`

### Restrictions

- Presentation code cannot import `chess.js`.
- Presentation code cannot access persistence.
- Presentation code cannot register WebMCP capabilities.
- Components receive display state and dispatch application commands.
- History cursors remain presentation state and cannot change agent-facing live state.

### Verification gate

- The main application component only composes the screen.
- Board interaction works with mouse, touch, and keyboard.
- Main and scenario histories remain independently navigable.

## Phase 8: Verify the complete foundation

### Automated verification

- Application-command tests.
- Browser interaction tests.
- Domain unit tests.
- MCP contract tests.
- Persistence integration tests.
- Production build and type checking.

### User flows

- Agent makes a requested move.
- Agent opens and closes a scenario.
- Human makes a move.
- Human navigates both histories.
- Human and agent submit commands at nearly the same time.
- Page reload restores the session.
- Reconnecting WebMCP does not duplicate capabilities.
- Restart clears the correct state.
- Stale agent commands are rejected safely.
- Scenario branches never change the live board.
- The agent reads the live position while the human views an earlier move.

### Verification gate

- All automated checks pass.
- No browser errors occur.
- The original product behavior remains intact.
- The dependency rules are satisfied.

## Phase 9: Add objective engine analysis for Codex

### Work

- Add a Stockfish Web Worker adapter behind `EnginePort`.
- Add a read-only agent-facing analysis capability that returns bounded candidate lines without mutating the live game.
- Let Codex choose and submit its own opposing move through the existing revisioned command path.
- Keep engine work off the main UI thread.
- Support bounded analysis time and cancellation.
- Support MultiPV candidate lines.
- Cache evaluations by FEN and engine settings.

### Verification gate

- The interface stays responsive during analysis.
- Engine cancellation works when the position changes.
- Codex explanations can reference objective evaluation data.
- The application still works when the engine is unavailable.
- A stale or unavailable engine result cannot mutate or overwrite the live game.
- Results computed for an old revision cannot attach to a newer position.

## Phase 10: Add the learning system

### Coaching loop

1. Predict.
2. Visualize.
3. Compare.
4. Explain.
5. Reflect.

### Learner memory

- Common strategic mistakes.
- Concepts already understood.
- Preferred explanation depth.
- Recent lessons and reflections.
- Recurring tactical patterns.

### Verification gate

- Coaching adapts without changing chess rules or engine results.
- Learner data has a versioned persistence model.
- The player can reset learner memory independently of game history.
- The player can inspect and delete locally stored learner data.

## Target directory structure

```text
src/
├── adapters/
│   ├── agent/
│   ├── chess/
│   └── persistence/
├── app/
├── application/
│   ├── commands/
│   └── queries/
├── domains/
│   ├── analysis/
│   ├── game/
│   ├── learner/ (Phase 10)
│   └── session/
├── ports/
├── presentation/
│   ├── components/
│   └── hooks/
└── shared/
    ├── contract-metadata.ts
    ├── domain-error.ts
    └── result.ts
```

## Recommended implementation milestone

Phases 1 through 8 form the architecture refactor and should be completed before introducing new product features.

Phases 9 and 10 add engine intelligence and learner adaptation after the foundation is stable.
