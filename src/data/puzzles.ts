/**
 * Rest-timer chess puzzles.
 *
 * Every one is mate in a single move. That is a deliberate constraint, not a
 * limitation: a rest interval is 90–180 seconds and the point is to come back
 * to the bar on time, so a puzzle has to be solvable in well under a minute
 * and has to have exactly one right answer. Longer combinations would turn the
 * rest timer into a reason to sit down for ten minutes, which is the opposite
 * of what this app is for.
 *
 * They also teach something. Each carries the name of the mating pattern and a
 * plain-language lesson, because "learn the moves" was the actual request —
 * these are the shapes that recur in real games.
 *
 * The data is verified by `puzzles.test.ts`, which replays every solution
 * through the rules engine and asserts it is legal, that it delivers mate, and
 * that no OTHER move does. A puzzle with two answers is a broken puzzle.
 */

export interface Puzzle {
  id: string
  /** Position before the player's move. The player is always to move. */
  fen: string
  /** The single mating move, in coordinate notation. */
  solution: string
  /** Name of the pattern, e.g. "Back-rank mate". */
  theme: string
  /** What it teaches, in one sentence. */
  lesson: string
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'back-rank-1',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solution: 'a1a8',
    theme: 'Back-rank mate',
    lesson:
      'A king behind its own unmoved pawns has no escape square. A rook or queen arriving on the back rank ends it.',
  },
  {
    id: 'back-rank-2',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: 'd1d8',
    theme: 'Back-rank mate',
    lesson:
      'Trading into a back-rank mate works when their rook is the only defender of the square you are landing on.',
  },
  {
    id: 'smothered-1',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    solution: 'g5f7',
    theme: 'Smothered mate',
    lesson:
      'A knight cannot be blocked. When the king is boxed in by its own pieces, a knight check is the whole game.',
  },
  {
    id: 'queen-support-1',
    fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
    solution: 'g1g7',
    theme: 'Queen and king mate',
    lesson:
      'The queen delivers, the king defends her. Step the queen next to their king only when your own king guards that square.',
  },
  {
    id: 'ladder-1',
    fen: '7k/R7/8/8/8/8/8/1R5K w - - 0 1',
    solution: 'b1b8',
    theme: 'Ladder mate',
    lesson:
      'Two rooks work in a staircase: one cuts off the rank the king stands on, the other checks along the next.',
  },
  {
    id: 'rook-lift-1',
    fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    solution: 'e1e8',
    theme: 'Back-rank mate',
    lesson: 'Look for the enemy king walled in by its own pawns before you look for anything clever.',
  },
  {
    id: 'two-bishops-1',
    fen: '7k/8/6K1/3B4/8/B7/8/8 w - - 0 1',
    solution: 'a3b2',
    theme: 'Two-bishop mate',
    lesson:
      'Two bishops cover adjacent diagonals. One checks along the long diagonal while the other takes the flight square.',
  },
  {
    id: 'rook-cutoff-1',
    fen: '8/8/8/8/8/5K1k/8/R7 w - - 0 1',
    solution: 'a1h1',
    theme: 'Rook mate on the edge',
    lesson:
      'Drive the king to the edge, take the escape squares with your own king, and the rook delivers along the file.',
  },
  {
    id: 'queen-corner-1',
    fen: '7k/8/6K1/8/8/8/8/2Q5 w - - 0 1',
    solution: 'c1c8',
    theme: 'Queen mate on the back rank',
    lesson:
      'With your king holding g7 and h7, the queen does not need to get close — the back rank finishes it.',
  },
  {
    id: 'knight-rook-1',
    fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1',
    solution: 'a7h7',
    theme: 'Arabian mate',
    lesson:
      'The knight guards the flight square AND defends the rook, so the rook can sit right next to the king.',
  },
  {
    id: 'queen-file-1',
    fen: '6k1/5ppp/8/8/8/8/8/1Q4K1 w - - 0 1',
    solution: 'b1b8',
    theme: 'Queen on the back rank',
    lesson:
      'The queen mates alone on the back rank when their own pawns are the walls of the box.',
  },
  {
    id: 'corner-box-1',
    fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
    solution: 'h1h8',
    theme: 'Rook mate in the corner',
    lesson:
      'Your king takes the three squares around theirs; the rook only has to check from a safe distance.',
  },
]

export function puzzleById(id: string): Puzzle | null {
  return PUZZLES.find((p) => p.id === id) ?? null
}

/**
 * Pick a puzzle deterministically from a seed.
 *
 * Seeded rather than random so the same rest interval always shows the same
 * puzzle — reloading the app mid-set must not silently swap the position out
 * from under you.
 */
export function puzzleForSeed(seed: number, solvedIds: string[] = []): Puzzle {
  const unsolved = PUZZLES.filter((p) => !solvedIds.includes(p.id))
  const pool = unsolved.length ? unsolved : PUZZLES
  return pool[Math.abs(Math.trunc(seed)) % pool.length]
}
