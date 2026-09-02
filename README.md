# Pinnoco

Pinnoco is a shared chess board for you and Codex.

- Play legal moves on the live board.
- Talk about the game in Codex.
- Let Codex play a move or open a second board with a possible line.
- Step through that line without changing the live game.
- Move backward and forward through the game or a scenario.
- Come back later and keep playing where you stopped.

## Run locally

```bash
npm install
npm run dev
```

## WebMCP tools

The page registers six tools through two compatible paths:

- Native WebMCP through `document.modelContext`, with an older `navigator.modelContext` fallback.
- Jason McGhee's WebMCP 0.1.13 bridge, which connects the page to a local MCP client using its token widget.

- `pinnoco_get_started` — tells a new agent how to work with the player and which tool to call next.
- `pinnoco_get_game_state`
- `pinnoco_play_move`
- `pinnoco_show_scenario`
- `pinnoco_clear_scenario`
- `pinnoco_restart_game`

The live board also works without WebMCP. Game and scenario state are saved in local storage.

The `<html>` element exposes `data-webmcp-status` and `data-webmcp-bridge` to make both connections easy to inspect.

## Connect the Jason WebMCP bridge

Configure Codex to run the bridge MCP server:

```toml
[mcp_servers.webmcp]
command = "npx"
args = ["-y", "@jason.today/webmcp@0.1.13", "--mcp"]
startup_timeout_sec = 120
```

Restart Codex, ask it to create a WebMCP token, then paste that token into the small amber connector on the page.

When a new agent connects, it should call `pinnoco_get_started` once, then call `pinnoco_get_game_state` before discussing the position.

The Jason WebMCP bridge also registers:

- Prompt: `pinnoco_start_lesson`
- Resource: `pinnoco://game/current`
- Resource: `pinnoco://guide`

The game resource is read live, so it reflects the board at the time the agent opens it.
