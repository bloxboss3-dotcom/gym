/**
 * Centralised evidence sources.
 *
 * Every recommendation the engine produces carries a `citationIds` array that
 * resolves against this file, so the Science & Safety screen and the individual
 * "why?" panels always agree about what the app is basing a decision on.
 *
 * Summaries are deliberately conservative. Where a study reports a range or a
 * confidence interval, the range is stated rather than a single tidy number.
 */

export interface Citation {
  id: string
  /** Short label used inline in recommendation cards. */
  short: string
  title: string
  authors: string
  source: string
  year: number
  url: string
  /** What this source actually supports — no extrapolation. */
  takeaway: string
  /** Honest note about the limits of the evidence. */
  caveat?: string
  topics: ('resistance' | 'protein' | 'concurrent' | 'volume' | 'effort' | 'recovery' | 'running' | 'safety')[]
}

export const CITATIONS: Citation[] = [
  {
    id: 'acsm-2009-progression',
    short: 'ACSM 2009 progression models',
    title: 'Progression Models in Resistance Training for Healthy Adults (Position Stand)',
    authors: 'American College of Sports Medicine',
    source: 'Medicine & Science in Sports & Exercise, 41(3):687–708',
    year: 2009,
    url: 'https://doi.org/10.1249/MSS.0b013e3181915670',
    takeaway:
      'Untrained lifters progress on relatively modest loads and volumes; progression should be gradual and systematic, with load increased once the prescribed repetitions can be completed with good form. The position stand suggests roughly 2–10% load increases when the target reps are exceeded, with smaller relative jumps for upper-body movements and larger ones for lower-body movements.',
    caveat:
      'Consensus guidance rather than a single experiment. It describes sensible defaults across populations, not the optimum for any individual.',
    topics: ['resistance', 'volume'],
  },
  {
    id: 'acsm-2011-quantity',
    short: 'ACSM 2011 exercise quantity & quality',
    title:
      'Quantity and Quality of Exercise for Developing and Maintaining Cardiorespiratory, Musculoskeletal, and Neuromotor Fitness in Apparently Healthy Adults (Position Stand)',
    authors: 'Garber CE, Blissmer B, Deschenes MR, et al.',
    source: 'Medicine & Science in Sports & Exercise, 43(7):1334–1359',
    year: 2011,
    url: 'https://doi.org/10.1249/MSS.0b013e318213fefb',
    takeaway:
      'Train each major muscle group on 2–3 non-consecutive days per week, using 2–4 sets per exercise. About 8–12 repetitions per set suits strength and power for most adults; 10–15 works well for older or newly training adults; 15–20 targets muscular endurance. Allow at least 48 hours between sessions for the same muscle group.',
    caveat:
      'Written as a public-health floor for apparently healthy adults, not a ceiling for people chasing maximum hypertrophy.',
    topics: ['resistance', 'volume', 'recovery'],
  },
  {
    id: 'morton-2018-protein',
    short: 'Morton 2018 protein meta-analysis',
    title:
      'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
    authors: 'Morton RW, Murphy KT, McKellar SR, et al.',
    source: 'British Journal of Sports Medicine, 52(6):376–384',
    year: 2018,
    url: 'https://doi.org/10.1136/bjsports-2017-097608',
    takeaway:
      'Across 49 studies and 1,863 participants, protein supplementation alongside resistance training produced small but significant additional gains in fat-free mass and 1RM strength. The meta-regression placed the breakpoint for further fat-free-mass benefit at about 1.6 g of protein per kg of body weight per day, with a confidence interval reaching roughly 2.2 g/kg/day.',
    caveat:
      'The breakpoint is a population-level average with a wide confidence interval. It is the reason FORGED presents 1.6 g/kg as a baseline and 1.6–2.2 g/kg as a practical range — not as a mandate to eat 2.2.',
    topics: ['protein'],
  },
  {
    id: 'issn-2017-protein',
    short: 'ISSN 2017 protein position stand',
    title: 'International Society of Sports Nutrition Position Stand: protein and exercise',
    authors: 'Jäger R, Kerksick CM, Campbell BI, et al.',
    source: 'Journal of the International Society of Sports Nutrition, 14:20',
    year: 2017,
    url: 'https://doi.org/10.1186/s12970-017-0177-8',
    takeaway:
      'For building and maintaining muscle, an overall daily intake of roughly 1.4–2.0 g/kg/day is sufficient for most exercising individuals, distributed across meals containing about 0.25 g/kg (roughly 20–40 g) of high-quality protein every 3–4 hours.',
    caveat:
      'Higher intakes may be warranted during an energy deficit; the stand notes that most healthy adults tolerate these intakes without harm.',
    topics: ['protein'],
  },
  {
    id: 'helms-2014-deficit-protein',
    short: 'Helms 2014 protein in a deficit',
    title:
      'Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation',
    authors: 'Helms ER, Aragon AA, Fitschen PJ',
    source: 'Journal of the International Society of Sports Nutrition, 11:20',
    year: 2014,
    url: 'https://doi.org/10.1186/1550-2783-11-20',
    takeaway:
      'When training in an energy deficit and already lean, higher protein intakes help preserve lean mass. This is why FORGED nudges the recommended point toward the upper part of the 1.6–2.2 g/kg range for fat-loss and recomposition goals.',
    caveat: 'Derived from a lean, dieting athletic population; less relevant at a maintenance or surplus intake.',
    topics: ['protein'],
  },
  {
    id: 'schoenfeld-2017-volume',
    short: 'Schoenfeld 2017 volume dose-response',
    title:
      'Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    source: 'Journal of Sports Sciences, 35(11):1073–1082',
    year: 2017,
    url: 'https://doi.org/10.1080/02640414.2016.1210197',
    takeaway:
      'Hypertrophy scales with weekly hard-set volume in a graded fashion, with roughly 10+ weekly sets per muscle outperforming lower volumes on average. That average is where FORGED\'s ~10-set reference point comes from.',
    caveat:
      'A group average across mostly short studies. Individual responses vary widely, recoverable volume is personal, and the curve does not keep climbing forever — more is not automatically better.',
    topics: ['volume', 'resistance'],
  },
  {
    id: 'refalo-2023-failure',
    short: 'Refalo 2023 proximity to failure',
    title:
      'Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-Analysis',
    authors: 'Refalo MC, Helms ER, Trexler ET, Hamilton DL, Fyfe JJ',
    source: 'Sports Medicine, 53(3):649–665',
    year: 2023,
    url: 'https://doi.org/10.1007/s40279-022-01784-y',
    takeaway:
      'Sets taken close to — but not necessarily to — momentary failure produce similar hypertrophy to sets taken to failure, while costing less fatigue. Stopping with roughly 1–3 reps in reserve is a reasonable working target for most sets.',
    caveat:
      'Estimating your own reps in reserve is a learned skill; novices tend to underestimate how close to failure they really are.',
    topics: ['effort', 'resistance'],
  },
  {
    id: 'zourdos-2016-rir',
    short: 'Zourdos 2016 RIR scale',
    title:
      'Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve',
    authors: 'Zourdos MC, Klemp A, Dolan C, et al.',
    source: 'Journal of Strength and Conditioning Research, 30(1):267–275',
    year: 2016,
    url: 'https://doi.org/10.1519/JSC.0000000000001049',
    takeaway:
      'A repetitions-in-reserve based RPE scale tracks proximity to failure well enough to guide autoregulation, and accuracy improves with training experience.',
    caveat: 'Validation was in resistance-trained lifters; expect noisier self-ratings when you are new.',
    topics: ['effort'],
  },
  {
    id: 'wilson-2012-concurrent',
    short: 'Wilson 2012 concurrent training meta-analysis',
    title: 'Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises',
    authors: 'Wilson JM, Marin PJ, Rhea MR, Wilson SM, Loenneke JP, Anderson JC',
    source: 'Journal of Strength and Conditioning Research, 26(8):2293–2307',
    year: 2012,
    url: 'https://doi.org/10.1519/JSC.0b013e31823a3e2d',
    takeaway:
      'Adding endurance work to resistance training attenuated gains in strength, power and hypertrophy on average, and the interference scaled with the frequency and duration of the endurance work. Running produced more interference than cycling; explosive power was affected most.',
    caveat:
      'Older analysis with heterogeneous protocols. It supports spacing hard running away from hard lower-body lifting, not avoiding running.',
    topics: ['concurrent', 'running'],
  },
  {
    id: 'schumann-2022-concurrent',
    short: 'Schumann 2022 concurrent training review',
    title:
      'Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function: An Updated Systematic Review and Meta-Analysis',
    authors: 'Schumann M, Feuerbacher JF, Sünkeler M, et al.',
    source: 'Sports Medicine, 52(3):601–612',
    year: 2022,
    url: 'https://doi.org/10.1007/s40279-021-01587-7',
    takeaway:
      'In the updated pooled analysis, concurrent training did not compromise gains in muscle size, and maximal-strength gains were largely preserved. Explosive-strength development showed the clearest attenuation, particularly with running-based endurance work and with sessions performed close together.',
    caveat:
      'This is the more current and more optimistic read of the interference effect, and it is why FORGED manages *scheduling* rather than telling muscle-first users to stop running.',
    topics: ['concurrent', 'running'],
  },
  {
    id: 'nielsen-2014-running-load',
    short: 'Nielsen 2014 running progression',
    title:
      'Excessive progression in weekly running distance and risk of running-related injuries: an association which varies according to type of injury',
    authors: 'Nielsen RØ, Parner ET, Nohr EA, Sørensen H, Lind M, Rasmussen S',
    source: 'Journal of Orthopaedic & Sports Physical Therapy, 44(10):739–747',
    year: 2014,
    url: 'https://doi.org/10.2519/jospt.2014.5164',
    takeaway:
      'Large weekly jumps in running distance were associated with certain running-related injuries in novice runners, but the association depended on injury type and on the runner. The evidence does not support a universal "never exceed 10%" law.',
    caveat:
      'Observational. FORGED therefore caps weekly increases based on your experience, recent completion rate, RPE and pain rather than applying one fixed percentage to everybody.',
    topics: ['running', 'safety'],
  },
  {
    id: 'damsted-2018-load-review',
    short: 'Damsted 2018 training-load review',
    title:
      'Is there evidence for an association between changes in training load and running-related injuries? A systematic review',
    authors: 'Damsted C, Glad S, Nielsen RØ, Sørensen H, Malisoux L',
    source: 'International Journal of Sports Physical Therapy, 13(6):931–942',
    year: 2018,
    url: 'https://pubmed.ncbi.nlm.nih.gov/30534459/',
    takeaway:
      'The review found limited and inconsistent evidence linking specific training-load changes to running injuries, and explicitly questioned rigid progression rules.',
    caveat: 'Absence of strong evidence is not evidence that big jumps are safe — it argues for individualised caution.',
    topics: ['running', 'safety'],
  },
  {
    id: 'bell-2020-overreaching',
    short: 'Bell 2020 overreaching scoping review',
    title:
      'Overreaching and overtraining in strength sports and resistance training: A scoping review',
    authors: 'Bell L, Ruddock A, Maden-Wilkinson T, Rogerson D',
    source: 'Journal of Sports Sciences, 38(16):1897–1912',
    year: 2020,
    url: 'https://doi.org/10.1080/02640414.2020.1763077',
    takeaway:
      'Accumulated fatigue from sustained hard training can suppress performance, and planned reductions in load or volume are a normal part of managing it. Performance decline, elevated soreness, disturbed sleep and persistent joint discomfort are among the practical markers used to identify it.',
    caveat:
      'There is no validated consumer test for overreaching. FORGED treats its deload signals as a prompt to reflect, not a diagnosis.',
    topics: ['recovery', 'safety'],
  },
  {
    id: 'pag-2018',
    short: 'US Physical Activity Guidelines 2018',
    title: 'Physical Activity Guidelines for Americans, 2nd edition',
    authors: 'U.S. Department of Health and Human Services',
    source: 'HHS, Washington DC',
    year: 2018,
    url: 'https://health.gov/sites/default/files/2019-09/Physical_Activity_Guidelines_2nd_edition.pdf',
    takeaway:
      'Adults should do muscle-strengthening activities of at least moderate intensity involving all major muscle groups on 2 or more days a week, plus 150–300 minutes of moderate-intensity aerobic activity weekly.',
    topics: ['resistance', 'running', 'safety'],
  },
  {
    id: 'acsm-preparticipation',
    short: 'ACSM pre-participation screening',
    title: 'Updating ACSM’s Recommendations for Exercise Preparticipation Health Screening',
    authors: 'Riebe D, Franklin BA, Thompson PD, et al.',
    source: 'Medicine & Science in Sports & Exercise, 47(11):2473–2479',
    year: 2015,
    url: 'https://doi.org/10.1249/MSS.0000000000000664',
    takeaway:
      'Medical clearance before exercise is directed at people with known cardiovascular, metabolic or renal disease, or with signs and symptoms suggestive of it — chest discomfort, unusual breathlessness, dizziness or fainting among them.',
    caveat:
      'FORGED is not a screening tool. If any of those symptoms appear, stop training and contact a clinician.',
    topics: ['safety'],
  },
]

export const CITATION_BY_ID: Record<string, Citation> = CITATIONS.reduce(
  (acc, c) => {
    acc[c.id] = c
    return acc
  },
  {} as Record<string, Citation>,
)

export function citationsFor(ids: readonly string[]): Citation[] {
  return ids.map((id) => CITATION_BY_ID[id]).filter(Boolean)
}
