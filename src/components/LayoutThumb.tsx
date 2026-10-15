import type { ReactNode } from 'react'
import type { LayoutId } from '../lib/format/types'

// Tiny wireframes of each layout's shape, so the picker shows structure instead of emoji.
// Drawn on a 60×44 grid; "ink" lines use currentColor, the accent marks what makes the layout distinct.

const Line = ({ x = 6, y, w, h = 2, accent }: { x?: number; y: number; w: number; h?: number; accent?: boolean }) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} className={accent ? 'fill-accent' : 'fill-current'} opacity={accent ? 1 : 0.55} />
)

const Title = ({ y = 6, w = 30 }: { y?: number; w?: number }) => <rect x={6} y={y} width={w} height={4} rx={1} className="fill-current" />

const THUMBS: Record<LayoutId, ReactNode> = {
  blog: (
    <>
      <Title />
      <Line y={14} w={46} />
      <Line y={18} w={40} />
      <Line y={24} w={20} h={3} accent />
      <Line y={30} w={46} />
      <Line y={34} w={42} />
      <Line y={38} w={30} />
    </>
  ),
  listicle: (
    <>
      <Title />
      {[15, 24, 33].map((y, i) => (
        <g key={y}>
          <text x={6} y={y + 4} className="fill-accent" fontSize="6" fontWeight="700" fontFamily="ui-monospace">
            {i + 1}
          </text>
          <Line x={13} y={y} w={22} h={2.5} />
          <Line x={13} y={y + 4.5} w={36} h={1.5} />
        </g>
      ))}
    </>
  ),
  howto: (
    <>
      <Title />
      <Line y={14} w={40} />
      {[21, 28, 35].map((y) => (
        <g key={y}>
          <circle cx={8} cy={y + 1} r={2.2} className="fill-accent" />
          <Line x={13} y={y} w={38} />
        </g>
      ))}
    </>
  ),
  essay: (
    <>
      <Title />
      {[14, 18, 22, 26, 30, 34, 38].map((y, i) => (
        <Line key={y} x={i === 0 || i === 4 ? 10 : 6} y={y} w={i === 3 ? 30 : i === 0 || i === 4 ? 42 : 46} accent={false} />
      ))}
    </>
  ),
  newsletter: (
    <>
      <rect x={4} y={4} width={52} height={36} rx={3} className="fill-none stroke-current" strokeWidth={1} opacity={0.5} />
      <path d="M4 7 L30 22 L56 7" className="fill-none stroke-accent" strokeWidth={1.4} />
      <Line x={12} y={27} w={36} />
      <Line x={12} y={32} w={28} />
    </>
  ),
  qa: (
    <>
      <text x={6} y={11} className="fill-accent" fontSize="7" fontWeight="700" fontFamily="ui-monospace">
        Q
      </text>
      <Line x={13} y={7} w={32} h={2.5} />
      <Line x={13} y={13} w={38} />
      <Line x={13} y={17} w={30} />
      <text x={6} y={29} className="fill-accent" fontSize="7" fontWeight="700" fontFamily="ui-monospace">
        Q
      </text>
      <Line x={13} y={25} w={26} h={2.5} />
      <Line x={13} y={31} w={38} />
      <Line x={13} y={35} w={24} />
    </>
  ),
  thread: (
    <>
      {[5, 19, 33].map((y, i) => (
        <g key={y}>
          <rect x={6} y={y} width={48} height={10} rx={3} className="fill-none stroke-current" strokeWidth={1} opacity={0.45} />
          <circle cx={11} cy={y + 5} r={2} className={i === 0 ? 'fill-accent' : 'fill-current'} opacity={i === 0 ? 1 : 0.5} />
          <Line x={16} y={y + 4} w={32 - i * 6} h={1.6} />
        </g>
      ))}
    </>
  ),
  linkedin: (
    <>
      <Line y={6} w={40} h={3} accent />
      <Line y={14} w={30} />
      <Line y={20} w={44} />
      <Line y={26} w={24} />
      <text x={6} y={39} className="fill-current" opacity={0.55} fontSize="6" fontFamily="ui-monospace">
        # # #
      </text>
    </>
  ),
  notes: (
    <>
      <Line y={6} w={20} h={3} />
      {[13, 18, 23].map((y) => (
        <g key={y}>
          <circle cx={8} cy={y + 1} r={1.3} className="fill-accent" />
          <Line x={12} y={y} w={30} h={1.6} />
        </g>
      ))}
      <Line y={29} w={18} h={3} />
      <circle cx={8} cy={37} r={1.3} className="fill-accent" />
      <Line x={12} y={36} w={26} h={1.6} />
    </>
  ),
  journal: (
    <>
      <text x={6} y={10} className="fill-accent" fontSize="6" fontStyle="italic" fontFamily="Georgia, serif">
        Monday
      </text>
      {[16, 21, 26, 31, 36].map((y, i) => (
        <path
          key={y}
          d={`M6 ${y} q 5 -2 10 0 t 10 0 t 10 0 t 10 0 ${i % 2 ? '' : 't 8 0'}`}
          className="fill-none stroke-current"
          strokeWidth={1.2}
          opacity={0.5}
        />
      ))}
    </>
  ),
}

export function LayoutThumb({ layout, className }: { layout: LayoutId; className?: string }) {
  return (
    <svg viewBox="0 0 60 44" className={className} aria-hidden>
      {THUMBS[layout]}
    </svg>
  )
}
