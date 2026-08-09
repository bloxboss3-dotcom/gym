import { useMemo, useState } from 'react'
import { Button, Chip, cx } from '@/components/ui'
import { PUZZLES, puzzleForSeed, type Puzzle } from '@/data/puzzles'
import {
  applyMove,
  isCheckmate,
  legalMovesFrom,
  parseFen,
  squareName,
  toSan,
  type Move,
  type Piece,
  type Position,
} from '@/engine/chess'
import { useStore } from '@/state/store'

/**
 * A chess puzzle for the rest interval.
 *
 * Two rules shape this whole component:
 *
 *   1. It must never make you late back to the bar. Every puzzle is mate in
 *      one, it is opt-in behind a button, and it disappears when rest ends.
 *   2. It must not turn the character into a record of chess. Rewards run
 *      through the same ledger and the same daily caps as training, and are
 *      only reachable while a rest timer is genuinely running.
 *
 * Pieces are Unicode glyphs rather than images: no asset licensing questions,
 * perfect scaling, and they work offline with no extra bytes.
 */

const GLYPH: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
}

function pieceLabel(piece: Piece): string {
  const names: Record<string, string> = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' }
  return `${piece.color === 'w' ? 'White' : 'Black'} ${names[piece.type]}`
}

export function RestPuzzle({ seed, onClose }: { seed: number; onClose: () => void }) {
  const { data, solvePuzzle } = useStore()
  const solvedIds = useMemo(() => data.game.solvedPuzzleIds ?? [], [data.game.solvedPuzzleIds])

  const [puzzle, setPuzzle] = useState<Puzzle>(() => puzzleForSeed(seed, solvedIds))
  const [position, setPosition] = useState<Position>(() => parseFen(puzzle.fen))
  const [selected, setSelected] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)
  const [wrong, setWrong] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const options = useMemo(
    () => (selected === null || solved ? [] : legalMovesFrom(position, selected)),
    [position, selected, solved],
  )
  const optionSquares = new Set(options.map((m) => m.to))

  const reset = (next: Puzzle) => {
    setPuzzle(next)
    setPosition(parseFen(next.fen))
    setSelected(null)
    setSolved(false)
    setWrong(null)
    setRevealed(false)
  }

  const play = (move: Move) => {
    const after = applyMove(position, move)
    if (isCheckmate(after)) {
      setPosition(after)
      setSolved(true)
      setSelected(null)
      setWrong(null)
      if (!solvedIds.includes(puzzle.id)) solvePuzzle(puzzle.id, puzzle.theme)
      return
    }
    // Show what the move would have been, then put the position back — the
    // point is to find mate, not to play out a lost line.
    setWrong(`${toSan(position, move)} is legal, but it is not mate.`)
    setSelected(null)
  }

  const onSquare = (index: number) => {
    if (solved) return
    if (selected !== null) {
      const move = options.find((m) => m.to === index)
      if (move) {
        play(move.promotion ? { ...move, promotion: 'q' } : move)
        return
      }
    }
    const piece = position.board[index]
    setSelected(piece && piece.color === position.turn ? index : null)
  }

  const nextPuzzle = () => {
    const pool = PUZZLES.filter((p) => p.id !== puzzle.id)
    reset(puzzleForSeed(seed + PUZZLES.length + 1, [...solvedIds, puzzle.id]) ?? pool[0])
  }

  return (
    <section className="forge-panel p-3" aria-label="Rest-timer chess puzzle">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-smoke">Between sets</p>
          <p className="font-display text-lg uppercase tracking-wide leading-none">
            {solved ? puzzle.theme : 'White to play — mate in one'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="touch-target px-2 text-sm text-ash shrink-0">
          Hide
        </button>
      </div>

      <div
        className="grid grid-cols-8 rounded-lg overflow-hidden border border-slate"
        role="grid"
        aria-label="Chess board"
      >
        {position.board.map((piece, index) => {
          const rank = Math.floor(index / 8)
          const file = index % 8
          const light = (rank + file) % 2 === 0
          const isOption = optionSquares.has(index)
          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={`${squareName(index)}${piece ? `, ${pieceLabel(piece)}` : ', empty'}`}
              onClick={() => onSquare(index)}
              disabled={solved}
              className={cx(
                'relative aspect-square flex items-center justify-center text-[26px] leading-none',
                light ? 'bg-[#3a3a44]' : 'bg-[#22222a]',
                selected === index && 'ring-2 ring-inset ring-ember-500',
                isOption && 'after:absolute after:inset-0 after:m-auto after:size-3 after:rounded-full after:bg-ember-500/70',
              )}
            >
              {piece && (
                <span
                  aria-hidden
                  className={piece.color === 'w' ? 'text-parchment' : 'text-[#0b0b0d]'}
                  style={{ textShadow: piece.color === 'w' ? '0 1px 1px rgba(0,0,0,.6)' : 'none' }}
                >
                  {GLYPH[`${piece.color}${piece.type}`]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {solved ? (
        <div className="mt-2.5">
          <div className="flex items-center gap-2">
            <Chip tone="good">Solved</Chip>
            <span className="text-xs text-ash">{puzzle.theme}</span>
          </div>
          <p className="text-xs text-ash mt-1.5 leading-relaxed">{puzzle.lesson}</p>
          <Button size="sm" full className="mt-2.5" onClick={nextPuzzle}>
            Another one
          </Button>
        </div>
      ) : (
        <div className="mt-2.5">
          {wrong && <p className="text-xs text-caution leading-relaxed">{wrong}</p>}
          {revealed && (
            <p className="text-xs text-ember-300 leading-relaxed mt-1">
              The move is <strong>{toSan(parseFen(puzzle.fen), moveOf(puzzle))}</strong> — {puzzle.theme}.{' '}
              {puzzle.lesson}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="flex-1" onClick={() => reset(puzzle)}>
              Reset
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setRevealed(true)} disabled={revealed}>
              Show me
            </Button>
          </div>
          <p className="text-[11px] text-smoke mt-2 leading-relaxed">
            Solving pays a few coins, capped well below what training pays — and only while you are actually
            resting mid-session.
          </p>
        </div>
      )}
    </section>
  )
}

function moveOf(puzzle: Puzzle): Move {
  const from = puzzle.solution.slice(0, 2)
  const to = puzzle.solution.slice(2, 4)
  const files = 'abcdefgh'
  const index = (name: string) => (8 - Number(name[1])) * 8 + files.indexOf(name[0])
  return { from: index(from), to: index(to) }
}
