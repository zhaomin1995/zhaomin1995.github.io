/*
 * i140.js — shared data layer for pages/i140.html (block dashboard) and
 * pages/i140-case.html (single-case tracker).
 *
 * Two data paths, deliberately:
 *   1. STATIC  — assets/data/i140/*.json, refreshed once a day by
 *                scripts/fetch_i140.py via GitHub Actions. Used by the
 *                dashboard: thousands of rows, no reason to re-fetch live.
 *   2. LIVE    — the public Power BI query endpoint, queried straight from the
 *                browser (it does send CORS headers for our origin). Used by the
 *                case tracker so a single case is always current, and because
 *                the per-case status text and history are far too bulky to ship
 *                statically for 300k cases.
 *
 * Upstream data belongs to the "I-140 Application Tracker" report published by
 * anto58; both pages credit it in the footer.
 */

(function (global) {
  'use strict';

  /* ── Upstream report identity ──────────────────────────────────────────── */
  const API = 'https://wabi-south-central-us-c-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
  const RESOURCE_KEY = '39891ddf-f60f-42c9-9d3b-051301753316';
  const CONTEXT = {
    DatasetId: 'e74d2f55-b3c0-4bba-9312-4a3867d21279',
    Sources: [{ ReportId: '4ae3a1e9-1935-46d4-bf0e-1e574f2eadf6', VisualId: '98188e7439fc1bba9c9d' }]
  };
  const MODEL_ID = 830318;

  /* Static data written by scripts/fetch_i140.py. */
  const DATA_ROOT = '../assets/data/i140/';
  const EPOCH = Date.UTC(2000, 0, 1);   // day offsets in the static files count from here

  /* ── Small helpers ─────────────────────────────────────────────────────── */

  /** Day offset (as stored in the static files) -> Date. */
  function dayToDate(day) {
    return day === null || day === undefined ? null : new Date(EPOCH + day * 86400000);
  }

  /** Whole days between two Dates, ignoring time of day. */
  function daysBetween(from, to) {
    if (!from || !to) return null;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  /** "Jan 24, 2025" — matches the date style of the USCIS notices themselves. */
  function formatDate(date, lang) {
    if (!date) return '—';
    if (lang === 'zh') {
      return date.getUTCFullYear() + '年' + (date.getUTCMonth() + 1) + '月' + date.getUTCDate() + '日';
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear();
  }

  /** ISO week key like "2025-W24", used to bucket the trend chart. */
  function weekKey(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;          // Monday = 1 ... Sunday = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);  // shift to the week's Thursday
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return d.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }

  /* ── Status vocabulary ─────────────────────────────────────────────────── */
  /*
   * The dataset carries ~50 distinct USCIS status strings. Each is folded into
   * one of six buckets that drive colour and the KPI tiles; anything unknown
   * lands in "other" rather than being silently dropped.
   */
  const BUCKETS = {
    approved: { color: '#2e9e5b', en: 'Approved', zh: '已批准' },
    denied: { color: '#d64545', en: 'Denied', zh: '已拒绝' },
    rfe: { color: '#e3a008', en: 'RFE', zh: '补件通知' },
    rfeResponse: { color: '#c2410c', en: 'RFE Response', zh: '补件已回复' },
    review: { color: '#3b82f6', en: 'Under Review', zh: '审理中' },
    withdrawn: { color: '#8b8b90', en: 'Withdrawn / Closed', zh: '撤回 / 关闭' },
    other: { color: '#9ca3af', en: 'Other', zh: '其他' }
  };

  /** Fold a raw USCIS status string into one of the buckets above. */
  function bucketOf(status) {
    if (!status) return 'other';
    const s = status.toLowerCase();
    if (s.indexOf('rfe') === 0 || s.indexOf('request for additional evidence') >= 0 ||
        s.indexOf('request for initial') >= 0 || s.indexOf('request for evidence was sent') >= 0) return 'rfe';
    if (s.indexOf('response to uscis') >= 0 || s.indexOf('correspondence was received') >= 0) return 'rfeResponse';
    if (s.indexOf('approv') >= 0 && s.indexOf('revoke') < 0) return 'approved';
    if (s.indexOf('denied') >= 0 || s.indexOf('reject') >= 0 || s.indexOf('revok') >= 0 ||
        s.indexOf('dismissed') >= 0) return 'denied';
    if (s.indexOf('actively reviewed') >= 0 || s.indexOf('received') >= 0 ||
        s.indexOf('reviewing') >= 0 || s.indexOf('reopened') >= 0 ||
        s.indexOf('transferred') >= 0 || s.indexOf('department of state') >= 0) return 'review';
    if (s.indexOf('withdraw') >= 0 || s.indexOf('closed') >= 0) return 'withdrawn';
    return 'other';
  }

  /** True once a case has reached an end state (used for the progress KPIs). */
  function isDecided(status) {
    const b = bucketOf(status);
    return b === 'approved' || b === 'denied' || b === 'withdrawn';
  }

  /*
   * Chinese renderings of the statuses that actually occur in volume. The long
   * tail falls back to the English string rather than a wrong guess.
   */
  const STATUS_ZH = {
    'Case Approved': '案件已批准',
    'Case Was Approved': '案件已批准',
    'Case Was Approved And My Decision Was Emailed': '案件已批准，决定已邮件发送',
    'Approval Case Decision Rendered': '批准决定已作出',
    'Case Is Being Actively Reviewed By USCIS': 'USCIS 正在积极审理',
    'Case Was Denied': '案件被拒绝',
    'Case Was Received': '案件已收到',
    'Case Was Received and A Receipt Notice Was Sent': '案件已收到，收据通知已寄出',
    'Request for Additional Evidence Was Sent': '补件通知（RFE）已寄出',
    'Request for Initial Evidence Was Sent': '初始证据要求已寄出',
    'Response To USCIS\' Request For Evidence Was Received': '补件回复已收到',
    'Withdrawal Acknowledgement Notice Was Sent': '撤回确认通知已寄出',
    'Case Was Rejected': '案件被退回',
    'Case Was Rejected Because It Was Improperly Filed': '案件因提交不规范被退回',
    'Case Was Sent To The Department of State': '案件已转交国务院',
    'Revocation Notice Was Sent': '撤销通知已寄出',
    'Case Was Transferred And A New Office Has Jurisdiction': '案件已转交其他办公室',
    'Notice Explaining USCIS\' Actions Was Mailed': 'USCIS 行动说明通知已寄出',
    'Case Administratively Closed': '案件行政关闭',
    'Case Was Administratively Closed': '案件行政关闭',
    'Case Was Reopened': '案件已重开'
  };

  function statusLabel(status, lang) {
    return lang === 'zh' ? (STATUS_ZH[status] || status) : status;
  }

  /* ── Power BI live query ───────────────────────────────────────────────── */

  function col(prop) {
    return { Column: { Expression: { SourceRef: { Source: 'd1' } }, Property: prop } };
  }

  function named(prop, name) {
    const ref = col(prop);
    ref.Name = name;
    return ref;
  }

  /**
   * Decode Power BI's DSR wire format.
   *
   * Values arrive compressed three ways: `ValueDicts` (a cell holds an index
   * into a per-response string table named by the column's `DN`), the `R`
   * bitmask (bit i set = "column i repeats the previous row", value omitted)
   * and the null bitmask keyed by U+00D8 (bit i set = "column i is null").
   */
  function parseDSR(response) {
    const ds = response.results[0].result.data.dsr.DS[0];
    const dicts = ds.ValueDicts || {};
    const rowsIn = ((ds.PH || [{}])[0] || {}).DM0 || [];
    if (!rowsIn.length) return [];

    const schema = rowsIn[0].S || [];
    const width = schema.length;
    const dictNames = schema.map(c => c.DN);

    const out = [];
    let previous = new Array(width).fill(null);
    for (const row of rowsIn) {
      const values = row.C || [];
      const repeatMask = row.R || 0;
      const nullMask = row['Ø'] || 0;
      const current = new Array(width).fill(null);
      let cursor = 0;
      for (let i = 0; i < width; i++) {
        const bit = 1 << i;
        if (nullMask & bit) {
          current[i] = null;
        } else if (repeatMask & bit) {
          current[i] = previous[i];
        } else if (cursor < values.length) {
          const raw = values[cursor++];
          const dictName = dictNames[i];
          // A dictionary column sends an int index, but a value outside the
          // dictionary is sent inline as the literal itself.
          if (dictName && typeof raw === 'number') {
            const table = dicts[dictName] || [];
            current[i] = (raw >= 0 && raw < table.length) ? table[raw] : raw;
          } else {
            current[i] = raw;
          }
        }
      }
      out.push(current);
      previous = current;
    }
    return out;
  }

  /** Run one semantic query against the public endpoint. */
  async function query(entity, props, where, windowCount) {
    const body = {
      version: '1.0.0',
      queries: [{
        Query: {
          Commands: [{
            SemanticQueryDataShapeCommand: {
              Query: {
                Version: 2,
                From: [{ Name: 'd1', Entity: entity, Type: 0 }],
                Select: props.map(p => named(p, entity + '.' + p)),
                ...(where ? { Where: where } : {})
              },
              Binding: {
                Primary: { Groupings: [{ Projections: props.map((_, i) => i) }] },
                DataReduction: { DataVolume: 3, Primary: { Window: { Count: windowCount || 500 } } },
                Version: 1
              },
              ExecutionMetricsKind: 1
            }
          }]
        },
        QueryId: '',
        ApplicationContext: CONTEXT
      }],
      cancelQueries: [],
      modelId: MODEL_ID
    };

    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8', 'X-PowerBI-ResourceKey': RESOURCE_KEY },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('upstream query failed with HTTP ' + res.status);
    return parseDSR(await res.json());
  }

  /** Equality filter on a single column. */
  function whereEquals(prop, value) {
    return [{
      Condition: {
        In: {
          Expressions: [col(prop)],
          Values: [[{ Literal: { Value: "'" + String(value).replace(/'/g, "''") + "'" } }]]
        }
      }
    }];
  }

  /* ── Case lookups (live) ───────────────────────────────────────────────── */

  /**
   * Current state of one case, or null when the receipt number is not in the
   * dataset (the upstream tracker only covers I-140 receipts in known blocks).
   */
  async function fetchCase(caseId) {
    const rows = await query(
      'db_API',
      ['caseId', 'form', 'formTitle', 'actionCodeText', 'actionCodeDesc', 'date', 'updated_at', 'Ranking', 'subgroup', 'Grupo'],
      whereEquals('caseId', caseId),
      5
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
      caseId: r[0],
      form: r[1] || 'I-140',
      // formTitle is blank for part of the dataset; the form number is the
      // reliable field, so fall back to its official title.
      formTitle: r[2] && r[2] !== r[1] ? r[2] : 'Immigrant Petition for Alien Worker',
      status: r[3],
      detail: r[4],
      date: r[5] ? new Date(r[5]) : null,
      seen: r[6] ? new Date(r[6]) : null,
      ranking: r[7],
      subgroup: r[8],
      block: r[9]
    };
  }

  /*
   * The upstream history table is noisy in two specific ways:
   *
   *   - Each poll writes two rows, the state before and the state after, so the
   *     same (status, date) pair recurs. Deduplicating on that pair is enough.
   *   - A handful of rows (4 in ~210k) carry the Spanish rendering of a status.
   *     Those are translated rather than dropped: for some cases the Spanish row
   *     is the *only* record of a real update, so discarding it loses an event.
   *
   * Placeholders that carry no status at all are the only rows removed.
   */
  const HISTORY_NOISE = /^(check case status|unknown)$/i;
  /* Matched loosely: the accented characters survive the round trip unevenly. */
  const SPANISH_TO_ENGLISH = [
    [/^caso siendo revisado activamente por uscis/i, 'Case Is Being Actively Reviewed By USCIS'],
    [/^respuesta a la petici.n de evidencia/i, 'Response To USCIS\' Request For Evidence Was Received']
  ];

  /** Fold a history row's status onto its English form. */
  function canonicalStatus(status) {
    for (const [pattern, english] of SPANISH_TO_ENGLISH) {
      if (pattern.test(status)) return english;
    }
    return status;
  }

  /** Full status history for one case, newest first. */
  async function fetchCaseHistory(caseId) {
    const rows = await query('new_case_history', ['status', 'date', 'created_at'], whereEquals('caseId', caseId), 500);

    const seen = new Map();
    for (const [rawStatus, dateMs, createdMs] of rows) {
      if (!rawStatus || !dateMs) continue;
      if (HISTORY_NOISE.test(rawStatus)) continue;
      const status = canonicalStatus(rawStatus);
      const key = status + '|' + dateMs;
      const existing = seen.get(key);
      // Keep the earliest sighting of an event: that is when it actually appeared.
      if (!existing || (createdMs && createdMs < existing.createdMs)) {
        seen.set(key, { status, date: new Date(dateMs), createdMs: createdMs || null });
      }
    }

    return Array.from(seen.values())
      .map(e => ({ status: e.status, date: e.date, firstSeen: e.createdMs ? new Date(e.createdMs) : null }))
      .sort((a, b) => b.date - a.date);
  }

  /* ── Static block data ─────────────────────────────────────────────────── */

  let indexPromise = null;
  let blockNames = null;   // populated by loadIndex, consulted by blockOf

  /** index.json: the status dictionary plus one summary per block. */
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(DATA_ROOT + 'index.json').then(r => {
        if (!r.ok) throw new Error('could not load index.json (HTTP ' + r.status + ')');
        return r.json();
      }).then(index => {
        blockNames = new Set((index.blocks || []).map(b => b.block));
        return index;
      });
    }
    return indexPromise;
  }

  /**
   * One block's cases, decoded into objects.
   * Rows on disk are [idSuffix, statusIdx, dateDays, seenDays].
   */
  async function loadBlock(block) {
    const index = await loadIndex();
    const res = await fetch(DATA_ROOT + block + '.json');
    if (!res.ok) throw new Error('no data file for block ' + block);
    const raw = await res.json();
    const statuses = index.statuses || [];

    // A receipt number is 13 characters, so the stored suffix is however many
    // digits the block prefix leaves: 5 for the 8-char IOE blocks, 4 for the
    // 9-char LIN/SRC ones.
    const suffixWidth = 13 - block.length;

    return raw.rows.map(row => {
      const status = statuses[row[1]] || 'Unknown';
      return {
        caseId: typeof row[0] === 'number' ? block + String(row[0]).padStart(suffixWidth, '0') : String(row[0]),
        status: status,
        bucket: bucketOf(status),
        date: dayToDate(row[2]),
        seen: dayToDate(row[3])
      };
    });
  }

  /**
   * The block a receipt number belongs to. Block names are not a fixed width —
   * the IOE blocks are 8 characters, the LIN/SRC ones 9 — so match against the
   * names index.json actually lists, longest first. Falls back to 8 characters
   * when the index has not loaded yet.
   */
  function blockOf(caseId) {
    const clean = String(caseId || '').trim().toUpperCase();
    if (clean.length < 8) return '';
    if (blockNames) {
      for (const width of [9, 8]) {
        const candidate = clean.slice(0, width);
        if (blockNames.has(candidate)) return candidate;
      }
    }
    return clean.slice(0, 8);
  }

  /** Accepts "IOE0929646056" or "ioe 0929 646056"; returns '' if not plausible. */
  function normalizeCaseId(input) {
    const clean = String(input || '').replace(/[\s-]/g, '').toUpperCase();
    return /^[A-Z]{3}\d{10}$/.test(clean) ? clean : '';
  }

  /* ── Derived statistics ────────────────────────────────────────────────── */

  /** Counts per bucket, per raw status, and the headline rates. */
  function summarize(cases) {
    const buckets = {};
    const statuses = new Map();
    Object.keys(BUCKETS).forEach(k => { buckets[k] = 0; });

    for (const c of cases) {
      buckets[c.bucket] = (buckets[c.bucket] || 0) + 1;
      statuses.set(c.status, (statuses.get(c.status) || 0) + 1);
    }

    const total = cases.length;
    const decided = cases.filter(c => isDecided(c.status)).length;
    const finalDecisions = buckets.approved + buckets.denied;

    return {
      total: total,
      buckets: buckets,
      statuses: Array.from(statuses.entries()).sort((a, b) => b[1] - a[1]),
      decided: decided,
      pending: total - decided,
      // Approval rate is measured against approved+denied only: cases still in
      // the queue should not drag the rate down.
      approvalRate: finalDecisions ? (buckets.approved / finalDecisions) * 100 : null,
      progress: total ? (decided / total) * 100 : null
    };
  }

  /** Cases grouped into ISO weeks by status date, oldest first. */
  function byWeek(cases) {
    const weeks = new Map();
    for (const c of cases) {
      if (!c.date) continue;
      const key = weekKey(c.date);
      if (!weeks.has(key)) weeks.set(key, { key: key, total: 0, buckets: {} });
      const w = weeks.get(key);
      w.total += 1;
      w.buckets[c.bucket] = (w.buckets[c.bucket] || 0) + 1;
    }
    return Array.from(weeks.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
  }

  /** Cases decided in the last `days` days, by the date USCIS stamped. */
  function recentlyDecided(cases, days) {
    const cutoff = Date.now() - days * 86400000;
    return cases.filter(c => c.date && c.date.getTime() >= cutoff && isDecided(c.status)).length;
  }

  /**
   * Nth percentile of "days from the block's first case to a decision", over
   * cases that actually reached a decision. This is our data-driven answer to
   * the official "80% of cases completed within" figure — computed from the
   * cohort the user is actually in, instead of a nationwide average.
   */
  function decisionDaysPercentile(cases, percentile) {
    const dated = cases.filter(c => c.date).map(c => c.date.getTime());
    if (!dated.length) return null;
    const start = Math.min.apply(null, dated);

    const durations = cases
      .filter(c => c.date && isDecided(c.status))
      .map(c => Math.round((c.date.getTime() - start) / 86400000))
      .filter(d => d >= 0)
      .sort((a, b) => a - b);

    if (!durations.length) return null;
    const idx = Math.min(durations.length - 1, Math.floor((percentile / 100) * durations.length));
    return { days: durations[idx], sample: durations.length, start: new Date(start) };
  }

  /**
   * Where one case sits in its block: how many receipts ahead of it have been
   * decided, and how many are still waiting.
   */
  function queuePosition(cases, caseId) {
    const ahead = cases.filter(c => c.caseId < caseId);
    const aheadDecided = ahead.filter(c => isDecided(c.status)).length;
    return {
      ahead: ahead.length,
      aheadDecided: aheadDecided,
      aheadPending: ahead.length - aheadDecided,
      total: cases.length,
      percentile: cases.length ? (ahead.length / cases.length) * 100 : null
    };
  }

  /* ── Rendering helpers ─────────────────────────────────────────────────── */

  /**
   * The USCIS blurb arrives with raw anchor markup (and occasional unmatched
   * closing tags). Escape everything, then re-link bare URLs ourselves so the
   * text can never inject markup into the page.
   */
  function renderDetail(text) {
    if (!text) return '';
    const stripped = String(text).replace(/<[^>]*>/g, '');
    const escaped = stripped
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped.replace(/\b((?:https?:\/\/|www\.)[^\s,)]+)/gi, function (url) {
      const href = url.indexOf('http') === 0 ? url : 'https://' + url;
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
  }

  function currentLang() {
    return document.body.classList.contains('zh') ? 'zh' : 'en';
  }

  global.I140 = {
    // data access
    loadIndex, loadBlock, fetchCase, fetchCaseHistory, query, whereEquals,
    // identity helpers
    blockOf, normalizeCaseId,
    // vocabulary
    BUCKETS, bucketOf, isDecided, statusLabel,
    // statistics
    summarize, byWeek, recentlyDecided, decisionDaysPercentile, queuePosition,
    // formatting
    dayToDate, daysBetween, formatDate, weekKey, renderDetail, currentLang,
    DATA_ROOT
  };
})(window);
