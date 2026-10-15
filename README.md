# AutoFormat

**Talk it out. Publish it clean.**

AutoFormat turns rambling voice notes into publish-ready writing. Hit record, talk the way you normally talk ("yeah bro, so basically…"), then pick a layout and a tone. You get a clean blog post, listicle, how-to, newsletter, thread or LinkedIn post that you can copy, download, or hand straight to a coding agent to publish.

Speech-to-text runs **on your device** using OpenAI's Whisper through [transformers.js](https://github.com/huggingface/transformers.js). It's free, needs no account, and your audio never leaves the browser. Models download once from Hugging Face and are then cached.

---

## Features

**🎙️ Speech in**
- **Whisper, in the browser**: Tiny / Base / Small (English), Base (multilingual) and Large v3 Turbo. Uses WebGPU when available and falls back to WASM.
- **Live mode** uses the browser's built-in speech recognition, so words appear as you talk.
- Upload any audio or video file (m4a, mp3, wav, webm…) to transcribe it.
- Record in several takes; each one is appended to the transcript. Pause and resume are supported.

**🪄 Formatting engines.** Pick the trade-off you want:

| Engine | Where it runs | Cost | Notes |
| --- | --- | --- | --- |
| **Instant** | Your browser, rule-based | Free | Removes fillers, stutters and slang, fixes punctuation, builds paragraphs and layouts. No model, results in milliseconds. |
| **In-browser AI** | Your GPU (WebGPU) | Free | Gemma 3 1B (default) or Qwen 2.5 0.5B / 1.5B via transformers.js. Fully private, but a 1B model paraphrases loosely. |
| **Ollama** | Your machine | Free | Any local model (Llama, Qwen, Gemma, Mistral…). |
| **OpenAI-compatible** | Anywhere | Varies | LM Studio, llama.cpp, Groq, OpenRouter, OpenAI… |
| **Claude** | Anthropic API | Paid | Best writing quality. Uses your own API key. |

**📐 10 layouts:** blog post, listicle, how-to guide, essay, newsletter, Q&A, X/Threads thread, LinkedIn post, notes/outline, journal entry.

**🎚️ 6 tones:** Verbatim, My voice, Casual, Professional, Academic, Punchy. Plus length (concise / balanced / detailed), title, TL;DR and tag toggles, and free-form extra instructions.

**📦 Export:** Markdown with YAML front matter (works with Astro, Next.js, Hugo, Jekyll), an HTML fragment for any CMS, a standalone styled web page with SEO meta tags, plain text, JSON, and an **Agent brief**: a ready-to-paste task that tells Claude Code, Cursor or any coding agent how to add the post to your blog. Copying from Preview puts rich HTML on the clipboard, so formatting survives a paste into Google Docs, Notion, Medium or WordPress.

**🗂️ Drafts and editing.** Edit the title, description, tags and Markdown body after formatting. The last 50 drafts are kept in local history.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Click **Try a sample** if you want to see it work before talking into it.

### Using Ollama (free, local, high quality)

```bash
# install from https://ollama.com, then:
ollama pull llama3.2      # or qwen2.5:7b, gemma3, mistral…
ollama serve
```

In AutoFormat, choose the **Ollama** engine and use **Settings → Ollama → Detect** to pick a model. Ollama accepts requests from `localhost` pages by default. If you host AutoFormat somewhere else, start Ollama with `OLLAMA_ORIGINS="*"`.

### Using LM Studio / Groq / OpenRouter / OpenAI

Choose **OpenAI-compatible**, click a preset in Settings, paste a key if the service needs one, then click **Detect** to list its models.

### Using Claude

Choose **Claude**, paste an API key from [console.anthropic.com](https://console.anthropic.com), and pick Opus 5.5, Sonnet 5.5 or Haiku 5.5.

> API keys live only in your browser's `localStorage`. Requests go straight from your browser to the provider you picked, with no server in between.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Type-check and build for production (`dist/`) |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Run the unit tests (Vitest) |
| `pnpm typecheck` / `pnpm lint` | TypeScript and oxlint |

The build is a fully static site, so you can deploy `dist/` to Netlify, Vercel, Cloudflare Pages or GitHub Pages.

## How it works

```
 mic / file ──► MediaRecorder ──► decode + resample to 16 kHz mono
                                        │
                                        ▼
                         Web Worker: Whisper (transformers.js, WebGPU/WASM)
                                        │
                                   transcript ◄── or live Web Speech API, or paste
                                        │
              ┌─────────────────────────┴──────────────────────────┐
              ▼                                                    ▼
   Instant engine (rule-based)                    buildPrompt(layout, tone, length…)
   scrub → sentence repair → paragraphs → layout          │  streamed to the chosen LLM
              │                                           ▼
              │                               parseModelOutput (front matter, fences…)
              └──────────────────────► FormattedDoc { title, description, tags, body }
                                                        │
                       Markdown · HTML · Web page · Text · JSON · Agent brief
```

```
src/
├── App.tsx                  state, formatting orchestration, shortcuts
├── components/              Recorder, Style, Output panels; Settings; History
├── hooks/                   useRecorder, usePersistentState, useCopy
├── workers/ml.worker.ts     Whisper + in-browser LLM (transformers.js)
└── lib/
    ├── format/              layouts & tones, rule-based cleaner, local layout engine, prompt + parser
    ├── export/              all export formats
    ├── llm/                 Ollama, OpenAI-compatible and Claude engines (streaming)
    ├── ml/                  model catalogue + worker client
    └── speech/              audio decoding, Web Speech wrapper
```

### Design notes

- **Privacy by default.** The default path (Whisper with the Instant or In-browser engine) makes no network requests apart from the one-time model download.
- **Every engine streams.** Ollama (NDJSON), OpenAI-compatible (SSE) and Claude (Anthropic SDK) share one `generate()` interface. The preview re-renders at most once per animation frame while text streams in.
- **Lenient parsing.** Small local models often wrap output in code fences, leak `<think>` blocks, or skip the front matter. `parseModelOutput` handles all of these and fills in missing metadata.
- **Instant engine.** A deterministic pipeline that removes fillers, stutters and verbal tics; formalises slang according to the tone's strictness; repairs unpunctuated run-ons from browser speech engines; and splits paragraphs on topic shifts ("anyway…", "another thing…").

## Choosing an engine

- **Fastest and most faithful:** *Instant*. It only removes noise and adds structure, so it never invents anything. Its headings are keyword-based, though.
- **Free and private with real rewriting:** *Ollama* running a 7B–8B model (e.g. `qwen2.5:7b`, `llama3.1:8b`) gives much better results than any model small enough to run in a browser tab.
- **Best quality:** *Claude*.
- **Zero setup:** *In-browser AI* works offline after a one-time download of about 860 MB, but expect a 1B model to smooth over details and sometimes embellish.

## Browser support

Chrome and Edge get everything, including WebGPU acceleration and live mode. Safari and Firefox run Whisper on WASM, which is slower; use the Tiny or Base model there. Live mode depends on the browser's `SpeechRecognition` support.

## License

MIT
