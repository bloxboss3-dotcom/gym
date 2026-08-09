/**
 * A small, complete chess rules engine.
 *
 * Pure and deterministic like everything else in `src/engine/` — no React, no
 * storage, no randomness. It exists so the rest timer can offer tactics
 * puzzles, which means it only has to be *correct*, not fast: it evaluates a
 * handful of positions per set, not millions per second.
 *
 * Board layout is FEN order: index 0 is a8, index 63 is h1. That keeps FEN
 * parsing trivial and the mental model matches how a board is written down.
 *
 * Legality is handled the honest way — generate pseudo-legal moves, play each
 * one, and reject any that leaves your own king attacked. Slower than pin
 * detection and far harder to get subtly wrong.
 */

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Color = 'w' | 'b'

export interface Piece {
  type: PieceType
  color: Color
}

export interface Move {
  from: number
  to: number
  /** Piece to promote to; pawns reaching the last rank must set this. */
  promotion?: Exclude<PieceType, 'p' | 'k'>
}

export interface Position {
  board: (Piece | null)[]
  turn: Color
  /** Castling availability, e.g. "KQkq" or "-". */
  castling: string
  /** En-passant target square index, or null. */
  enPassant: number | null
  halfmoveClock: number
  fullmoveNumber: number
}

const FILES = 'abcdefgh'

export function squareName(index: number): string {
  return `${FILES[index % 8]}${8 - Math.floor(index / 8)}`
}

export function squareIndex(name: string): number {
  const file = FILES.indexOf(name[0])
  const rank = Number(name[1])
  return (8 - rank) * 8 + file
}

/** Coordinate notation used by puzzle data, e.g. "e2e4" or "a7a8q". */
export function moveToUci(move: Move): string {
  return `${squareName(move.from)}${squareName(move.to)}${move.promotion ?? ''}`
}

export function uciToMove(uci: string): Move {
  const from = squareIndex(uci.slice(0, 2))
  const to = squareIndex(uci.slice(2, 4))
  const promotion = uci.length > 4 ? (uci[4] as Move['promotion']) : undefined
  return promotion ? { from, to, promotion } : { from, to }
}

// ---------------------------------------------------------------------------
// FEN
// ---------------------------------------------------------------------------

export function parseFen(fen: string): Position {
  const [placement, turn, castling, enPassant, halfmove, fullmove] = fen.trim().split(/\s+/)
  const board: (Piece | null)[] = Array(64).fill(null)
  let index = 0
  for (const char of placement) {
    if (char === '/') continue
    if (/\d/.test(char)) {
      index += Number(char)
      continue
    }
    const color: Color = char === char.toUpperCase() ? 'w' : 'b'
    board[index] = { type: char.toLowerCase() as PieceType, color }
    index++
  }
  return {
    board,
    turn: turn === 'b' ? 'b' : 'w',
    castling: castling && castling !== '-' ? castling : '-',
    enPassant: enPassant && enPassant !== '-' ? squareIndex(enPassant) : null,
    halfmoveClock: Number(halfmove ?? 0),
    fullmoveNumber: Number(fullmove ?? 1),
  }
}

export function toFen(position: Position): string {
  let placement = ''
  for (let rank = 0; rank < 8; rank++) {
    let empty = 0
    for (let file = 0; file < 8; file++) {
      const piece = position.board[rank * 8 + file]
      if (!piece) {
        empty++
        continue
      }
      if (empty) {
        placement += empty
        empty = 0
      }
      placement += piece.color === 'w' ? piece.type.toUpperCase() : piece.type
    }
    if (empty) placement += empty
    if (rank < 7) placement += '/'
  }
  const ep = position.enPassant === null ? '-' : squareName(position.enPassant)
  return `${placement} ${position.turn} ${position.castling} ${ep} ${position.halfmoveClock} ${position.fullmoveNumber}`
}

// ---------------------------------------------------------------------------
// Move generation
// ---------------------------------------------------------------------------

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
]
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
]
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]]

const rankOf = (i: number) => Math.floor(i / 8)
const fileOf = (i: number) => i % 8
const onBoard = (rank: number, file: number) => rank >= 0 && rank < 8 && file >= 0 && file < 8

function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

