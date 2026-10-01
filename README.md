# MindSight

An experimental practice companion with voice, keyboard and touch controls. Static HTML, CSS and JavaScript; no account, analytics or application server.

## Included

- Six open practice areas with distinct guided activities, recorded progress, an explained next suggestion, a variety option and repeatable setups. Previous and custom sessions count toward experience. No exercises are locked.
- Two/four colors, same/different, position, direction, numbers, letters, solid shapes and black or colored outlines. Custom subsets and named setups retain their configuration.
- Explicit answer confirmation, self-paced feedback and separate quiet measurement blocks. Randomized targets, chance baselines, uncertainty intervals, passes, interruptions and flags remain visible.
- A visual journal with search and filters, optional targets beside observations, comparison of matching conditions and prominent replay controls.
- Optional microphone recording, recoverable audio segments, explicit reflection saving, simulated offline HTML replay, and complete backup/restore including audio, settings, setups and earlier archives.
- Explicit offline preparation for the app and an optional English recognition download. Dark mode, larger text and keyboard navigation throughout.

Read [the research and training blueprint](docs/research-blueprint.md) for sources and limitations, [recording and reader details](docs/session-recordings.md), and [the 3.5 guide](docs/learning-journal-offline.md). This is an original synthesis of public instructional materials, not a licensed teacher's course or an established method for acquiring perception without ordinary sight.

## Run and verify

Use Node 20+ and Python 3:

```sh
npm ci
npm test
npm run test:integration
npm start
```

Open http://localhost:4173. The existing GitHub Pages workflow deploys pushes to `main`. Unit tests cover state transitions, scoring, guidance, backup restoration, audio recovery and simulated offline cache behavior. DOM integration covers the lesson, journal, keyboard, preset, import and replay flows. Mocked devices cannot certify recognition quality, phone system sounds, actual codecs or device-specific offline behavior; use the built-in spoken check on the intended device.

## Voice and data

Zen / Firefox use on-device Vosk when native recognition is unavailable. Compatible other browsers can explicitly choose On-device. Preparation requires confirmation before downloading about 40 MB of model data plus a 6 MB engine, followed by a separate audio/microphone check. Recognition requires HTTPS (or localhost), permission and supported WebAssembly, workers and Web Audio.

On-device recognition retains the microphone connection during guide playback but suspends decoding, discarding late results and starting a fresh recognizer afterward. Browser-provided recognition may still make operating-system start/stop sounds. No extra sound cues are added. Offline recognition requires saving its files in Settings; spoken guidance requires an installed device voice or a running local speech reader.

Text records live in localStorage; optional audio chunks live in IndexedDB. **Journal → Download complete backup** saves both, plus preferences, named setups and earlier archives. Keep this file outside browser storage. Clearing site data removes local records, recordings and offline files. Recognition-provider audio processing is separate from the optional recorder. Local reader tokens stay in tab memory and are excluded from backups.

## Speech engine attribution

[vosk-browser](https://github.com/ccoreilly/vosk-browser) 0.0.8, [Vosk](https://github.com/alphacep/vosk-api), and `vosk-model-small-en-us-0.15` use Apache-2.0 licenses. The pinned engine is integrity checked. Assets are downloaded from jsDelivr and the upstream model host, and optionally cached by the user; they are not redistributed in this repository.
