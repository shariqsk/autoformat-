import { AudioLines, BookOpen, Keyboard, Palette, Settings, UserRound } from 'lucide-react'
import type { ThemeId } from '../lib/themes'
import { cx } from './classes'
import { Button } from './ui'

type Dialog = 'settings' | 'voice' | 'shortcuts' | 'drafts' | 'style'

interface MastheadProps {
  theme: ThemeId
  draftCount: number
  onOpen: (dialog: Dialog) => void
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function Nav({ draftCount, onOpen, loud }: Omit<MastheadProps, 'theme'> & { loud?: boolean }) {
  const variant = loud ? 'outline' : 'ghost'
  const item = cx('h-9 gap-2 px-3', !loud && 'text-ink-2')
  return (
    <nav className="flex shrink-0 items-center gap-1" aria-label="Main">
      <Button variant={variant} className={item} onClick={() => onOpen('drafts')} title="Drafts (⌘K)">
        <BookOpen className="size-4" /> <span className="hidden md:inline">Drafts</span>
        {draftCount > 0 && <span className="font-mono text-[11px] tabular-nums opacity-70">{draftCount}</span>}
      </Button>
      <Button variant={variant} className={item} onClick={() => onOpen('voice')} title="Your voice profile">
        <UserRound className="size-4" /> <span className="hidden md:inline">Your voice</span>
      </Button>
      <Button variant={variant} className={item} onClick={() => onOpen('style')} title="Change the look (⌘.)">
        <Palette className="size-4" /> <span className="hidden md:inline">Style</span>
      </Button>
      <Button variant={variant} className="size-9 px-0" onClick={() => onOpen('settings')} aria-label="Settings" title="Settings">
        <Settings className="size-4" />
      </Button>
      <Button
        variant={variant}
        className="hidden size-9 px-0 sm:inline-flex"
        onClick={() => onOpen('shortcuts')}
        aria-label="Keyboard shortcuts"
        title="Shortcuts (?)"
      >
        <Keyboard className="size-4" />
      </Button>
      <a
        href="https://github.com/shariqsk/autoformat-"
        target="_blank"
        rel="noreferrer"
        className={cx('btn hidden size-9 sm:inline-flex', loud ? 'btn-outline' : 'btn-ghost')}
        aria-label="Source on GitHub"
      >
        <GithubMark />
      </a>
    </nav>
  )
}

const TICKER = [
  'talk like you',
  'post like you',
  'no ums',
  'no ai voice',
  'slang stays',
  'runs on your laptop',
  'free forever',
  'yap → blog',
]

/** Yap: a giant wordmark, a sticker, and a ticker tape of promises. */
function YapMasthead(props: MastheadProps) {
  return (
    <header className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-8 sm:pt-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-end gap-3">
          <h1 className="font-display text-[2.6rem] leading-[0.85] whitespace-nowrap text-ink lowercase sm:text-[4.4rem]">
            auto<span className="text-accent">format</span>
          </h1>
          <span className="sticker mb-1.5 hidden -rotate-6 sm:inline-flex">yap → post</span>
        </div>
        <Nav {...props} loud />
      </div>
      <div
        className="mt-5 overflow-hidden rounded-full border-(length:--bw) border-edge bg-pop-1 py-2 shadow-lift"
        aria-label="Talk like you. Post like you. No ums, no AI voice."
      >
        <div className="flex w-max animate-marquee gap-6 font-display text-[13px] text-ink uppercase" aria-hidden>
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-6">
              {t}
              <span className="text-accent">✺</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Studio: a floating toolbar and a big two-line hero. */
function StudioMasthead(props: MastheadProps) {
  return (
    <header className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-8">
      <div className="flex items-center justify-between gap-4 rounded-full border border-edge bg-sheet/70 py-2 pr-2 pl-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-on-accent shadow-lift">
            <AudioLines className="size-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg text-ink">autoformat</span>
          <span className="label hidden text-ink-3 sm:inline">on-device · v2</span>
        </div>
        <Nav {...props} />
      </div>
      <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[2.6rem] leading-[0.95] text-ink sm:text-[4rem]">
          Say it raw.
          <br />
          <span className="text-accent">Ship it clean.</span>
        </h1>
        <p className="label flex items-center gap-2 pb-2 text-ink-3">
          <span className="size-1.5 animate-blink rounded-full bg-accent" /> private · free · offline
        </p>
      </div>
    </header>
  )
}

/** Desk: a newspaper masthead with a double rule. */
const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

function DeskMasthead(props: MastheadProps) {
  return (
    <header className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-8 sm:pt-8">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label hidden text-ink-3 sm:block">The dictation desk · {TODAY}</p>
          <h1 className="mt-1 font-display text-[2.75rem] leading-[0.9] whitespace-nowrap text-ink sm:text-[4rem]">
            Auto<span className="text-accent italic">format</span>
            <span className="ml-1 inline-block size-2.5 animate-blink rounded-full bg-accent align-top sm:size-3" aria-hidden />
          </h1>
        </div>
        <div className="pb-1">
          <Nav {...props} />
        </div>
      </div>
      <div className="mt-4 border-t-2 border-ink" />
      <div className="mt-[3px] border-t border-ink" />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
        <p className="font-serif text-[15px] text-ink-2 italic">Talk the way you talk. Get back writing that still sounds like you.</p>
        <p className="label flex gap-4 text-ink-3">
          <span>Private by default</span>
          <span>Free</span>
          <span className="hidden sm:inline">Works offline</span>
        </p>
      </div>
    </header>
  )
}

export function Masthead(props: MastheadProps) {
  if (props.theme === 'yap') return <YapMasthead {...props} />
  if (props.theme === 'studio') return <StudioMasthead {...props} />
  return <DeskMasthead {...props} />
}