/** Is `square` attacked by any piece of `by`? Ignores whose turn it is. */
export function isAttacked(board: (Piece | null)[], square: number, by: Color): boolean {
  const rank = rankOf(square)
  const file = fileOf(square)

  // Pawns attack diagonally forward. White pawns move up the board (lower index).
  const pawnRankDelta = by === 'w' ? 1 : -1
  for (const fileDelta of [-1, 1]) {
    const r = rank + pawnRankDelta
    const f = file + fileDelta
    if (!onBoard(r, f)) continue
    const piece = board[r * 8 + f]
    if (piece && piece.color === by && piece.type === 'p') return true
  }

  for (const [dr, df] of KNIGHT_DELTAS) {
    const r = rank + dr
    const f = file + df
    if (!onBoard(r, f)) continue
    const piece = board[r * 8 + f]
    if (piece && piece.color === by && piece.type === 'n') return true
  }

  for (const [dr, df] of KING_DELTAS) {
    const r = rank + dr
    const f = file + df
    if (!onBoard(r, f)) continue
    const piece = board[r * 8 + f]
    if (piece && piece.color === by && piece.type === 'k') return true
  }

  const slide = (dirs: number[][], types: PieceType[]) => {
    for (const [dr, df] of dirs) {
      let r = rank + dr
      let f = file + df
      while (onBoard(r, f)) {
        const piece = board[r * 8 + f]
        if (piece) {
          if (piece.color === by && types.includes(piece.type)) return true
          break
        }
        r += dr
        f += df
      }
    }
    return false
  }

  return slide(BISHOP_DIRS, ['b', 'q']) || slide(ROOK_DIRS, ['r', 'q'])
}

export function findKing(board: (Piece | null)[], color: Color): number {
  return board.findIndex((piece) => piece?.type === 'k' && piece.color === color)
}

export function isInCheck(position: Position, color: Color = position.turn): boolean {
  const king = findKing(position.board, color)
  return king >= 0 && isAttacked(position.board, king, opponent(color))
}

function pseudoLegalMoves(position: Position): Move[] {
  const { board, turn } = position
  const moves: Move[] = []

  const push = (from: number, to: number) => {
    const target = board[to]
    if (target && target.color === turn) return
    moves.push({ from, to })
  }

  for (let from = 0; from < 64; from++) {
    const piece = board[from]
    if (!piece || piece.color !== turn) continue
    const rank = rankOf(from)
    const file = fileOf(from)

    if (piece.type === 'p') {
      const forward = turn === 'w' ? -1 : 1
      const startRank = turn === 'w' ? 6 : 1
      const promoRank = turn === 'w' ? 0 : 7

      const oneRank = rank + forward
      if (onBoard(oneRank, file) && !board[oneRank * 8 + file]) {
        const to = oneRank * 8 + file
        if (oneRank === promoRank) {
          for (const promotion of ['q', 'r', 'b', 'n'] as const) moves.push({ from, to, promotion })
        } else {
          moves.push({ from, to })
          const twoRank = rank + forward * 2
          if (rank === startRank && !board[twoRank * 8 + file]) {
            moves.push({ from, to: twoRank * 8 + file })
          }
        }
      }

      for (const fileDelta of [-1, 1]) {
        const r = rank + forward
        const f = file + fileDelta
        if (!onBoard(r, f)) continue
        const to = r * 8 + f
        const target = board[to]
        const isEnPassant = position.enPassant === to
        if ((target && target.color !== turn) || isEnPassant) {
          if (r === promoRank) {
            for (const promotion of ['q', 'r', 'b', 'n'] as const) moves.push({ from, to, promotion })
          } else {
            moves.push({ from, to })
          }
        }
      }
      continue
    }

    if (piece.type === 'n') {
      for (const [dr, df] of KNIGHT_DELTAS) {
        const r = rank + dr
        const f = file + df
        if (onBoard(r, f)) push(from, r * 8 + f)
      }
      continue
    }

    if (piece.type === 'k') {
      for (const [dr, df] of KING_DELTAS) {
        const r = rank + dr
        const f = file + df
        if (onBoard(r, f)) push(from, r * 8 + f)
      }
      // Castling: king and rook unmoved (tracked in the castling string), the
      // squares between them empty, and the king neither in check nor passing
      // through an attacked square.
      const homeRank = turn === 'w' ? 7 : 0
      if (rank === homeRank && file === 4 && !isInCheck(position, turn)) {
        const rights = position.castling
        const kingSide = turn === 'w' ? 'K' : 'k'
        const queenSide = turn === 'w' ? 'Q' : 'q'
        const base = homeRank * 8
        if (
          rights.includes(kingSide) &&
          !board[base + 5] &&
          !board[base + 6] &&
          !isAttacked(board, base + 5, opponent(turn))
        ) {
          moves.push({ from, to: base + 6 })
        }
        if (
          rights.includes(queenSide) &&
          !board[base + 3] &&
          !board[base + 2] &&
          !board[base + 1] &&
          !isAttacked(board, base + 3, opponent(turn))
        ) {
          moves.push({ from, to: base + 2 })
        }
      }
      continue
    }

    const dirs =
      piece.type === 'b' ? BISHOP_DIRS : piece.type === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS]
    for (const [dr, df] of dirs) {
      let r = rank + dr
      let f = file + df
      while (onBoard(r, f)) {
        const to = r * 8 + f
        const target = board[to]
        if (target) {
          if (target.color !== turn) moves.push({ from, to })
          break
        }
        moves.push({ from, to })
        r += dr
        f += df
      }
    }
  }

  return moves
}

