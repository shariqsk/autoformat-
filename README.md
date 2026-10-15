# AutoFormat

**Talk the way you talk. Get back writing that still sounds like you.**

AutoFormat is a dictation desk for people who'd rather talk than type. Hit record and ramble ("yeah bro, so basically…"). Whisper transcribes it **on your device** while you speak. Then pick a layout and how much polish you want, and you get a blog post, listicle, thread or newsletter that reads like you wrote it on a good day, not like a chatbot rewrote you.

![AutoFormat in the default Yap look: a rambling transcript on the left, a formatted post with a voice report on the right](docs/theme-yap.png)

<p align="center"><img src="docs/theme-studio.png" width="49%" alt="The Studio look: dark, with an acid-lime glow" /> <img src="docs/changes-panel.png" width="49%" alt="The Changes view: every word that was cut or added" /></p>

---

## Why it's different

Most "AI formatters" hand your words to a model and get back something that sounds like everyone else. AutoFormat is built the other way round. **Your voice is the product**, and the app proves it hasn't been lost:

- **"How much of you" dial.** Every level keeps your words, slang and opinions.
  - **Word for word:** punctuation and paragraphs only.
  - **No filter:** fixes the flow (ums, false starts, "you know") but keeps swearing, jokes and "bro".
  - **Polished:** tighter, nothing crude.
  - **Formal:** "you in a blazer". A handful of word swaps like *gonna → going to*. Same sentences, same contractions.
- **Live proof as you choose.** The dial shows a before/after diff of the messiest sentence from *your own* transcript, so you can see exactly what each level will do.
- **Sounds-like-you score.** After formatting, a voice report measures how much of the page is your own words, in your order, and lists any words the editor introduced.
- **AI-tell detector.** Words like *delve, tapestry, leverage, seamless* and *it's worth noting*, plus em-dash overuse, are highlighted like a marker pen. One click fixes them, and one click undoes the fix. The same list is banned in every prompt.
- **Changes view.** Track changes from what you said to what's on the page. Click any word that was cut to put it on your keep-list for good.
- **Voice profile:**
  - **Words that stay:** your catchphrases survive every level and every model.
  - **Words Whisper gets wrong:** a dictionary for misheard names ("clawed" → "Claude").
  - **How you write:** paste samples of your own writing and AI editors match your rhythm.
- **Small models only name things.** A 1B model can't rewrite you without drifting, so by default the in-browser AI writes only the **title and section headings**. Every sentence stays yours.

## Features

**🎙️ Talk**

- **Live Whisper transcription.** The recording is cut into ~12 s segments at natural pauses and transcribed while you speak, so the text is ready the moment you stop. It runs on your device using WebGPU (or WASM as a fallback), with Tiny / Base / Small / multilingual / Large-v3-Turbo models.
- **Browser speech mode** puts words on screen instantly as you speak (Chrome sends that audio to Google).
- **Tape-deck controls:** live waveform, timecode, pause and resume (<kbd>Space</kbd>), and **Save audio** for every take.
- **Other input:** upload or **drag in** any audio or video file, or drop a `.txt`/`.md`. **Sample** loads a demo ramble.

**📐 Shape**

- **10 layouts:** blog, listicle, how-to, essay, newsletter, Q&A, X/Threads, LinkedIn, notes, journal. Each has a drawn thumbnail.
- **Options:** 4 voice levels; length (*Tight / Balanced / Everything*); title, TL;DR and tag toggles; a free-form *note to the editor*.
- **5 editors:**

| Editor | Runs | Cost | What it does |
| --- | --- | --- | --- |
| **Instant** | In your browser | Free | Rule-based cleanup and layout in milliseconds. Never invents a word; headings come from your own opening clauses ("The Thing That Surprised Me Most"). |
| **In-browser AI** | Your GPU (WebGPU) | Free | Gemma 3 1B / Qwen 2.5 via transformers.js writes the title and headings; your sentences stay untouched. A full-rewrite mode is available as an experiment. |
| **Ollama** | Your machine | Free | Any local model. Full voice-preserving edit. |
| **OpenAI-compatible** | Anywhere | Varies | LM Studio, llama.cpp, Groq, OpenRouter, OpenAI… |
| **Claude** | Anthropic API | Paid | Opus 5.5 / Sonnet 5.5 / Haiku 5.5 with your own key. Best editing quality. |

**📄 Page**

- **Read view:** serif reading layout with an editable title, description and tags, plus **other titles, in your words** offered as one-click swaps.
- **Voice report:** sounds-like-you score, AI tells (with fix and undo), and reading grade.
- **Listen** reads the draft aloud. It's the fastest way to hear whether it still sounds like you.
- **Threads** become per-post cards with character counts and copy buttons.
- **Export:**
  - Markdown with YAML front matter (Astro, Next.js, Hugo, Jekyll)
  - an HTML fragment for any CMS
  - a standalone web page with SEO meta tags
  - plain text
  - JSON
  - an **agent brief**: a ready-to-paste task for Claude Code, Cursor or any coding agent to publish the post on your blog

  Copy from the Read view puts **rich HTML** on the clipboard, so formatting survives a paste into Google Docs, Notion, Medium or WordPress.

**🎨 Four looks** (Style menu, or <kbd>⌘</kbd><kbd>.</kbd> to flip through them)

| Look | Feel |
| --- | --- |
| **Yap** (default) | Loud and tactile: ink outlines, chunky offset shadows, colour-blocked sticker headings, a scrolling ticker. Unbounded + Bricolage Grotesque. |
| **Studio** | A dark audio plugin with an acid-lime glow. Space Grotesk + Geist. |
| **Desk** | Editorial paper and ink with one on-air red. Instrument Serif + Newsreader. |
| **Night Desk** | The desk after dark. |

