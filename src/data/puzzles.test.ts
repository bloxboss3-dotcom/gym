import { describe, expect, it } from 'vitest'
import { PUZZLES, puzzleById, puzzleForSeed } from '@/data/puzzles'
import { applyMove, isCheckmate, isInCheck, legalMoves, moveToUci, parseFen } from '@/engine/chess'

/**
 * The puzzle data is validated by the rules engine rather than by hand.
 *
 * A puzzle that rejects the right answer, or accepts two, teaches the wrong
 * thing — and hand-written FEN strings are exactly the sort of data that looks
 * fine and is quietly wrong. Every claim the data makes is checked here, so a
 * bad position cannot ship.
 */
describe('every puzzle is a genuine mate in one', () => {
  it.each(PUZZLES.map((p) => [p.id, p] as const))('%s', (_id, puzzle) => {
    const position = parseFen(puzzle.fen)
    const moves = legalMoves(position)

    // The position must be sane: the side to move has options, and the side
    // NOT to move is not already in check (which would make it illegal).
    expect(moves.length, 'position has legal moves').toBeGreaterThan(0)
    expect(isInCheck(position, position.turn === 'w' ? 'b' : 'w')).toBe(false)

    const solution = moves.find((m) => moveToUci(m) === puzzle.solution)
    expect(solution, `solution ${puzzle.solution} is a legal move`).toBeDefined()
    expect(isCheckmate(applyMove(position, solution!)), 'solution delivers mate').toBe(true)
  })

  it.each(PUZZLES.map((p) => [p.id, p] as const))('%s has exactly one answer', (_id, puzzle) => {
    const position = parseFen(puzzle.fen)
    const mating = legalMoves(position)
      .filter((move) => isCheckmate(applyMove(position, move)))
      .map(moveToUci)
    expect(mating).toEqual([puzzle.solution])
  })
})

describe('puzzle metadata', () => {
  it('has unique ids', () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length)
  })

  it('carries a theme and a lesson worth reading', () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.theme.length, puzzle.id).toBeGreaterThan(3)
      expect(puzzle.lesson.length, puzzle.id).toBeGreaterThan(30)
    }
  })

  it('ships enough puzzles that they do not repeat within a workout', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(10)
  })
})

describe('selection', () => {
  it('is deterministic for a given seed, so a reload does not swap the position', () => {
    for (const seed of [0, 1, 7, 12345, -4]) {
      expect(puzzleForSeed(seed).id).toBe(puzzleForSeed(seed).id)
    }
  })

  it('prefers puzzles you have not solved yet', () => {
    const solved = PUZZLES.slice(0, PUZZLES.length - 1).map((p) => p.id)
    for (let seed = 0; seed < 20; seed++) {
      expect(puzzleForSeed(seed, solved).id).toBe(PUZZLES[PUZZLES.length - 1].id)
    }
  })

  it('starts again rather than breaking once every puzzle is solved', () => {
    const all = PUZZLES.map((p) => p.id)
    expect(PUZZLES.map((p) => p.id)).toContain(puzzleForSeed(3, all).id)
  })

  it('looks up by id', () => {
    expect(puzzleById(PUZZLES[0].id)).toEqual(PUZZLES[0])
    expect(puzzleById('nope')).toBeNull()
  })
})
