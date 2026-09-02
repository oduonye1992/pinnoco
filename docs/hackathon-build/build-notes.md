# Build Notes

## Guided Build — Ideate

- Onboarding completed in three short rounds.
- Project name supplied by participant: **Pinnoco**. Preserve this exact spelling unless the participant changes it.
- Core concept: peer-to-peer chess where each player has a private Codex collaborator and a local Future Board for hypothetical variations.
- Product modes: human versus human over a true peer-to-peer connection; human versus Codex, where Codex is the opponent only.
- Agent behavior: Codex may independently propose and evaluate candidate moves, then manipulate the Future Board through WebMCP so the player sees the line unfold.
- Live-move behavior: the player instructs Codex conversationally to make the real move; no separate embedded chat or webpage commit button is planned at this stage.
- Visual direction: dark theme.
- Technical preference known so far: TypeScript. Stack selection was deliberately deferred until the technical specification.

### Active-shaping moments

- Participant corrected the initial UX assumption that the webpage needed its own agent chat: “the agent is in codex.” The product now treats Codex as external and the webpage as the visible WebMCP-controlled surface.
- Participant expanded the product from a solo tutor into peer-to-peer human–agent doubles chess, while retaining a separate play-versus-agent mode.
- Participant chose true peer-to-peer behavior instead of substituting an ordinary server-hosted multiplayer room.
