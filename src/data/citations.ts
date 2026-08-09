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
  topics: (
    | 'resistance'
    | 'protein'
    | 'energy'
    | 'concurrent'
    | 'volume'
    | 'effort'
    | 'recovery'
    | 'running'
    | 'safety'
  )[]
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
    id: 'mifflin-1990-bmr',
    short: 'Mifflin-St Jeor 1990 resting energy',
    title: 'A new predictive equation for resting energy expenditure in healthy individuals',
    authors: 'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO',
    source: 'American Journal of Clinical Nutrition, 51(2):241–247',
    year: 1990,
    url: 'https://doi.org/10.1093/ajcn/51.2.241',
    takeaway:
      'The equation FORGED uses to estimate resting energy expenditure from weight, height, age and sex. Subsequent evidence analyses by the Academy of Nutrition and Dietetics found it the most reliable of the common predictive equations in both normal-weight and obese adults.',
    caveat:
      'Even the best predictive equation lands within 10% of measured resting expenditure for only about 80% of people, and it is blind to individual differences in non-exercise activity. Treat the calorie target as a starting point to adjust from your own weight trend, not as a measurement.',
    topics: ['energy'],
  },
  {
    id: 'hall-2012-energy-dynamics',
    short: 'Hall 2012 energy balance dynamics',
    title: 'Energy balance and its components: implications for body weight regulation',
    authors: 'Hall KD, Heymsfield SB, Kemnitz JW, Klein S, Schoeller DA, Speakman JR',
    source: 'American Journal of Clinical Nutrition, 95(4):989–994',
    year: 2012,
    url: 'https://doi.org/10.3945/ajcn.112.036350',
    takeaway:
      'Body weight responds to a sustained energy imbalance, but the response is dynamic: energy expenditure falls as weight is lost, so a fixed calorie deficit does not produce a fixed, linear rate of loss. This is why FORGED calls its weekly projection an estimate and expects you to re-check it against real weight data.',
    caveat:
      'A review of energy-balance physiology rather than a trial of any particular diet. It does not endorse a specific calorie target for anyone.',
    topics: ['energy'],
  },
  {
    id: 'garthe-2011-loss-rate',
    short: 'Garthe 2011 rate of weight loss',
    title:
      'Effect of two different weight-loss rates on body composition and strength and power-related performance in elite athletes',
    authors: 'Garthe I, Raastad T, Refsnes PE, Koivisto A, Sundgot-Borgen J',
    source: 'International Journal of Sport Nutrition and Exercise Metabolism, 21(2):97–104',
    year: 2011,
    url: 'https://doi.org/10.1123/ijsnem.21.2.97',
    takeaway:
      'Losing weight at roughly 0.7% of body weight per week preserved lean mass and improved strength outcomes relative to a faster ~1.4%/week loss in trained athletes eating adequate protein and continuing to lift. This is the basis for the deficit cap in the FORGED rules file.',
    caveat:
      'Small sample of elite athletes. It supports a slower loss rate as the safer default; it does not mean a faster rate is harmful for everyone.',
    topics: ['energy', 'protein'],
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
    id: 'schoenfeld-2016-frequency',
    short: 'Schoenfeld 2016 training frequency',
    title:
      'Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy: A Systematic Review and Meta-Analysis',
    authors: 'Schoenfeld BJ, Ogborn D, Krieger JW',
    source: 'Sports Medicine, 46(11):1689–1697',
    year: 2016,
    url: 'https://doi.org/10.1007/s40279-016-0543-8',
    takeaway:
      'Training a muscle group at least twice a week produced greater hypertrophy than training it once a week in the pooled studies. Splitting the same weekly volume across two sessions is the cheapest structural change most people can make.',
    caveat:
      'Weekly volume was not equated in every included study, so part of the effect may be volume rather than frequency itself. There is no evidence that going beyond twice weekly adds much once volume is matched.',
    topics: ['resistance', 'volume'],
  },
  {
    id: 'schoenfeld-2017-load',
    short: 'Schoenfeld 2017 load vs hypertrophy',
    title:
      'Strength and Hypertrophy Adaptations Between Low- vs. High-Load Resistance Training: A Systematic Review and Meta-Analysis',
    authors: 'Schoenfeld BJ, Grgic J, Ogborn D, Krieger JW',
    source: 'Journal of Strength and Conditioning Research, 31(12):3508–3523',
    year: 2017,
    url: 'https://doi.org/10.1519/JSC.0000000000002200',
    takeaway:
      'Muscle growth was similar whether sets used heavy loads or light ones, provided the sets were taken close to failure. Maximal strength favoured the heavier loads. For hypertrophy this means the rep range is a preference, not a requirement — anywhere from roughly 6 to 30 reps works.',
    caveat:
      'Light-load sets have to be genuinely hard to count. A comfortable set of 25 is not equivalent to a hard set of 25.',
    topics: ['resistance', 'effort'],
  },
  {
    id: 'schoenfeld-2016-rest',
    short: 'Schoenfeld 2016 rest intervals',
    title:
      'Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men',
    authors: 'Schoenfeld BJ, Pope ZK, Benik FM, et al.',
    source: 'Journal of Strength and Conditioning Research, 30(7):1805–1812',
    year: 2016,
    url: 'https://doi.org/10.1519/JSC.0000000000001272',
    takeaway:
      'Three minutes of rest between sets produced greater strength and muscle thickness gains than one minute, in trained men doing an otherwise identical programme. Short rest cuts the reps you can do on later sets, and those lost reps are lost volume.',
    caveat:
      'One study in trained men on a fixed programme. It argues against rushing compound sets; it does not mean every isolation set needs three minutes.',
    topics: ['recovery', 'resistance', 'volume'],
  },
  {
    id: 'krzysztofik-2019-techniques',
    short: 'Krzysztofik 2019 advanced techniques review',
    title:
      'Maximizing Muscle Hypertrophy: A Systematic Review of Advanced Resistance Training Techniques and Methods',
    authors: 'Krzysztofik M, Wilk M, Wojdała G, Gołaś A',
    source: 'International Journal of Environmental Research and Public Health, 16(24):4897',
    year: 2019,
    url: 'https://doi.org/10.3390/ijerph16244897',
    takeaway:
      'Reviewing drop sets, rest-pause, supersets and forced reps, the evidence for any of them being superior to ordinary straight sets is limited. Their clearest documented advantage is efficiency — comparable stimulus in less training time.',
    caveat:
      'A narrative-leaning review of a small and heterogeneous literature. "Not proven superior" is not the same as "useless", and the fatigue cost of these techniques is real.',
    topics: ['resistance', 'effort', 'volume'],
  },
  {
    id: 'fink-2018-dropset',
    short: 'Fink 2018 drop sets',
    title:
      'Effects of drop set resistance training on acute stress indicators and long-term muscle hypertrophy and strength',
    authors: 'Fink J, Schoenfeld BJ, Kikuchi N, Nakazato K',
    source: 'The Journal of Sports Medicine and Physical Fitness, 58(5):597–605',
    year: 2018,
    url: 'https://pubmed.ncbi.nlm.nih.gov/28399613/',
    takeaway:
      'A drop-set group reached hypertrophy comparable to a conventional group while spending roughly half the time under the bar. Drop sets bought volume per minute; they did not buy extra growth per set.',
    caveat:
      'Small, short, and in a single movement. Treat it as evidence for time efficiency, not for superiority.',
    topics: ['resistance', 'effort'],
  },
  {
    id: 'maeo-2021-long-length',
    short: 'Maeo 2021 long muscle lengths',
    title:
      'Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths',
    authors: 'Maeo S, Huang M, Wu Y, et al.',
    source: 'Medicine & Science in Sports & Exercise, 53(4):825–837',
    year: 2021,
    url: 'https://doi.org/10.1249/MSS.0000000000002523',
    takeaway:
      'Training the hamstrings at long muscle lengths produced substantially more hypertrophy than matched work at short lengths. Where a movement loads the stretched position, that position is doing much of the work.',
    caveat:
      'One muscle group, one movement. The direction of the effect is consistent across the wider range-of-motion literature, but the size of it is not settled.',
    topics: ['resistance'],
  },
  {
    id: 'kassiano-2023-rom',
    short: 'Kassiano 2023 range of motion review',
    title:
      'Which ROMs Lead to Rome? A Systematic Review of the Effects of Range of Motion on Muscle Hypertrophy',
    authors: 'Kassiano W, Costa B, Nunes JP, et al.',
    source: 'Journal of Strength and Conditioning Research, 37(5):1135–1144',
    year: 2023,
    url: 'https://doi.org/10.1519/JSC.0000000000004415',
    takeaway:
      'Full range of motion generally matches or beats partial range, and partials performed in the stretched portion of the movement do about as well as full range — while partials in the shortened portion do worse. If you shorten a movement, shorten it at the top, never at the bottom.',
    caveat:
      'Studies differ in how they defined "full" range, and most are short. The practical rule — never cut the stretch — is better supported than any precise number.',
    topics: ['resistance'],
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
