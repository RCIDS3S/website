import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "src", "data");
const publicFile = path.join(dataDir, "opportunities.json");
const generatedFile = path.join(dataDir, "opportunities.generated.json");
const sourcesFile = path.join(dataDir, "opportunity-sources.json");
const reviewDir = path.join(process.cwd(), ".opportunity-candidates");
const reviewFile = path.join(reviewDir, "index.html");
const maxPublicItems = 260;

const relevanceTerms = [
  "rhetoric",
  "rhetorical",
  "rhetorics",
  "cultural rhetorics",
  "digital rhetoric",
  "public rhetoric",
  "public address",
  "argumentation",
  "composition",
  "writing",
  "writing studies",
  "technical communication",
  "professional communication",
  "technical writing",
  "professional writing",
  "scientific communication",
  "science communication",
  "documentation",
  "content strategy",
  "ux",
  "user experience",
  "information design",
  "information architecture",
  "data visualization",
  "visual communication",
  "document design",
  "communication design",
  "design of communication",
  "risk communication",
  "health communication",
  "public communication",
  "strategic communication",
  "critical communication",
  "communication studies",
  "media studies",
  "media",
  "film",
  "cinema",
  "television",
  "documentary",
  "video art",
  "experimental",
  "digital",
  "technology",
  "internet",
  "computing",
  "artificial intelligence",
  "ai",
  "llm",
  "generative",
  "design",
  "humanities computing",
  "digital humanities",
  "theory",
  "philosophy",
  "critical theory",
  "pedagogy",
  "teaching",
  "graduate",
  "fellowship",
  "grant",
  "funding",
  "public humanities",
  "visual culture",
  "information",
  "interface",
  "accessibility",
  "environmental justice",
  "science and culture"
];

const highSignalFestivalTerms = [
  "ann arbor",
  "media city",
  "images festival",
  "ars electronica",
  "open city",
  "rotterdam",
  "sundance",
  "flaherty",
  "true/false",
  "cinema du reel",
  "doclisboa",
  "sheffield docfest",
  "transmediale",
  "oberhausen",
  "experimental",
  "essay film",
  "video art",
  "new media"
];

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanTitle(value) {
  return stripHtml(value)
    .replace(/^cfp:\s*/i, "CFP: ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
}

function parseDate(value) {
  const clean = stripHtml(value).replace(/\s+-\s+\d{1,2}:\d{2}(am|pm)$/i, "");
  const date = new Date(clean);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function parseMonthDayWithReference(value, referenceDate) {
  const clean = stripHtml(value).replace(/\./g, "");
  const match = clean.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/);
  if (!match || !referenceDate) return "";

  const reference = new Date(`${referenceDate}T00:00:00-04:00`);
  if (Number.isNaN(reference.getTime())) return "";

  let date = new Date(`${match[1]} ${match[2]}, ${reference.getFullYear()}`);
  if (Number.isNaN(date.getTime())) return "";
  if (date < reference) {
    date = new Date(`${match[1]} ${match[2]}, ${reference.getFullYear() + 1}`);
  }

  return date.toISOString().slice(0, 10);
}

function inferEventDate(text) {
  const raw = stripHtml(text);
  const europeanRange = raw.match(/\b(\d{1,2})\.?\s*[-–]\s*\d{1,2}\.(\d{1,2})\.(20\d{2})\b/);
  if (europeanRange) {
    return parseDate(`${europeanRange[3]}-${europeanRange[2]}-${europeanRange[1]}`);
  }

  const clean = raw.replace(/\./g, "");
  const rangeFirstDate = clean.match(/\b(\d{1,2})\s*[-–]\s*\d{1,2}\s+([A-Za-z]{3,9})\s*,?\s+(20\d{2})\b/);
  if (rangeFirstDate) {
    return parseDate(`${rangeFirstDate[2]} ${rangeFirstDate[1]}, ${rangeFirstDate[3]}`);
  }

  const monthRange = clean.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\s*[-–]\s*\d{1,2}\s*,?\s+(20\d{2})\b/);
  if (monthRange) {
    return parseDate(`${monthRange[1]} ${monthRange[2]}, ${monthRange[3]}`);
  }

  const monthDayYear = clean.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\s*,?\s+(20\d{2})\b/);
  if (monthDayYear) {
    return parseDate(`${monthDayYear[1]} ${monthDayYear[2]}, ${monthDayYear[3]}`);
  }

  return "";
}