Themes are more than palettes. Each one sets borders, radii, shadow style, press depth, typography and label treatment through tokens, restyles shared component classes, and has its own masthead.

<p align="center"><img src="docs/style-picker.png" width="80%" alt="The style picker with live previews of each look" /></p>

**✨ Everything else**

- **Searchable drafts:** the last 50, stored only in your browser.
- **Installable PWA:** the app shell works offline, and models are cached after their first download.
- **Keyboard first:**

| Key | Action |
| --- | --- |
| <kbd>R</kbd> | Record / stop |
| <kbd>Space</kbd> | Pause / resume |
| <kbd>⌘</kbd><kbd>↵</kbd> | Format |
| <kbd>⌘</kbd><kbd>⇧</kbd><kbd>C</kbd> | Copy |
| <kbd>⌘</kbd><kbd>K</kbd> | Drafts |
| <kbd>⌘</kbd><kbd>.</kbd> | Change the look |
| <kbd>?</kbd> | Help |

<p align="center"><img src="docs/voice.png" width="70%" alt="Voice profile: words that stay, misheard-word fixes, writing samples" /></p>

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Click **Sample** to see it work without a microphone, or press <kbd>R</kbd> and start talking. The first recording downloads the Whisper model (~135 MB for Base); after that it's instant and works offline.

### Better rewriting, still free: Ollama

```bash
# install from https://ollama.com, then:
ollama pull qwen2.5:7b     # or llama3.1:8b, gemma3, mistral…
ollama serve
```

Choose the **Ollama** editor, then use **Settings → Ollama → Detect** to pick the model. Ollama accepts requests from `localhost` pages by default. If you host AutoFormat elsewhere, start it with `OLLAMA_ORIGINS="*"`.

### LM Studio, Groq, OpenRouter, OpenAI, Claude

Pick the editor, open **Settings**, choose a preset or paste a base URL and key, and hit **Detect** to list models. Keys live only in your browser's `localStorage`, and requests go straight from your browser to the provider you picked.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | Type-check and build the static site (`dist/`), including the service worker |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | TypeScript, oxlint, Prettier (with Tailwind class sorting) |

`dist/` is fully static: deploy it to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

## How it works

```
 mic ─► AudioWorklet ─► 16 kHz PCM ─► LiveWhisper: cut at quiet points every ~12 s
                                          │
                              Web Worker: Whisper (transformers.js, WebGPU/WASM)
                                          │
              transcript ◄── misheard-word fixes ◄── segments, in order, as you talk
                  │
     ┌────────────┼──────────────────────────────┬───────────────────────────────┐
     ▼            ▼                              ▼                               ▼
  Instant     In-browser AI                 Ollama / OpenAI / Claude         Voice profile
  rules →     rules write the page,         copy-editor prompt + voice       keep-words masked
  layout      model names title/headings    rules + AI-ism ban + samples     from every rule
     └────────────┴──────────────┬───────────────┘
                                 ▼
             FormattedDoc { title, description, tags, body }
                                 │
     voice report (diff vs transcript) · AI-ism marks · changes · exports
```

```
src/
├── App.tsx                    orchestration, shortcuts, theme, toasts
├── components/                Talk / Shape / Page panels, mastheads, dialogs, waveform, layout thumbnails
├── styles/                    themes.css (tokens per look), components.css (semantic classes)
├── hooks/                     useRecorder (worklet + analyser), useTheme, useSpeech, …
├── workers/ml.worker.ts       Whisper + in-browser LLMs
└── lib/
    ├── analysis/              voice match, AI-isms (detect + fix), readability, change diff
    ├── format/                voice levels, rule cleaner, offline layouts, headings planner, prompts, parser
    ├── speech/                live Whisper segmenter, PCM utils, Web Speech wrapper
    ├── llm/                   Ollama, OpenAI-compatible and Claude engines (streaming)
    └── export/                Markdown, HTML, web page, text, JSON, agent brief
```

### Engineering notes

- **Voice-preserving rules.** The offline cleaner works in tiers (filler sounds → verbal tics → crude bits → slang swaps). Protected words are masked with private-use placeholders, so no rule can touch them. Unpunctuated run-ons from browser speech are split at discourse markers.
- **Measuring voice.** The score is the length of the order-preserving word diff between transcript and body prose, divided by the body's word count. Headings, title and TL;DR are excluded, because they're structure built from the speaker's words.
- **Live segmentation.** Each segment ends at the quietest 30 ms window near the 12 s mark, so words aren't split. Silent segments are skipped, and Whisper's stock hallucinations on silence ("Thank you.") are dropped.
- **Small-model reality.**
  - `q4f16` produced gibberish on Apple Metal WebGPU, so chat models load as `q4`.
  - Whisper uses a `q8` decoder, which is smaller *and* accurate on WebGPU.
  - Small models get compact prompts with explicit word budgets; when they're only naming things, their replies use a tiny, leniently parsed `TITLE: / 1: / 2:` format.
- **Every remote engine streams** through one `generate()` interface, and the preview re-parses at most once per animation frame. The Anthropic SDK is lazy-loaded so non-Claude users don't download it.

## Browser support

Chrome and Edge get everything: WebGPU acceleration, live browser speech and rich clipboard. Safari and Firefox run Whisper on WASM, which is slower, so use Tiny or Base there. Browser speech mode depends on `SpeechRecognition` support.

## License

MIT
