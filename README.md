# Pinnoco

Pinnoco is a chess strategy board shared by a player and Codex. The page stays focused on the real board, a separate possible-line board, and their timelines; the conversation stays in Codex.

## OpenAI WebMCP Hackathon

Pinnoco is a submission for the OpenAI WebMCP Hackathon. It shows how a web page can give an agent a safe, useful interface for a live activity without putting the conversation inside the page.

**Live site:** [chess.oduonye.com](https://chess.oduonye.com)

The Vercel alias [webmcp-khaki.vercel.app](https://webmcp-khaki.vercel.app) points to the same production deployment.

The board is the product. Codex is the coach and opponent. WebMCP connects them through named tools and live resources, so Codex can read the current position, set a practice scenario, wait for a human move, and play its own move. The agent does not need to read the repository or control the page with browser automation.

### How it works

1. Open the live site and copy the short connection prompt from onboarding.
2. Paste it into Codex. Codex opens Pinnoco and calls its WebMCP tools.
3. Codex asks whether to keep the current game or practice an opening, middlegame, or endgame, and who moves first.
4. After permission, Codex starts the board. You move on the board; Codex sees the move through WebMCP and replies when it is the agent's turn.
5. Ask Codex to explain a move or show a possible line. The board keeps live play, scenarios, and step-by-step history separate.

The app stores the current game locally in the browser, so returning to the site keeps the position. Reset clears the saved session and opens onboarding again.

- Play legal moves on the live board with click or drag-and-drop.
- Let Codex play the opposing side with private Stockfish analysis available when it needs help choosing a move.
- Talk about the game in Codex.
- Let Codex play a move or open a second board with a possible line.
- Step through that line without changing the live game.
- Move backward and forward through the game or a scenario.
- Pick a queen, rook, bishop, or knight when a pawn is promoted.
- Come back later and keep playing where you stopped.

## Run locally

```bash
npm install
npm run dev
```

The dev server runs at [http://127.0.0.1:5573](http://127.0.0.1:5573).

The same commands are available through the Makefile:

```bash
make install
make dev
make token
make check
make preview
make deploy
```

Use `npm run check` to enforce architecture boundaries, run the contract and domain tests, type-check the project, and create a production build.

## Architecture

The code follows a ports-and-adapters layout:

- `domains` owns immutable game and analysis models.
- `application` owns revisioned commands and read queries.
- `ports` defines rules, persistence, engine, and agent boundaries.
- `adapters` connects chess.js, local storage, and both WebMCP transports.
- `presentation` renders the boards and keeps view cursors out of domain state.

The full decisions, invariants, restrictions, and remaining learner-work plan are in [docs/architecture-plan.md](docs/architecture-plan.md).

## WebMCP capabilities

The page registers eleven tools through two compatible paths:

- Native WebMCP through `document.modelContext`, with an older `navigator.modelContext` fallback.
- Jason McGhee's WebMCP 0.1.13 bridge, which connects the page to a local MCP client using its token widget.

- `pinnoco_analyze_position` — privately returns Stockfish candidate lines without changing the live game.
- `pinnoco_clear_scenario`
- `pinnoco_get_game_state`
- `pinnoco_get_started` — tells a new agent how to work with the player and which capability to use next.
- `pinnoco_play_move`
- `pinnoco_reset_app` — clears the saved game and onboarding state, then opens onboarding again.
- `pinnoco_restart_game`
- `pinnoco_set_scenario` — starts an opening, middlegame, endgame, or custom FEN and chooses who moves first.
- `pinnoco_show_scenario`
- `pinnoco_start_game` — opens the board after the player gives permission; it does not make a move.
- `pinnoco_wait_for_human_move` — waits for the player's next board move and returns it with the fresh position.

The local Stockfish worker is a private advisor. Codex owns the opposing turn and uses `pinnoco_play_move` after the player has agreed to play a normal game. Codex keeps explanations and critiques on demand, and can still choose a legal move when Stockfish is unavailable.

Every agent mutation requires the revision from the latest state read. Stale commands are rejected instead of overwriting a newer human or agent action. The live board also works without WebMCP. One validated, versioned game document is saved in local storage. If browser storage is blocked, the current page keeps working in memory.

The `<html>` element exposes `data-webmcp-status` and `data-webmcp-bridge` to make both connections easy to inspect.

## Connect the Jason WebMCP bridge

Configure Codex to run the bridge MCP server:

```toml
[mcp_servers.webmcp]
command = "npx"
args = ["-y", "@jason.today/webmcp@0.1.13", "--mcp"]
startup_timeout_sec = 120
```

Restart Codex, generate a one-time token with `make token` or ask Codex to create one, then paste that token into the small amber connector on the page.

When a new agent connects, it should open the Pinnoco page, call `pinnoco_get_started` once, then call `pinnoco_get_game_state` before discussing the position. Ask whether the player wants a normal game or a practice scenario. For a normal game, ask permission to start, call `pinnoco_start_game`, wait for the player's move with `pinnoco_wait_for_human_move`, privately call `pinnoco_analyze_position` when useful, and use `pinnoco_play_move` for Codex's own reply. Keep explanations brief unless the player asks. For a practice scenario, ask whether the player wants an opening, middlegame, or endgame and who moves first, then call `pinnoco_set_scenario` before starting. Use `pinnoco_show_scenario` only for requested hypothetical lines. Retry waiting after a timeout while the game is open.

The Jason WebMCP bridge also registers:

- Prompt: `pinnoco_start_game`
- Resource: `pinnoco://guide`
- Resource: `pinnoco://game/history`
- Resource: `pinnoco://game/current`
- Resource: `pinnoco://scenario/current`

Resources are read live and return the game ID, revision, and contract schema version. Game history and scenario state are separate resources so an agent can request only the context it needs.