function daysUntil(deadline, now = new Date()) {
  if (!deadline) return 9999;
  const date = new Date(`${deadline}T23:59:59-04:00`);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

function isExpired(deadline, now = new Date()) {
  if (!deadline) return false;
  const date = new Date(`${deadline}T23:59:59-04:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < now.getTime();
}

function inferFields(text) {
  const lower = text.toLowerCase();
  const fields = [];

  if (/rhetoric|rhetorical|rhetorics|composition|writing studies|writing pedagogy|public address|argumentation/.test(lower)) fields.push("Rhetoric");
  if (/communication studies|public communication|strategic communication|critical communication|health communication|risk communication|science communication/.test(lower)) fields.push("Communication");
  if (/technical communication|professional communication|technical writing|professional writing|documentation|content strategy|workplace|ux|user experience/.test(lower)) fields.push("Technical Communication");
  if (/information design|information architecture|data visualization|visual communication|document design|communication design|design of communication/.test(lower)) fields.push("Information Design");
  if (/film|cinema|television|documentary|screen|video art|moving image/.test(lower)) fields.push("Film / Media");
  if (/artificial intelligence|\bai\b|llm|chatbot|generative/.test(lower)) fields.push("AI");
  if (/digital|technology|internet|computing|interface|platform|design/.test(lower)) fields.push("Digital Humanities / Design");
  if (/theory|philosophy|critical theory|ontology/.test(lower)) fields.push("Theory");
  if (/pedagogy|teaching|learning|classroom|curriculum/.test(lower)) fields.push("Pedagogy");
  if (/journal|special issue|edited collection|chapter|collection/.test(lower)) fields.push("Publication");
  if (/grant|fellowship|funding/.test(lower)) fields.push("Funding");
  if (/art|exhibition|gallery|installation|interactive|new media/.test(lower)) fields.push("Art / Media Practice");

  return fields.length ? Array.from(new Set(fields)) : ["Interdisciplinary"];
}

function inferType(text, sourceType) {
  const lower = text.toLowerCase();

  if (/journal|special issue/.test(lower)) return "Journal CFP";
  if (/edited collection|chapter|collection of essays/.test(lower)) return "Edited Collection";
  if (/conference|symposium|colloquium|panel|roundtable|seminar/.test(lower)) return "Conference CFP";
  if (/festival|filmfreeway/.test(lower)) return "Film Festival";
  if (/grant|fellowship|funding/.test(lower)) return "Grant / Fellowship";
  if (/exhibition|gallery|open call|artist/.test(lower)) return "Art Call";

  return sourceType?.includes("Festival") ? "Film Festival" : "CFP";
}

function relevanceScore(text, source) {
  const lower = text.toLowerCase();
  let score = source.confidence === "high" ? 24 : source.confidence === "medium" ? 12 : 6;

  for (const term of relevanceTerms) {
    if (lower.includes(term.toLowerCase())) score += 4;
  }

  if (/rhetoric|rhetorical|rhetorics|communication studies|technical communication|professional communication|technical writing|professional writing|information design|information architecture|content strategy|digital humanities|artificial intelligence|\bai\b|film|media|design/.test(lower)) score += 10;
  if (/deadline for submissions|abstracts due|submissions due|call for papers|cfp/.test(lower)) score += 4;
  if (/scam|fee waiver unavailable|contest only/.test(lower)) score -= 8;

  return score;
}

function isRelevant(text) {
  const lower = text.toLowerCase();
  return relevanceTerms.some((term) => lower.includes(term.toLowerCase()));
}

function isCleanCandidate(item) {
  if (!item.title || !item.sourceUrl || !item.excerpt) return false;
  if (item.title.length > 150) return false;
  if (/&[a-z]+;|<[^>]+>/.test(item.title)) return false;
  if (item.status === "closed") return false;
  if (isExpired(item.deadline)) return false;
  return daysUntil(item.deadline) >= 0;
}

function shouldPublish(item) {
  if (!isCleanCandidate(item)) return false;
  if (!item.deadline && item.deadlineType === "Program") return false;
  if (item.publishMode === "auto" && item.score >= 28) return true;

  const haystack = `${item.title} ${item.excerpt} ${item.fields.join(" ")}`.toLowerCase();
  if (item.source === "FilmFreeway" && highSignalFestivalTerms.some((term) => haystack.includes(term))) {
    return item.score >= 22;
  }

  return item.publishMode === "candidate" && item.score >= 46;
}

function itemKey(item) {
  const title = canonicalTitle(item.title).split(" ").slice(0, 12).join("-");
  const deadline = item.deadline || "undated";
  return `${title}-${deadline}`;
}

const titleStopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "this",
  "that",
  "vol",
  "volume",
  "issue",
  "conference",
  "session",
  "panel",
  "seminar",
  "symposium"
]);

function canonicalTitle(value) {
  return cleanTitle(value)
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\([^)]*\b(conference|session|panel|seminar|symposium|deadline|abstract|submission|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|202\d|203\d)\b[^)]*\)/gi, " ")
    .replace(/\b(cfp|call for papers|call for chapters|call for proposals|deadline extended|extended deadline|reminder|update|new deadline|abstracts due|submissions due)\b/gi, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !titleStopwords.has(word))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value) {
  return canonicalTitle(value)
    .split(" ")
    .filter(Boolean);
}

function tokenSimilarity(a, b) {
  const left = new Set(titleTokens(a));
  const right = new Set(titleTokens(b));
  if (!left.size || !right.size) return 0;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }

  return shared / new Set([...left, ...right]).size;
}

function sourceRank(item) {
  const sourceText = `${item.source || ""} ${item.sourceName || ""}`.toLowerCase();
  let rank = item.confidence === "high" ? 30 : item.confidence === "medium" ? 18 : 8;

  if (/official|ann arbor|media city|images festival|open city|ars electronica|neh|acls|clir/.test(sourceText)) rank += 18;
  if (/upenn/.test(sourceText)) rank += 12;
  if (/cfplist|filmfreeway/.test(sourceText)) rank -= 4;
  if (item.publishMode === "auto") rank += 6;
  if (item.deadline) rank += 5;

  return rank;
}

function preferItem(left, right) {
  const leftRank = sourceRank(left) + (left.score || 0);
  const rightRank = sourceRank(right) + (right.score || 0);
  if (leftRank !== rightRank) return leftRank > rightRank ? left : right;

  const leftTitle = canonicalTitle(left.title).length;
  const rightTitle = canonicalTitle(right.title).length;
  if (leftTitle !== rightTitle) return leftTitle >= rightTitle ? left : right;

  return String(left.excerpt || "").length >= String(right.excerpt || "").length ? left : right;
}

function mergeItems(left, right) {
  const preferred = preferItem(left, right);
  const other = preferred === left ? right : left;

  return {
    ...other,
    ...preferred,
    score: Math.max(left.score || 0, right.score || 0),
    fields: Array.from(new Set([...(left.fields || []), ...(right.fields || [])])),
    excerpt: preferred.excerpt || other.excerpt,
    location: preferred.location || other.location,
    eventDate: preferred.eventDate || other.eventDate,
    sourceUrl: preferred.sourceUrl || other.sourceUrl
  };
}

function areDuplicateItems(left, right) {
  if (!left || !right) return false;

  const leftTitle = canonicalTitle(left.title);
  const rightTitle = canonicalTitle(right.title);
  if (!leftTitle || !rightTitle) return false;

  if (left.deadline && right.deadline && left.deadline !== right.deadline) return false;

  if (leftTitle === rightTitle) return true;
  if (leftTitle.length > 18 && rightTitle.length > 18 && (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle))) {
    return true;
  }

  return tokenSimilarity(left.title, right.title) >= 0.72;
}

function dedupeItems(items) {
  const deduped = [];

  for (const item of items.filter(Boolean)) {
    const index = deduped.findIndex((existing) => itemKey(existing) === itemKey(item) || areDuplicateItems(existing, item));

    if (index === -1) {
      deduped.push(item);
    } else {
      deduped[index] = mergeItems(deduped[index], item);
    }
  }

  return deduped;
}

function rcidFit(fields, score) {
  const list = fields.filter(Boolean);
  const confidence = score >= 48 ? "strong" : score >= 34 ? "likely" : "possible";

  if (!list.length) {
    return `Automatically surfaced as a ${confidence} RCID fit based on configured source and keyword signals.`;
  }

  return `Automatically surfaced as a ${confidence} RCID fit across ${list.join(", ")}.`;
}

function pageUrl(source, pageIndex) {
  const target = source.requestUrl || source.url;
  if (pageIndex === 0) return target;
  const url = new URL(target);
  url.searchParams.set("page", String(pageIndex));
  return url.href;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "RCID opportunity radar; educational CFP aggregation"
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseUpennCategory(html, source, url) {
  const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) || [];

  return articleMatches.map((article) => {
    const linkMatch = article.match(/<h2 class="node-title">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    const deadlineMatch = article.match(/deadline for submissions:[\s\S]*?<span class="date-display-single">([\s\S]*?)<\/span>/i);
    const contactMatch = article.match(/field-name-field-cfp-contact-name[\s\S]*?<div class="field-item even">([\s\S]*?)<\/div>/i);
    const bodyMatch = article.match(/field-name-field-cfp-content[\s\S]*?<div class="field-item even">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);

    if (!linkMatch || !deadlineMatch) return null;

    const rawText = stripHtml(article);
    if (!isRelevant(rawText)) return null;

    const title = cleanTitle(linkMatch[2]);
    const sourceUrl = new URL(linkMatch[1], url).href;
    const deadline = parseDate(deadlineMatch[1]);
    const excerpt = stripHtml(bodyMatch?.[1] || rawText).slice(0, 360);
    const inferredEventDate = inferEventDate(`${title} ${excerpt}`, deadline);
    const eventDate = inferredEventDate && inferredEventDate !== deadline ? inferredEventDate : "";
    const contact = stripHtml(contactMatch?.[1] || "");
    const fields = inferFields(`${title} ${contact} ${excerpt} ${source.name}`);
    const type = inferType(`${title} ${contact} ${excerpt}`, source.type);
    const score = relevanceScore(`${title} ${contact} ${excerpt} ${fields.join(" ")}`, source);

    return {
      title,
      source: "UPenn CFP",
      sourceName: source.name,
      sourceUrl,
      type,
      deadlineType: "Submission",
      deadline,
      eventDate,
      location: contact || source.name.replace("UPenn CFP: ", ""),
      status: daysUntil(deadline) < 0 ? "closed" : "open",
      priority: score >= 48 ? "high" : score >= 34 ? "medium" : "low",
      confidence: source.confidence,
      publishMode: source.publish,
      score,
      fields,
      excerpt,
      relevance: rcidFit(fields, score)
    };
  }).filter(Boolean);
}

function parseFilmFreewaySearch(html, source) {
  const text = stripHtml(html);
  const pattern = /([A-Z][A-Za-z0-9 .'&:-]{3,90}?) ([A-Z][A-Za-z ,.-]{3,80}?) (\d+ Years|[0-9]+ Years).*?(Next Deadline|Final Deadline): ([A-Za-z]+ \d{1,2}, \d{4}|Today)/g;
  const matches = [];
  let match;

  while ((match = pattern.exec(text)) && matches.length < 30) {
    const title = cleanTitle(match[1]);
    const deadline = match[5] === "Today" ? new Date().toISOString().slice(0, 10) : parseDate(match[5]);
    const excerpt = `${match[4]} listed as ${match[5]} in FilmFreeway festival search.`;
    const fields = inferFields(`${title} film documentary experimental media screenplay`);
    const score = relevanceScore(`${title} ${excerpt} ${fields.join(" ")}`, source);

    matches.push({
      title,
      source: "FilmFreeway",
      sourceName: source.name,
      sourceUrl: source.url,
      type: "Film Festival",
      deadlineType: match[4],
      deadline,
      eventDate: "",
      location: match[2].trim(),
      status: daysUntil(deadline) < 0 ? "closed" : "open",
      priority: score >= 48 ? "high" : "medium",
      confidence: source.confidence,
      publishMode: source.publish,
      score,
      fields,
      excerpt,
      relevance: rcidFit(fields, score)
    });
  }

  return matches;
}

function parseCFPListHome(html, source) {
  const entries = html.match(/<div class="listing-entry call-row"[\s\S]*?(?=<div class="listing-entry call-row"|<\/div><!-- \/.cfp-listings -->)/g) || [];
  const structuredItems = [];

  for (const entry of entries) {
    const daysMatch = entry.match(/<div class="date-tile tile-days">[\s\S]*?<span class="n">(-?\d+)<\/span>/i);
    const eventDateMatch = entry.match(/<div class="date-tile tile-event">[\s\S]*?<span class="m">([\s\S]*?)<\/span>[\s\S]*?<span class="d">([\s\S]*?)<\/span>/i);
    const linkMatch = entry.match(/<h4 class="listing-title">[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    const deadlineTypeMatch = entry.match(/<div class="date-tile tile-deadline">[\s\S]*?<span class="w">([\s\S]*?)<\/span>/i);
    const orgMatch = entry.match(/<p class="listing-org">([\s\S]*?)<\/p>/i);
    const descMatch = entry.match(/<p class="listing-desc">([\s\S]*?)<\/p>\s*<a class="listing-readmore"/i);
    if (!daysMatch || !linkMatch || !descMatch) continue;

    const days = Number(daysMatch[1]);
    const title = cleanTitle(linkMatch[2]);
    if (!title || /^cfp:?$/i.test(title)) continue;

    const excerpt = stripHtml(descMatch[1]).slice(0, 420);
    const location = orgMatch ? stripHtml(orgMatch[1]) : "CFPList";
    if (!isRelevant(`${title} ${excerpt} ${source.name}`)) continue;

    const fields = inferFields(`${title} ${excerpt} ${source.name}`);
    const type = inferType(`${title} ${excerpt} ${source.type}`, source.type);
    const score = relevanceScore(`${title} ${excerpt} ${location} ${fields.join(" ")}`, source);
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + days);
    const deadline = deadlineDate.toISOString().slice(0, 10);
    const eventDate = eventDateMatch ? parseMonthDayWithReference(`${eventDateMatch[1]} ${eventDateMatch[2]}`, deadline) : "";

    structuredItems.push({
      title,
      source: "CFPList",
      sourceName: source.name,
      sourceUrl: new URL(linkMatch[1], "https://www.cfplist.com").href,
      type,
      deadlineType: stripHtml(deadlineTypeMatch?.[1] || "Abstract"),
      deadline,
      eventDate,
      location,
      status: days < 0 ? "closed" : "open",
      priority: score >= 48 ? "high" : "medium",
      confidence: source.confidence,
      publishMode: source.publish,
      score,
      fields,
      excerpt,
      relevance: rcidFit(fields, score)
    });
  }

  if (structuredItems.length) return structuredItems;

  const text = stripHtml(html);
  const pattern = /EVENT ([A-Za-z]{3} \d{2}) ABSTRACT ([A-Za-z]{3} \d{2}) DAYS (-?\d+) LEFT (.*?)(?= EVENT [A-Za-z]{3} \d{2} ABSTRACT| Page \d|$)/g;
  const items = [];
  let match;

  while ((match = pattern.exec(text)) && items.length < 30) {
    const blob = match[4].trim();
    if (!isRelevant(blob)) continue;

    const title = cleanTitle(blob.split(" Read more ")[0]);
    const fields = inferFields(blob);
    const type = inferType(blob, source.type);
    const score = relevanceScore(`${title} ${blob} ${fields.join(" ")}`, source);
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + Number(match[3]));
    const deadline = deadlineDate.toISOString().slice(0, 10);

    items.push({
      title,
      source: "CFPList",
      sourceName: source.name,
      sourceUrl: source.url,
      type,
      deadlineType: "Abstract",
      deadline,
      eventDate: parseMonthDayWithReference(match[1], deadline),
      location: "CFPList",
      status: Number(match[3]) < 0 ? "closed" : "open",
      priority: score >= 48 ? "high" : "medium",
      confidence: source.confidence,
      publishMode: source.publish,
      score,
      fields,
      excerpt: blob.slice(0, 360),
      relevance: rcidFit(fields, score)
    });
  }

  return items;
}

function buildParsedItem({
  title,
  source,
  sourceName,
  sourceUrl,
  type,
  deadlineType = "Deadline",
  deadline = "",
  eventDate = "",
  location = "",
  excerpt,
  sourceConfig
}) {
  const fields = inferFields(`${title} ${excerpt} ${sourceName} ${type}`);
  const score = relevanceScore(`${title} ${excerpt} ${fields.join(" ")}`, sourceConfig);

  return {
    title: cleanTitle(title),
    source,
    sourceName,
    sourceUrl,
    type,
    deadlineType,
    deadline,
    eventDate,
    location,
    status: daysUntil(deadline) < 0 ? "closed" : "open",
    priority: score >= 48 ? "high" : score >= 34 ? "medium" : "low",
    confidence: sourceConfig.confidence,
    publishMode: sourceConfig.publish,
    score,
    fields,
    excerpt: stripHtml(excerpt).slice(0, 360),
    relevance: rcidFit(fields, score)
  };
}

function parseNehGrants(html, source, url) {
  const cards = html.match(/<article class="long-teaser">[\s\S]*?<\/article>/gi) || [];

  return cards.map((card) => {
    const linkMatch = card.match(/long-teaser__title[\s\S]*?<a href="([^"]+)">([\s\S]*?)<\/a>/i);
    const divisionMatch = card.match(/long-teaser__label[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const dateMatch = card.match(/long-teaser__date[\s\S]*?<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/i);
    if (!linkMatch || !dateMatch) return null;

    const title = cleanTitle(linkMatch[2]);
    const division = stripHtml(divisionMatch?.[1] || "National Endowment for the Humanities");
    const deadline = parseDate(dateMatch[1] || dateMatch[2]);
    const sourceUrl = new URL(linkMatch[1], url).href;
    const excerpt = `${title} is an NEH funding opportunity from ${division}. NEH lists this under upcoming application deadlines.`;

    return buildParsedItem({
      title,
      source: "NEH",
      sourceName: source.name,
      sourceUrl,
      type: "Grant / Fellowship",
      deadlineType: "Application",
      deadline,
      location: division,
      excerpt,
      sourceConfig: source
    });
  }).filter(Boolean);
}

function parseCcccConvention(html, source, url) {
  const text = stripHtml(html);
  const callMatch = html.match(/<a href="([^"]+)"[^>]*>\s*2027 CCCC Call for Proposals\s*<\/a>/i)
    || html.match(/<a href="([^"]+)"[^>]*>\s*CCCC 2027 Call for Proposals\s*<\/a>/i);
  const deadlineMatch = text.match(/Proposal submission deadline:\s*.*?([A-Za-z]+ \d{1,2}, \d{4})/i);
  if (!deadlineMatch) return [];

  const eventMatch = text.match(/(April \d{1,2}\W+\d{1,2}, \d{4})\s+([^\.]+?Wisconsin)/i);
  const themeMatch = text.match(/Theme:\s*([^#]+?)\s+2027 CCCC Call/i);
  const deadline = parseDate(deadlineMatch[1]);
  const sourceUrl = callMatch ? new URL(callMatch[1], url).href : url;
  const eventDate = eventMatch ? eventMatch[1].replace(/\W+/g, "-").replace(/-+/g, "-").replace(/-2027$/, ", 2027") : "April 14-17, 2027";
  const location = eventMatch ? eventMatch[2].trim() : "Milwaukee, Wisconsin";
  const theme = themeMatch ? themeMatch[1].trim() : "Design Writing Futures";

  return [buildParsedItem({
    title: "2027 CCCC Call for Proposals",
    source: "CCCC",
    sourceName: source.name,
    sourceUrl,
    type: "Conference CFP",
    deadlineType: "Proposal",
    deadline,
    eventDate,
    location,
    excerpt: `CCCC lists its 2027 Annual Convention call for proposals with the theme ${theme}.`,
    sourceConfig: source
  })];
}

function parseClirPrograms(html, source, url) {
  const programMatches = Array.from(html.matchAll(/<h3[^>]*>\s*([^<]+?)\s*<\/h3>\s*([\s\S]*?)(?=<h3|<\/section>|<footer)/gi));
  const keep = /digitizing hidden|recordings at risk|mellon fellowships|postdoctoral fellowship|digital library federation/i;

  return programMatches.map((match) => {
    const title = cleanTitle(match[1]);
    if (!keep.test(title)) return null;

    const body = match[2];
    const linkMatch = body.match(/<a href="([^"]+)"/i);
    const paragraphMatch = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const sourceUrl = linkMatch ? new URL(linkMatch[1], url).href : url;
    const excerpt = paragraphMatch ? stripHtml(paragraphMatch[1]) : `${title} is listed by CLIR as a program, grant, or fellowship.`;

    return buildParsedItem({
      title,
      source: "CLIR",
      sourceName: source.name,
      sourceUrl,
      type: /fellowship/i.test(title) ? "Grant / Fellowship" : "Grant / Fellowship",
      deadlineType: "Program",
      deadline: "",
      location: "Council on Library and Information Resources",
      excerpt,
      sourceConfig: source
    });
  }).filter(Boolean);
}

function parseAclsDeadlines(html, source, url) {
  if (/Just a moment|cf_chl|Enable JavaScript and cookies/i.test(html)) {
    return [];
  }

  const text = stripHtml(html);
  const section = text.split(/Past 2025-26 Fellowship & Grant Deadlines/i)[0] || text;
  const pattern = /([A-Z][A-Za-z0-9/().,'’&+\- ]{8,120})\s+(Fellowship|Grant|Prize|Internship|Letter of Inquiry)\s+([A-Za-z]+ \d{1,2}, \d{4})(?:,\s*\d{1,2}:\d{2}\s*[AP]M\s*[A-Z]+)?/g;
  const items = [];
  let match;

  while ((match = pattern.exec(section)) && items.length < 20) {
    const title = cleanTitle(match[1]);
    const type = /fellowship|grant/i.test(match[2]) ? "Grant / Fellowship" : "Funding";
    const deadline = parseDate(match[3]);

    items.push(buildParsedItem({
      title,
      source: "ACLS",
      sourceName: source.name,
      sourceUrl: url,
      type,
      deadlineType: match[2],
      deadline,
      location: "American Council of Learned Societies",
      excerpt: `${title} is listed by ACLS under upcoming fellowship and grant deadlines.`,
      sourceConfig: source
    }));
  }

  return items;
}

async function gatherSource(source) {
  if (source.parser === "officialWatch") {
    return [];
  }

  const pageLimit = Math.max(1, Number(source.pageLimit || 1));
  const gathered = [];

  for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
    const url = pageUrl(source, pageIndex);

    try {
      const html = await fetchText(url);

      if (source.parser === "upennCategory") gathered.push(...parseUpennCategory(html, source, url));
      if (source.parser === "filmfreewaySearch") gathered.push(...parseFilmFreewaySearch(html, source));
      if (source.parser === "cfplistHome") gathered.push(...parseCFPListHome(html, source));
      if (source.parser === "nehGrants") gathered.push(...parseNehGrants(html, source, url));
      if (source.parser === "ccccConvention") gathered.push(...parseCcccConvention(html, source, url));
      if (source.parser === "clirPrograms") gathered.push(...parseClirPrograms(html, source, url));
      if (source.parser === "aclsDeadlines") gathered.push(...parseAclsDeadlines(html, source, url));
    } catch (error) {
      console.warn(`Skipped ${source.name} page ${pageIndex + 1}: ${error.message}`);
    }
  }

  return gathered;
}

function sourceSummary(items) {
  const counts = new Map();

  for (const item of items) {
    counts.set(item.sourceName || item.source, (counts.get(item.sourceName || item.source) || 0) + 1);
  }

  return Array.from(counts, ([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}

function buildReviewHtml({ updated, generated, published }) {
  const cards = generated.map((item) => `
  <article class="candidate${item.publish ? " is-published" : ""}">
    <div class="meta">
      <span>${escapeHtml(item.sourceName || item.source)}</span>
      <span>${escapeHtml(item.type)}</span>
      <span>${escapeHtml(item.confidence)} confidence</span>
      <span>score ${escapeHtml(item.score)}</span>
      ${item.deadline ? `<time datetime="${escapeHtml(item.deadline)}">${escapeHtml(item.deadlineType)}: ${escapeHtml(item.deadline)}</time>` : `<span>${escapeHtml(item.deadlineType || "Date to verify")}</span>`}
    </div>
    <h2><a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.title)}</a></h2>
    <p>${escapeHtml(item.excerpt)}</p>
    <div class="fit">
      <strong>${item.publish ? "Published" : "Held back"}</strong>
      <span>${escapeHtml(item.relevance)}</span>
    </div>
    <div class="tags">${item.fields.map((field) => `<span>${escapeHtml(field)}</span>`).join("")}</div>
  </article>`).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Private Opportunity Candidates</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f6f1e8;
        --panel: #fffaf1;
        --ink: #17191d;
        --muted: #64686f;
        --line: #d8cec0;
        --purple: #522d80;
        --orange: #f66733;
        --green: #3d7a55;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      main {
        width: min(100% - 32px, 1080px);
        margin: 0 auto;
        padding: 42px 0;
      }
      header {
        margin-bottom: 24px;
        border-bottom: 1px solid var(--line);
        padding-bottom: 22px;
      }
      p { color: var(--muted); }
      h1, h2 { color: var(--purple); font-family: Georgia, "Times New Roman", serif; }
      h1 { margin: 0 0 10px; font-size: clamp(2.2rem, 6vw, 4.8rem); line-height: 0.95; }
      h2 { margin: 10px 0 10px; font-size: 1.45rem; line-height: 1.15; }
      a { color: inherit; }
      .candidate {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
        border: 1px solid rgba(82, 45, 128, 0.18);
        border-radius: 8px;
        background: rgba(255, 250, 241, 0.8);
        padding: 18px;
      }
      .candidate.is-published { border-color: rgba(61, 122, 85, 0.45); }
      .meta, .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .meta span, .meta time, .tags span {
        border: 1px solid rgba(82, 45, 128, 0.16);
        border-radius: 999px;
        padding: 5px 9px;
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 800;
      }
      .fit {
        border-left: 3px solid var(--orange);
        padding-left: 12px;
      }
      .is-published .fit { border-color: var(--green); }
      .fit strong {
        display: block;
        color: var(--purple);
        font-size: 0.82rem;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Private opportunity candidates</h1>
        <p>Generated ${escapeHtml(updated)} from configured sources. Published ${published.length} of ${generated.length} clean candidates to the public RCID feed.</p>
      </header>
      ${cards || "<p>No candidates found.</p>"}
    </main>
  </body>
</html>
`;
}

