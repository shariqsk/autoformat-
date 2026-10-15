import { Modal } from './Modal'
import { Kbd } from './ui'

const SHORTCUTS: [keys: string[], label: string][] = [
  [['R'], 'Start or stop recording'],
  [['Space'], 'Pause or resume while recording'],
  [['⌘', '↵'], 'Format the transcript'],
  [['⌘', '⇧', 'C'], 'Copy the result'],
  [['⌘', 'K'], 'Open drafts'],
  [['⌘', '.'], 'Toggle light and dark'],
  [['?'], 'Show this list'],
  [['Esc'], 'Close dialogs'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Shortcuts" kicker="Hands off the mouse" width="max-w-md">
      <ul className="divide-y divide-rule">
        {SHORTCUTS.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between py-2.5 text-sm text-ink-2">
            {label}
            <span className="flex gap-1 text-ink">
              {keys.map((k) => (
                <Kbd key={k} className="h-6 min-w-6 text-[11px]">
                  {k}
                </Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">
        On Windows and Linux, use Ctrl instead of ⌘. Single-key shortcuts are ignored while you're typing.
      </p>
    </Modal>
  )
}
