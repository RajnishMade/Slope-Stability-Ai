/* ============================================================================
 *  DGMS GUIDELINES — PAGE CONTENT   (this is the file to edit)
 * ----------------------------------------------------------------------------
 *  Everything shown on the "DGMS Guidelines" page of the website lives in THIS
 *  file. You do NOT need to touch any React/TypeScript code to change the
 *  wording, the numbers, or the tables — just edit the strings below.
 *
 *  SOURCE VERIFICATION (2026)
 *  The factor-of-safety criteria and the study / monitoring requirements below
 *  were checked WORD-FOR-WORD against the primary DGMS documents:
 *    • DGMS (Tech) Circular No. 03 of 2020 — Scientific study under Reg. 106
 *      (opencast coal). Holds the FoS numbers (para 3.2) and study scope (para 2.0).
 *    • DGMS (Tech) Circular No. 02 of 2020 — Systematic monitoring of slopes
 *      (coal & metalliferous). TARP / Warning & Withdrawal levels.
 *    • DGMS (Tech) Circular/08 dated 23.09.2013 — original slope-monitoring mandate.
 *  Sections confirmed against those PDFs carry `verified: true` (green chip).
 *  The bench height/width limits come from CMR 2017, Reg. 106, verified against
 *  the statute text (Indian Kanoon reproduction of the Gazette, doc/186023800).
 *
 *  HOW TO EDIT
 *   • Text/paragraph: strings in `body: [ ... ]`.  • Bullets: `bullets: [ ... ]`.
 *   • Table: `columns` = headers; each `rows` entry = cells in column order.
 *   • `verified: true` → green "Verified — primary source" chip.
 *   • `verify: true`   → amber "Verify against source" chip (unconfirmed number).
 * ========================================================================== */

export interface GuidelineTable {
  columns: string[];
  rows: string[][];
  note?: string;
}

export interface GuidelineSection {
  id: string;
  glyph?: string;
  heading: string;
  body: string[];
  bullets?: string[];
  table?: GuidelineTable;
  /** source document for this card */
  citation?: string;
  /** amber "verify against source" chip — number not yet confirmed from a primary PDF */
  verify?: boolean;
  /** green "verified — primary source" chip — confirmed word-for-word from the circular */
  verified?: boolean;
}

/* ---- page header ---------------------------------------------------------- */
export const DGMS_TITLE = "DGMS Guidelines";
export const DGMS_SUBTITLE =
  "Statutory framework for open-cast slope, bench and dump design in Indian mines";

export const DGMS_INTRO =
  "The Directorate General of Mines Safety (DGMS) regulates occupational safety in Indian " +
  "mines. For open-cast workings, the scientific slope-stability study, the minimum factors " +
  "of safety, and the systematic slope-monitoring regime are set out under Regulation 106 of " +
  "the Coal Mines Regulations 2017 (CMR 2017) and two DGMS Technical Circulars issued in 2020 " +
  "— No. 03 of 2020 (scientific study & factor of safety) and No. 02 of 2020 (monitoring / TARP). " +
  "This page summarises those provisions and the parameters they turn on.";

/* Green banner near the top listing what has been checked against the primary text. */
export const DGMS_VERIFIED =
  "Factor-of-safety criteria and the study & monitoring requirements on this page are quoted " +
  "from the primary source documents: DGMS (Tech) Circular No. 03 of 2020 (scientific study " +
  "under Reg. 106, opencast coal) and No. 02 of 2020 (systematic monitoring of slopes). The bench " +
  "height/width limits are from CMR 2017, Reg. 106, verified against the statute text.";

/* Amber banner — the standing caveat. */
export const DGMS_DISCLAIMER =
  "Summary for engineering guidance. The factor-of-safety rule below is legally binding for " +
  "opencast COAL mines (CMR 2017); for metalliferous mines it is best practice, not yet a " +
  "CMR/MMR-mandated number. Nothing here replaces the full circulars or a site-specific " +
  "slope-stability study by a competent person.";

