# MindSight

A voice-led, experimental mindsight practice companion. Static HTML, CSS and JavaScript; no account, build step, analytics or application server.

## Included

- Flexible four-week introduction and eight independently accessible exercises: two/four colors, same/different, location, shapes, orientation, numbers and letters.
- Guided settling, blank-screen baseline, announced familiarization and unknown-target practice.
- Actual spoken readiness check before every voice session; touch and keyboard alternative.
- Explicit answer confirmation, feedback with the target held in place, self-paced progression and separate quiet measurement blocks.
- Local autosave and recovery, observations distinguished from answers and post-feedback notes, JSON export, preserved earlier app records.
- Independent random targets, balanced same/different probability, chance baselines, uncertainty intervals, and retained passes, interruptions and mask-problem flags.

Read [the research and training blueprint](docs/research-blueprint.md) for sources, rationale and limitations. This is an original synthesis of public instructional materials, not a licensed teacher's course or an established method for acquiring perception without ordinary sight. Physical-card coaching, photographs, remote viewing and expanded symbol sets described as future options in the blueprint are not included.

## Run

Use Node 20+ for tests and Python 3 for the static development server:

```sh
npm test
npm start
```

Open http://localhost:4173. GitHub Pages deploys the repository using the existing workflow on pushes to `main`.

## Voice and data

Voice uses browser speech synthesis and either native speech recognition or an on-device Vosk fallback. Zen / Firefox automatically use Vosk. The setup also lets other browsers explicitly select On-device. The initial English model download is about 40 MB; model startup requires available device memory. Recognition audio stays local in this mode. Downloads come from the pinned vosk-browser 0.0.8 package on jsDelivr (integrity checked) and the upstream Vosk Browser model host. The app first loads the model, then asks for a separate click to test audio and microphone. Recognition requires HTTPS (or localhost) and microphone permission. On-device mode also requires WebAssembly, workers and Web Audio; native recognition may require a connection to the browser's speech provider. Speak after each prompt finishes; recognition pauses during playback to prevent feedback from becoming an answer. The visible Pause button or Space key interrupts playback. Real microphone and audio behavior must pass the built-in check on the actual device.

Sessions are stored in this browser's local storage. Export regularly; clearing site data deletes records. MindSight does not retain audio, but the browser's speech provider may process it remotely. Unreadable existing records are not overwritten. Export remains available if storage fails.

## Verification

`npm test` checks target vocabularies, comparison randomization, command parsing, confirmation, duplicate prevention, recovery, scoring and note timing. `tests/browser.cjs` contains a Playwright integration scenario with mocked speech APIs; run it with a local server and Playwright plus Chromium installed. Set `NODE_PATH` or `CODEX_PRIMARY_RUNTIME_NODE_MODULES` if Playwright is installed outside this project. Browser tests cannot certify real speech recognition or blindfold performance.

## Speech engine attribution

[vosk-browser](https://github.com/ccoreilly/vosk-browser), version 0.0.8, Apache-2.0; [Vosk](https://github.com/alphacep/vosk-api), Apache-2.0; English model `vosk-model-small-en-us-0.15`, Apache-2.0. External assets are loaded from upstream rather than redistributed in this repository.
