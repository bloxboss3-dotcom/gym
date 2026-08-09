import { describe, expect, it } from 'vitest'
import {
  applyMove,
  isCheckmate,
  isInCheck,
  isStalemate,
  legalMoves,
  moveToUci,
  parseFen,
  squareIndex,
  squareName,
  toFen,
  toSan,
  uciToMove,
} from '@/engine/chess'

/**
 * A rules engine is either correct or it is worthless — a puzzle that rejects
 * the right answer teaches the wrong thing. `perft` counts every legal move
 * sequence to a given depth and is the standard way to prove one; the reference
 * numbers below are the published values for these positions.
 */
function perft(fen: string, depth: number): number {
  const walk = (position: ReturnType<typeof parseFen>, remaining: number): number => {
    const moves = legalMoves(position)
    if (remaining === 1) return moves.length
    let total = 0
    for (const move of moves) total += walk(applyMove(position, move), remaining - 1)
    return total
  }
  return walk(parseFen(fen), depth)
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// Kiwipete — the standard test position for castling, en passant and pins.
const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'

describe('perft — the engine obeys the actual rules', () => {
  it('matches published counts from the starting position', () => {
    expect(perft(START, 1)).toBe(20)
    expect(perft(START, 2)).toBe(400)
    expect(perft(START, 3)).toBe(8902)
  })

  it('matches published counts for Kiwipete, which is all about the edge cases', () => {
    expect(perft(KIWIPETE, 1)).toBe(48)
    expect(perft(KIWIPETE, 2)).toBe(2039)
  })

  it('matches a position built to catch en-passant and promotion bugs', () => {
    const tricky = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1'
    expect(perft(tricky, 1)).toBe(14)
    expect(perft(tricky, 2)).toBe(191)
    expect(perft(tricky, 3)).toBe(2812)
  })

  it('matches a position dense with promotions', () => {
    const promo = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1'
    expect(perft(promo, 1)).toBe(6)
    expect(perft(promo, 2)).toBe(264)
  })
})

describe('squares', () => {
  it('round-trips names and indices', () => {
    expect(squareName(0)).toBe('a8')
    expect(squareName(63)).toBe('h1')
    expect(squareIndex('e4')).toBe(36)
    for (let i = 0; i < 64; i++) expect(squareIndex(squareName(i))).toBe(i)
  })

  it('round-trips UCI move strings including promotions', () => {
    expect(moveToUci(uciToMove('e2e4'))).toBe('e2e4')
    expect(moveToUci(uciToMove('a7a8q'))).toBe('a7a8q')
  })
})

describe('FEN', () => {
  it('round-trips', () => {
    for (const fen of [START, KIWIPETE, '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1']) {
      expect(toFen(parseFen(fen))).toBe(fen)
    }
  })
})

describe('check, mate and stalemate', () => {
  it('recognises a back-rank mate', () => {
    const position = parseFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')
    const mate = legalMoves(position).find((m) => moveToUci(m) === 'a1a8')!
    expect(mate).toBeDefined()
    expect(isCheckmate(applyMove(position, mate))).toBe(true)
  })

  it('recognises the smothered mate pattern', () => {
    const position = parseFen('6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1')
    const mate = legalMoves(position).find((m) => moveToUci(m) === 'g5f7')!
    expect(isCheckmate(applyMove(position, mate))).toBe(true)
  })

  it('does not confuse stalemate with mate', () => {
    const position = parseFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
    expect(isInCheck(position)).toBe(false)
    expect(legalMoves(position)).toHaveLength(0)
    expect(isStalemate(position)).toBe(true)
    expect(isCheckmate(position)).toBe(false)
  })

  it('will not let you leave your own king in check', () => {
    // The rook on e2 is pinned by the rook on e8.
    const position = parseFen('4r2k/8/8/8/8/8/4R3/4K3 w - - 0 1')
    const rookMoves = legalMoves(position).filter((m) => m.from === squareIndex('e2'))
    for (const move of rookMoves) {
      expect(squareName(move.to)[0]).toBe('e')
    }
  })
})

describe('castling', () => {
  it('moves the rook as well', () => {
    const position = parseFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1')
    const castle = legalMoves(position).find((m) => moveToUci(m) === 'e1g1')!
    const after = applyMove(position, castle)
    expect(after.board[squareIndex('g1')]?.type).toBe('k')
    expect(after.board[squareIndex('f1')]?.type).toBe('r')
    expect(after.board[squareIndex('h1')]).toBeNull()
    expect(after.castling).toBe('-')
  })

  it('is forbidden out of, through, or into check', () => {
    const throughCheck = parseFen('4k3/8/8/8/8/8/5q2/4K2R w K - 0 1')
    expect(legalMoves(throughCheck).some((m) => moveToUci(m) === 'e1g1')).toBe(false)

    const outOfCheck = parseFen('4k3/8/8/8/8/8/4q3/4K2R w K - 0 1')
    expect(legalMoves(outOfCheck).some((m) => moveToUci(m) === 'e1g1')).toBe(false)

    const intoCheck = parseFen('4k3/8/8/8/8/8/6q1/4K2R w K - 0 1')
    expect(legalMoves(intoCheck).some((m) => moveToUci(m) === 'e1g1')).toBe(false)
  })

  it('loses the right once the rook moves', () => {
    const position = parseFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1')
    const rookMove = legalMoves(position).find((m) => moveToUci(m) === 'h1h2')!
    expect(applyMove(position, rookMove).castling).toBe('-')
  })
})

describe('en passant and promotion', () => {
  it('removes the pawn that is not on the destination square', () => {
    const position = parseFen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1')
    const capture = legalMoves(position).find((m) => moveToUci(m) === 'e5d6')!
    const after = applyMove(position, capture)
    expect(after.board[squareIndex('d6')]?.type).toBe('p')
    expect(after.board[squareIndex('d5')]).toBeNull()
  })

  it('offers all four promotion pieces', () => {
    const position = parseFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    const promotions = legalMoves(position)
      .filter((m) => m.from === squareIndex('a7'))
      .map((m) => m.promotion)
      .sort()
    expect(promotions).toEqual(['b', 'n', 'q', 'r'])
  })

  it('actually places the promoted piece', () => {
    const position = parseFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    const knight = legalMoves(position).find((m) => moveToUci(m) === 'a7a8n')!
    expect(applyMove(position, knight).board[squareIndex('a8')]).toEqual({ type: 'n', color: 'w' })
  })
})

describe('algebraic notation', () => {
  it('writes ordinary moves the way a human would', () => {
    const position = parseFen(START)
    const e4 = legalMoves(position).find((m) => moveToUci(m) === 'e2e4')!
    expect(toSan(position, e4)).toBe('e4')
    const nf3 = legalMoves(position).find((m) => moveToUci(m) === 'g1f3')!
    expect(toSan(position, nf3)).toBe('Nf3')
  })

  it('marks check and mate', () => {
    const position = parseFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1')
    const mate = legalMoves(position).find((m) => moveToUci(m) === 'a1a8')!
    expect(toSan(position, mate)).toBe('Ra8#')
  })

  it('disambiguates only when it genuinely has to', () => {
    // King on e1 blocks the h1 rook, so only one rook reaches c1 — no hint.
    const blocked = parseFen('4k3/8/8/8/8/8/8/R3K2R w - - 0 1')
    const onlyOne = legalMoves(blocked).find((m) => moveToUci(m) === 'a1c1')!
    expect(toSan(blocked, onlyOne)).toBe('Rc1')

    // Move the king off the back rank and both rooks can reach c1.
    const ambiguous = parseFen('4k3/8/8/8/4K3/8/8/R6R w - - 0 1')
    const needsFile = legalMoves(ambiguous).find((m) => moveToUci(m) === 'a1c1')!
    expect(toSan(ambiguous, needsFile)).toBe('Rac1')

    // Two rooks on the SAME file both reaching c4 — disambiguate by rank.
    const sameFile = parseFen('7k/2R5/8/8/4K3/8/8/2R5 w - - 0 1')
    const needsRank = legalMoves(sameFile).find((m) => moveToUci(m) === 'c1c4')!
    expect(toSan(sameFile, needsRank)).toBe('R1c4')
  })

  it('writes castling and pawn captures correctly', () => {
    const castlePosition = parseFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1')
    const castle = legalMoves(castlePosition).find((m) => moveToUci(m) === 'e1g1')!
    expect(toSan(castlePosition, castle)).toBe('O-O')

    const capturePosition = parseFen('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1')
    const capture = legalMoves(capturePosition).find((m) => moveToUci(m) === 'e4d5')!
    expect(toSan(capturePosition, capture)).toBe('exd5')
  })
})