/* ---- the body sections (cards) -------------------------------------------- */
export const DGMS_SECTIONS: GuidelineSection[] = [
  {
    id: "framework",
    glyph: "§",
    heading: "Regulatory framework",
    body: [
      "Open-cast workings are regulated under the Mines Act 1952 and the regulations made under " +
        "it — CMR 2017 (coal) and MMR 1961 (metalliferous) — together with DGMS Technical Circulars " +
        "that give detailed guidance on slope stability and monitoring. The 2020 circulars are issued " +
        "under Reg. 106 of CMR 2017; the corresponding MMR 1961 amendment is noted as still in the " +
        "pipeline, so for metalliferous mines the numbers are best practice rather than statute.",
    ],
    bullets: [
      "CMR 2017, Reg. 106 — governs open-cast coal; the two 2020 circulars are issued under it.",
      "DGMS (Tech) Circular No. 03 of 2020 — scientific study & minimum factors of safety (opencast coal).",
      "DGMS (Tech) Circular No. 02 of 2020 — systematic slope monitoring / TARP (coal AND metalliferous).",
      "DGMS (Tech) Circular/08 dated 23.09.2013 — the original slope-monitoring mandate.",
      "MMR 1961 — metalliferous mines; slope-monitoring amendment noted as in pipeline.",
    ],
    citation: "Mines Act 1952; CMR 2017 Reg. 106; DGMS (Tech) Circulars 02 & 03 of 2020; Circular/08 of 23.09.2013.",
    verified: true,
  },
  {
    id: "fos",
    glyph: "✓",
    heading: "Factor-of-safety acceptance criteria",
    body: [
      "The scientific study must demonstrate a minimum factor of safety (FoS). Circular 03 of 2020 " +
        "sets a single two-tier rule applied to pit, bench and dump slopes alike — not different values " +
        "per slope material. This is the criterion this tool flags predictions against.",
      "Para 3.1: the FoS is determined considering all concerned parameters — geo-mechanical properties " +
        "of the rock mass, groundwater condition, hydro-geological studies, seismic effect, method of " +
        "mining, etc. Seismic effect is therefore an INPUT to the FoS computation, not a separate relaxed " +
        "threshold; there is no lower seismic-case FoS in this circular.",
    ],
    table: {
      columns: ["Slope type", "Minimum factor of safety"],
      rows: [
        ["Permanent or long-standing slopes", "≥ 1.50"],
        ["All other (working) pit, bench & dump slopes", "≥ 1.30"],
      ],
      note:
        "Para 3.2, verbatim: the minimum FoS shall in any case not be less than 1.50 for permanent or " +
        "long-standing slopes and 1.30 for all other cases. Legally binding for opencast COAL mines; " +
        "best practice (not yet CMR/MMR-mandated) for metalliferous mines.",
    },
    citation: "DGMS (Tech) Circular No. 03 of 2020, para 3.2 (values) & 3.1 (parameters). Under Reg. 106, CMR 2017.",
    verified: true,
  },
  {
    id: "study-trigger",
    glyph: "◎",
    heading: "When a scientific study is mandatory",
    body: [
      "For a mechanised open-cast coal mine the scientific study of slope stability under Reg. 106(2) " +
        "is mandatory BEFORE mechanised opencast working begins. It is not triggered by any threshold " +
        "height or depth — every mechanised opencast coal mine requires one. The study's recommendations " +
        "are binding: compliance is required under Reg. 106(3).",
    ],
    bullets: [
      "Mandatory before starting mechanised opencast working (Reg. 106(2)).",
      "Recommendations must be complied with (Reg. 106(3)).",
      "Reviewed from time to time, and whenever there is any significant change in the mine (para 7.0).",
      "A fresh study is mandatory before reaching the final / ultimate pit stage (para 8.0).",
    ],
    citation: "DGMS (Tech) Circular No. 03 of 2020, paras 1.0, 6.0–8.0; CMR 2017 Reg. 106(2)–(3).",
    verified: true,
  },
  {
    id: "study-scope",
    glyph: "▤",
    heading: "Scope of the scientific study (para 2.0)",
    body: [
      "The study is far broader than bench angles alone. Para 2.0 requires it to cover the full mining, " +
        "water-management and dump design, with slope monitoring built into the plan:",
    ],
    bullets: [
      "Method and sequence of mining and dumping; degree of mechanisation.",
      "Bench geometry — height, width, slope and inter-ramp angles.",
      "Drilling and blasting, including controlled blasting near final walls.",
      "Transport layout and haul-road dimensions; surface-facilities layout.",
      "Slope monitoring as an integral part of the planning.",
      "Water management — in-pit sumps, drainage, pre-mining hydrostatic depressurisation, weep holes, water-table monitoring.",
      "Dumps — external/internal type, site selection, foundation design, height, slope, benching/terracing, gradient of base floor, distance from active workings / quarry edge, and effect of fire or spontaneous heating.",
    ],
    citation: "DGMS (Tech) Circular No. 03 of 2020, para 2.0.",
    verified: true,
  },
  {
    id: "monitoring-tarp",
    glyph: "📈",
    heading: "Slope monitoring & TARP",
    body: [
      "Slopes must be systematically monitored under a Trigger Action Response Plan (TARP). The scheme " +
        "— instrumentation, frequency and pattern of data collection, and customised trigger points — is " +
        "specified in the scientific-study report (Circular 03 of 2020, para 4.0) and governed by the " +
        "monitoring circular (Circular 02 of 2020), which applies to BOTH coal and metalliferous mines.",
    ],
    bullets: [
      "TARP with two escalation triggers: a Warning Level and a Withdrawal Level.",
      "Monitoring methodology and system customised to local needs (instrumentation, frequency, data pattern).",
      "A designated slope-monitoring officer — or the strata-control officer doubling up.",
      "A Geo-Technical Cell for groups of mines.",
    ],
    citation: "DGMS (Tech) Circular No. 02 of 2020; Circular 03 of 2020, para 4.0; originally mandated by Circular/08 of 23.09.2013.",
    verified: true,
  },
  {
    id: "bench-geometry",
    glyph: "⛰",
    heading: "Bench geometry — height & width",
    body: [
      "Regulation 106 sets hard limits on bench height and width by ground type. Ultimate pit and dump " +
        "slopes are not fixed by these working limits — they are set by the scientific study. The Chief " +
        "Inspector of Mines may permit a variance under Reg. 106(6).",
    ],
    table: {
      columns: ["Bench type", "Max height", "Min width", "Basis"],
      rows: [
        [
          "Loose overburden (alluvial soil, moorum, gravel, clay, debris or similar)",
          "≤ 3 m",
          "≥ 3 × height",
          "Reg. 106(4)",
        ],
        [
          "Coal & rock overburden",
          "≤ digging height / reach of the excavation machine in use",
          "≥ greatest of: widest machine + 2 m; 3 × dumper width (if dumpers ply); or bench height",
          "Reg. 106(5)",
        ],
        [
          "Ultimate pit slope & dump slope",
          "Set by scientific study",
          "Set by scientific study",
          "Reg. 106(2); Circular 03/2020 para 2.0",
        ],
      ],
      note: "The Chief Inspector of Mines may permit a variance under Reg. 106(6).",
    },
    citation:
      "CMR 2017, Reg. 106(2),(4),(5),(6) — verified against the statute text (Indian Kanoon reproduction).",
    verified: true,
  },
  {
    id: "angle-strength",
    glyph: "∠",
    heading: "Slope & bench angle vs. rock strength (indicative)",
    body: [
      "DGMS prescribes no fixed slope-angle table — the safe angle comes from the site-specific study and " +
        "must meet the FoS criteria above. The ranges below are INDICATIVE engineering values only, to " +
        "bracket a design; they are not DGMS statutory figures.",
    ],
    table: {
      columns: ["Material / rock mass", "Bench face angle", "Overall slope angle"],
      rows: [
        ["Soil / loose overburden dump", "≈ angle of repose (~37°)", "≈ 26–33°"],
        ["Weak / weathered rock", "≈ 45–55°", "≈ 34–42°"],
        ["Moderately strong, jointed rock", "≈ 55–70°", "≈ 42–50°"],
        ["Strong / massive rock", "≈ 70–80°+", "site-specific (joint-controlled)"],
      ],
      note:
        "Indicative only — not from any DGMS circular. Where discontinuities daylight into the face " +
        "(planar, wedge or toppling geometry), the kinematics govern the safe angle regardless of " +
        "intact-rock strength.",
    },
    citation: "Indicative geotechnical practice (not a DGMS figure); the DGMS route is a site-specific study meeting FoS ≥ 1.30 / 1.50.",
  },
  {
    id: "parameters",
    glyph: "⚙",
    heading: "Parameters influencing bench height & angle",
    body: [
      "The safe bench height and angle are driven by the same ground parameters this tool takes as model " +
        "inputs — a subset of the fuller study scope in para 2.0 above — which is why the prediction can be " +
        "read directly against these guidelines:",
    ],
    bullets: [
      "Shear strength — cohesion (c) and friction angle (φ): higher strength allows steeper, taller stable benches.",
      "Unit weight (γ): heavier rock increases the driving (destabilising) force.",
      "Rock-mass quality — RMR / GSI / Q: weathering and alteration reduce it and flatten the safe angle.",
      "Discontinuities — dip, dip direction, spacing and persistence of joints, bedding and faults relative to the face (govern planar, wedge and toppling failure).",
      "Groundwater / pore pressure (r_u): reduces effective stress; drainage and depressurisation improve stability.",
      "Slope height & geometry: taller slopes and steeper upper slopes lower the factor of safety.",
      "Blast damage & ground vibration: degrade the final wall — controlled/pre-split blasting is used near ultimate slopes.",
      "Seismic loading (kh): a parameter in the FoS computation (Circular 03 of 2020, para 3.1).",
      "Dump material & foundation: material type, compaction and foundation strength govern dump-slope design.",
    ],
    citation: "Maps to the model inputs used across the four failure modes in this tool; see study scope (para 2.0).",
  },
];

/* ---- references (shown at the foot of the page) --------------------------- */
export const DGMS_REFERENCES: string[] = [
  "DGMS (Tech) Circular No. 03 of 2020 — Scientific study of slope stability under Reg. 106 (opencast coal); factor of safety, para 3.2.",
  "DGMS (Tech) Circular No. 02 of 2020 — Systematic monitoring of slopes (coal & metalliferous); Trigger Action Response Plan.",
  "DGMS (Tech) Circular/08 dated 23.09.2013 — original mandate for slope-monitoring systems.",
  "The Coal Mines Regulations, 2017 — Regulation 106: scientific study 106(2)–(3), bench geometry 106(4)–(5), variance 106(6). Statute text via Indian Kanoon reproduction (doc/186023800).",
  "The Metalliferous Mines Regulations, 1961 — slope-monitoring amendment noted as in pipeline.",
  "The Mines Act, 1952.",
];
