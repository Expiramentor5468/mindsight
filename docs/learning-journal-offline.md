# Learning, journal and offline guide — 3.5

The restore point before this release is branch `backup/pre-learning-journal-offline-2026-10-01`, at `e9c7f322b5c7bf826f962b088346bc643611b3d4`.

## A flexible path

Your path has six areas: foundation, colors/comparison, solid forms, outlines, space, and symbols. The opening activities now differ: learn the session process with four unknown targets; explore four announced examples without scoring; then practice eight deliberate responses. Later lessons introduce the relevant known examples or comparison steps.

The overview and end-of-session screen suggest a next activity, explain why, and offer variety. Every activity is available immediately. Partial and custom practice contributes to the area counts. Older lesson IDs count as practice rather than retroactively claiming completion of a new lesson. Completion means finishing the activity, not demonstrating an ability.

Results can inform a suggestion after at least two completed comparable sessions and 16 unflagged answered trials. The lower bound of the 95% Wilson interval must exceed the task's chance baseline. Up to the five most recent matching sessions are considered. Target sets, answer type, appearance settings, condition, condition notes and practice/measurement mode must match. Announced demo conditions are excluded from this result signal. This is exploratory guidance, not a mastery test or evidence of perception without ordinary sight. Otherwise recommendations use practice experience and variety. Passes, interruptions and flags remain in the journal.

## Remembering your setup

Input mode, recognition engine, viewing condition, condition notes and block length are remembered when you begin. Guided lessons retain their specified length. Name a setup before beginning to save the selected target set and configuration too. Find saved setups in Practice or Go to (Ctrl/Cmd+K). Repeat setup in the journal returns to that session's conditions. Recording stays opt-in for each setup.

## The journal

Sessions appear as cards with date, conditions, response count, notes, audio status and Replay. Search observations or filter by practice area, conditions, mode or audio availability. The activity strip shows the last 14 days; the comparison chart groups matching targets and conditions and has a table of exact values.

Turn on **Show targets beside observations** to see a labeled swatch, symbol or shape next to each linked note. Modern observations keep their actual target snapshot; older notes use their trial or recorded familiarization frame when available. Reflections apply to the session as a whole. Missing associations are labeled instead of guessed. Measurement targets remain hidden until the session finishes.

Replay opens directly from a completed journal card or the completion screen. Export files includes a standalone HTML player with play/pause, time seeking, rewind/forward, speed and synchronized recorded audio. It reconstructs the screen from events without a video file. Older sessions without screen events have an explicitly approximate reconstruction.

## Recording recovery and phone behavior

Saved audio is written in chunks. An interruption or backgrounding the page stops recording and keeps completed chunks. **Resume recording**, or the same typed/spoken command, starts another timed segment in the same session. Stop recording does not end practice. A crash can still lose the last unsaved chunk; recording cannot continue while the browser or OS suspends the page.

On-device recognition keeps its microphone connection during guide speech and suspends decoding. A fresh recognizer prevents buffered guide speech or late results from becoming answers. Browser-provided recognition continues to stop/restart around prompts and may trigger system sounds. MindSight adds no chimes. This change reduces one source of microphone cycling; phone-specific behavior still needs testing on the actual device.

## Complete backup and restore

**Journal → Download complete backup** creates one JSON file containing sessions, replay events, microphone segments, preferences, named setups and earlier archives. It reports any recordings that could not be found. JSON embeds audio in base64, adding roughly one third to its size. The current import/export limit is 256 MB; for larger libraries, export individual sessions and recordings. Offline speech models are downloaded again rather than bundled in personal backups.

**Import history or backup** accepts this complete backup as well as older text exports. Preview shows additions, duplicates and audio segments before import. Existing session IDs and existing audio segments are preserved. Missing matching audio segments are restored. A separate unchecked option restores preferences and merges named setups; local reader endpoints are included, bearer tokens are not. Earlier archives are merged without reinterpreting their scores. Text changes are rolled back if localStorage writes fail; audio already restored is reused on retry. Keep the source backup until the restored journal and audio have been checked.

## Prepare for offline practice

1. Open Settings → Offline & downloads while online, and select **Save / update app offline**. Wait for completion.
2. For voice input, separately choose **Download English voice offline**. Confirm the approximately 46 MB download, or cancel. This step does not request the microphone.
3. Choose On-device recognition for offline input. Use an installed device speech voice, or a running local API/MCP reader, for output. Test audio and microphone before practice. Keyboard/touch remain available without either voice service.
4. Close all MindSight tabs and reopen after an update. Reload once offline before relying on it away from a connection.

Offline preparation caches app pages, scripts, styles, icons and local documentation. External source links require internet. Downloads are staged; incomplete downloads are not marked ready. A previously prepared app remains available while an update is unprepared. Browser storage may be cleared or evicted, so offline storage is not a backup.

## Review notes for later

- Let users rename or remove saved setups once they have accumulated a few, with clear handling for duplicates imported from backups.
- Offer explicit user feedback such as comfortable / frustrating / ready for variety to inform suggestions; current suggestions use recorded activity and cautiously interpreted results.
- Consider a storage meter and multi-file backup format if real recordings regularly approach the current single-file limit.
- Test on the user's Zen desktop and phone, including headphones, background interruptions and a genuinely disconnected restart. Automated tests do not replace that device check.