/** Apply a move without checking legality. Returns a new position. */
export function applyMove(position: Position, move: Move): Position {
  const board = [...position.board]
  const piece = board[move.from]
  if (!piece) return position

  const isPawn = piece.type === 'p'
  const captured = board[move.to]

  board[move.to] = move.promotion ? { type: move.promotion, color: piece.color } : piece
  board[move.from] = null

  // En passant: the captured pawn is not on the destination square.
  if (isPawn && position.enPassant === move.to && !captured) {
    const behind = piece.color === 'w' ? move.to + 8 : move.to - 8
    board[behind] = null
  }

  // Castling: move the rook too.
  if (piece.type === 'k' && Math.abs(fileOf(move.to) - fileOf(move.from)) === 2) {
    const rank = rankOf(move.from) * 8
    if (fileOf(move.to) === 6) {
      board[rank + 5] = board[rank + 7]
      board[rank + 7] = null
    } else {
      board[rank + 3] = board[rank + 0]
      board[rank + 0] = null
    }
  }

  // Castling rights are lost when the king or a rook leaves its home square,
  // and when a rook is captured on its home square.
  let castling = position.castling
  const drop = (chars: string) => {
    for (const char of chars) castling = castling.replace(char, '')
    if (!castling) castling = '-'
  }
  if (piece.type === 'k') drop(piece.color === 'w' ? 'KQ' : 'kq')
  if (piece.type === 'r') {
    if (move.from === 56) drop('Q')
    if (move.from === 63) drop('K')
    if (move.from === 0) drop('q')
    if (move.from === 7) drop('k')
  }
  if (move.to === 56) drop('Q')
  if (move.to === 63) drop('K')
  if (move.to === 0) drop('q')
  if (move.to === 7) drop('k')

  const doubleStep = isPawn && Math.abs(rankOf(move.to) - rankOf(move.from)) === 2
  const enPassant = doubleStep ? (move.from + move.to) / 2 : null

  return {
    board,
    turn: opponent(position.turn),
    castling,
    enPassant,
    halfmoveClock: isPawn || captured ? 0 : position.halfmoveClock + 1,
    fullmoveNumber: position.turn === 'b' ? position.fullmoveNumber + 1 : position.fullmoveNumber,
  }
}

/** Every move that is actually legal for the side to move. */
export function legalMoves(position: Position): Move[] {
  return pseudoLegalMoves(position).filter((move) => {
    const next = applyMove(position, move)
    return !isInCheck(next, position.turn)
  })
}

export function legalMovesFrom(position: Position, from: number): Move[] {
  return legalMoves(position).filter((move) => move.from === from)
}

export function isCheckmate(position: Position): boolean {
  return isInCheck(position) && legalMoves(position).length === 0
}

export function isStalemate(position: Position): boolean {
  return !isInCheck(position) && legalMoves(position).length === 0
}

/**
 * Short algebraic notation, for showing the solution after a puzzle.
 *
 * Disambiguates only as far as it needs to, which is what a human writes.
 */
export function toSan(position: Position, move: Move): string {
  const piece = position.board[move.from]
  if (!piece) return moveToUci(move)

  if (piece.type === 'k' && Math.abs(fileOf(move.to) - fileOf(move.from)) === 2) {
    return fileOf(move.to) === 6 ? 'O-O' : 'O-O-O'
  }

  const captured = position.board[move.to] || (piece.type === 'p' && position.enPassant === move.to)
  const target = squareName(move.to)
  let text: string

  if (piece.type === 'p') {
    text = captured ? `${FILES[fileOf(move.from)]}x${target}` : target
    if (move.promotion) text += `=${move.promotion.toUpperCase()}`
  } else {
    const rivals = legalMoves(position).filter(
      (other) =>
        other.to === move.to &&
        other.from !== move.from &&
        position.board[other.from]?.type === piece.type,
    )
    let hint = ''
    if (rivals.length) {
      const sameFile = rivals.some((other) => fileOf(other.from) === fileOf(move.from))
      const sameRank = rivals.some((other) => rankOf(other.from) === rankOf(move.from))
      hint = sameFile && sameRank ? squareName(move.from) : sameFile ? String(8 - rankOf(move.from)) : FILES[fileOf(move.from)]
    }
    text = `${piece.type.toUpperCase()}${hint}${captured ? 'x' : ''}${target}`
  }

  const next = applyMove(position, move)
  if (isCheckmate(next)) text += '#'
  else if (isInCheck(next)) text += '+'
  return text
}