const sources = JSON.parse(await readFile(sourcesFile, "utf8")).items;
const previous = await readFile(publicFile, "utf8")
  .then((content) => JSON.parse(content))
  .catch(() => ({ items: [] }));
const updated = new Date().toISOString().slice(0, 10);
const rawItems = [];

for (const source of sources) {
  rawItems.push(...await gatherSource(source));
}

const generated = dedupeItems(rawItems)
  .filter(isCleanCandidate)
  .map((item) => ({ ...item, publish: shouldPublish(item) }))
  .sort((a, b) => {
    const days = daysUntil(a.deadline) - daysUntil(b.deadline);
    return days || b.score - a.score;
  });

const freshPublished = generated.filter((item) => item.publish);
const previousCarryover = (previous.items || [])
  .filter((item) => isCleanCandidate(item) && daysUntil(item.deadline) <= 365)
  .map((item) => ({
    ...item,
    score: item.score || 30,
    confidence: item.confidence || "manual",
    publishMode: item.publishMode || "carryover"
  }));

const publicItems = dedupeItems([...freshPublished, ...previousCarryover])
  .sort((a, b) => {
    const days = daysUntil(a.deadline) - daysUntil(b.deadline);
    return days || (b.score || 0) - (a.score || 0);
  })
  .slice(0, maxPublicItems)
  .map(({ publish, publishMode, sourceName, ...item }) => ({
    ...item,
    eventDate: item.source === "UPenn CFP" && item.eventDate === item.deadline ? "" : item.eventDate
  }));

const generatedData = {
  updated,
  summary: {
    kicker: "Generated Opportunities",
    title: "Candidate pool and automation audit.",
    text: "Generated candidate list with confidence, scoring, and publication decisions."
  },
  sourceSummary: sourceSummary(generated),
  items: generated
};

const publicData = {
  updated,
  summary: {
    kicker: "Curated Opportunities",
    title: "Calls, deadlines, funding, and field signals.",
    text: "An automatically refreshed board for RCID students tracking CFPs, conferences, publication calls, media opportunities, and useful field signals. The feed favors trusted source categories, clear deadlines, and strong RCID fit."
  },
  items: publicItems
};

await mkdir(reviewDir, { recursive: true });
await writeFile(generatedFile, `${JSON.stringify(generatedData, null, 2)}\n`);
await writeFile(publicFile, `${JSON.stringify(publicData, null, 2)}\n`);
await writeFile(reviewFile, buildReviewHtml({ updated, generated, published: publicItems }));

console.log(`Scanned ${sources.length} sources.`);
console.log(`Found ${generated.length} clean generated candidates.`);
console.log(`Published ${publicItems.length} public opportunities to ${publicFile}.`);
console.log(`Wrote private review page to ${reviewFile}.`);
