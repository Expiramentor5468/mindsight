# Session recordings and local readers (3.4)

Backup before this release: `backup/pre-session-recording-2026-09-30`, commit `15ef0731f4f39fc42bcc13a1f51a886953558960`.

## Recording and sharing

Check **Record microphone audio** during setup. Recording is independent of recognition and continues through guide prompts and reflection. It stops when you select Stop recording, export, leave, or background the page. A repeated block continues recording if the previous recording was still running. A recovered session can start another segment by checking the option again.

Audio is mono, requesting 24 kbit/s, preferring Opus in Ogg (Firefox/Zen) or WebM; the browser may choose a different bitrate. Approximately 3.6 MB for 20 minutes at the requested bitrate, before container overhead. Replay HTML embeds audio with about 33% base64 overhead. Audio contains microphone input, not a direct copy of synthesized guide speech; use headphones to avoid room-speaker bleed. Guide prompts are preserved as text.

Chunks are saved to IndexedDB every five seconds. Closing/crashing a browser can lose the final chunk. Browser storage is not a backup; clearing site data removes recordings and records. Export before clearing data. If storage fails, saved chunks may be incomplete; a visible error is shown. Text records remain separate.

**Export session** offers:
- Offline HTML replay with a time slider, reconstructed targets, answers, prompts, notes, and embedded microphone audio. No server or video needed. Anyone receiving this file can read its data and hear its audio.
- Separate audio file(s), one per recording segment.
- Session JSON with timestamped events and recording start metadata.
- Existing live recognition text, explicitly marked **unverified**. This is not a fresh transcript of the audio. No second model, paid service, or resource-heavy transcription job is run.

Older sessions may have no screen timeline. Replay uses recorded trial start times where available and labels this reconstruction; missing transitions cannot be recovered.

## Reflection

Say **start reflection**, dictate as many sentences as you like, then say **save reflection** or **stop reflection**. Silence does not save a note. **Cancel reflection** discards the draft. The editable draft is saved locally between fragments, but enters the journal’s notes only on explicit save. While dictating, ordinary commands become draft text; save or cancel reflection before saying finish session. Typed edits are included in the same draft.

“End session”, “and session”, “finish session”, and “stop session” are accepted as exact commands outside reflection dictation. Arbitrary sentences containing these words remain observations. Responses still require “my answer is …” and confirmation. These command fixes do not turn the small on-device recognizer into an accurate transcription model.

## Local speech output

Settings → Local voice reader supports:

1. An OpenAI-compatible **audio/speech** endpoint on loopback, returning audio bytes. Configure full URL, model, and voice. The request asks for MP3 and sends `input` text.
2. **MCP Streamable HTTP**, protocol versions 2025-03-26, 2025-06-18, or 2025-11-25. Discovery initializes the connection and lists tools without invoking them. Choose your speech tool explicitly, inspect its input schema, and provide JSON arguments containing `{{text}}`. Test invokes the selected tool. Its result must contain `{type:"audio",mimeType:"audio/wav",data:"<base64>"}` (other audio MIME types are accepted). JSON and SSE responses are supported. Newer-only protocols, stdio, file-path-only results and server-launched playback are not supported by this connector.

The local server must permit this site's origin (`https://expiramentor5468.github.io`) with CORS. Allow POST and the Content-Type, Authorization, MCP-Protocol-Version, and Mcp-Session-Id request headers as applicable; expose Mcp-Session-Id in responses for stateful servers. Browser local-network and mixed-content rules may also apply. Stdio-only MCP servers need a separately operated HTTP bridge. MindSight does not install, start or reconfigure services.

Only loopback hosts localhost, 127.0.0.1 and ::1 are accepted. An optional bearer token is held in the tab's memory, not persisted or exported. Endpoint/model/voice/tool preferences are stored locally. Guide text is sent only to the configured service when that output mode is selected; this setting does not send microphone recordings or replace recognition.

Use **Test selected reader**, then complete the normal spoken readiness check before a voice session. Actual microphone recognition quality and local-service connectivity must be checked on the user's Zen installation.


## Custom sessions, import and keyboard access (3.4)

Backup: `backup/pre-custom-sessions-2026-09-30`, commit `2782bfb24ebd2fcf44b4fe9f0c4f108a62d91f6b`.

Practice groups colors/comparison, solid shapes, open outlines, and position/direction/symbols. The custom builder allows subsets of each family. Shapes support black/red/blue/yellow/green, filled or outlined, and shape-only, color-only or combined answers. Each scored answer is equally likely, and the chance baseline follows the selected set. At least two answers are required. Configuration persists through repeat, recovery and JSON export/import. The learning path links a suggested solid-to-outline progression without changing existing lesson completion IDs.

“Unmasked, closed eyes” is available in session conditions. Touch/keyboard users can Tab through every control and use Enter/Space on focused buttons. During a session, outside editable fields: N advances preparation/feedback, 1–9 chooses an answer, Y confirms, C changes, P passes, Escape pauses/resumes, H gives help, R repeats guidance, and / focuses command entry. Arrow keys navigate answer buttons. Focus moves to the next relevant control when session buttons are replaced. Shortcuts are suspended in dialogs and text entry.

On-device setup opens a confirmation describing the approximately 40 MB model plus 6 MB engine before loading. Cancel is available both before download and while preparation runs. Labels are browser-neutral; compatible Zen/Firefox/Chrome/Edge installations can use the same engine. Capability detection and the spoken check remain required.

Journal → Import history accepts individual session JSON, journal JSON, arrays, and earlier Mindsight Lab exports. Preview lists additions and duplicate IDs. Validation rejects malformed modern sessions; existing IDs are skipped, never overwritten. Older schema records are preserved in separate viewable/exportable archives rather than reinterpreted as new scores. Audio is not part of JSON history; attach it to a replay separately.

Export → Watch replay opens a simulated screen player. Download playable replay saves the same player as standalone HTML. It has play/pause, restart, ±10 seconds, scrubbing, 0.5×–3× speed, volume/mute, fullscreen and keyboard shortcuts. Embedded audio follows its recorded timestamps and playback speed; during audio playback the visual clock follows the audio. A local audio file can replace embedded audio, with an offset control for manual synchronization. Positive offsets start audio later; negative offsets skip audio preceding the session. External attachments and offset changes are for that viewing session and are not embedded back into the file.

Validation: `npm test` runs model/parser/import/export unit tests. `npm ci && npm run test:integration` runs DOM integration tests, including download consent cancellation, custom outlines, keyboard focus/actions, import deduplication, replay speed and audio offset. Mock media verifies control logic; microphone/codecs and OS fullscreen permissions still require a real browser.
