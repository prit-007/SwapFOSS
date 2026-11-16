import { isDeepDive } from "./deep-cards";
import type { Post, Tool } from "@/types";

export type NarrativePlatform = "linkedin" | "twitter" | "reddit" | "instagram";
export type NarrativeAngle = "story" | "tech" | "quick";

export interface NarrativeOptions {
  platform?: NarrativePlatform;
  angle?: NarrativeAngle;
}

function formatReplacements(tools: Tool[]): string {
  const insteadOf = tools.map((t) => t.insteadOf).filter(Boolean);
  const unique = [...new Set(insteadOf.flatMap((s) => s.split(" / ")))];
  if (unique.length === 0) return "proprietary software";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

function formatTagLabel(tag: string): string {
  switch (tag) {
    case "install-and-use":
      return "Install & Use (Standalone)";
    case "self-hosted":
      return "Self-Hosted";
    case "plug-and-play":
      return "Plug & Play (Add-ons)";
    case "offline-first":
      return "Offline-First";
    case "e2e-encrypted":
      return "End-to-End Encrypted";
    case "local-first":
      return "Local-First";
    case "p2p":
      return "Peer-to-Peer";
    default:
      return tag;
  }
}

/** Builds an authentic, human-toned LinkedIn carousel companion post. */
export function generateLinkedInPost(
  post: Post,
  tools: Tool[],
  angle: NarrativeAngle = "story",
): string {
  const replacements = formatReplacements(tools);

  // Single app deep-dive
  if (isDeepDive(post) && tools.length === 1) {
    const t = tools[0];
    const points = t.benefits?.length ? t.benefits : t.bullets ?? [];
    return [
      post.intro.headline,
      "",
      `Most people rely on ${t.insteadOf} out of habit — until the subscription creeps up or privacy terms change.`,
      "",
      `Here is why ${t.name} is worth switching to:`,
      `→ What it is: ${t.hook}`,
      ...points.slice(0, 4).map((p) => `→ ${p}`),
      "",
      `Setup reality: ${t.difficulty.toUpperCase()} — ${t.setup}.`,
      "",
      "The real benefit of running open-source software is permanence: no deleted features, no surprise paywalls, and complete control over your own workflow.",
      "",
      "Swipe through the slides above for UI previews and feature breakdowns.",
      "",
      `Have you tried ${t.name} or do you run something else for this? Let's discuss in the comments.`,
      "",
      "#OpenSource #SelfHosted #Privacy #TechTools #FOSS",
    ].join("\n");
  }

  // Multi-tool posts
  if (angle === "tech") {
    return [
      post.intro.headline,
      "",
      `Software architecture matters. When an application is local-first or self-hosted, your data lives on your disk — not in an ad network's data lake.`,
      "",
      `Here is an engineering overview of ${tools.length} open-source tools replacing ${replacements}:`,
      "",
      ...tools.map((t, idx) => {
        const tags = t.tags?.map(formatTagLabel).join(", ") || "Open Source";
        return [
          `${idx + 1}. ${t.name} (Swaps ${t.insteadOf})`,
          `   • Architecture: ${tags}`,
          `   • Core function: ${t.hook}`,
          `   • Setup: ${t.difficulty.toUpperCase()} (${t.setup})`,
          `   • Source: ${t.repo}`,
          "",
        ].join("\n");
      }),
      "No vendor lock-in, standard export formats, and zero background analytics telemetry.",
      "",
      "Swipe through the slides above for UI screenshots and setup workflows.",
      "",
      "What does your current self-hosted or local-first stack look like?",
      "",
      "#SoftwareEngineering #DevTools #SelfHosted #OpenSource #DataOwnership",
    ].join("\n");
  }

  if (angle === "quick") {
    return [
      `Big Tech Swaps Cheat Sheet: ${post.intro.headline}`,
      "",
      `${tools.length} lightweight open-source alternatives to ${replacements} you can start using today:`,
      "",
      ...tools.map((t, idx) => [
        `${idx + 1}. ${t.name}`,
        `   Replaces: ${t.insteadOf}`,
        `   Why switch: ${t.hook}`,
        `   Difficulty: ${t.difficulty.toUpperCase()} | ${t.setup}`,
        "",
      ].join("\n")),
      "Download once, own forever. No monthly bills, no tracking cookies.",
      "",
      "Swipe through for interface previews of each tool.",
      "",
      "Which one of these are you trying first?",
      "",
      "#FOSS #Productivity #Privacy #OpenSource #TechTips",
    ].join("\n");
  }

  // Default: angle === 'story'
  return [
    post.intro.headline,
    "",
    `Every six months, another service hikes its monthly price, adds unskippable ads, or updates its terms of service to scrape user data.`,
    "",
    `In reality, swapping just ${tools.length} core tools can replace ${replacements} without sacrificing daily convenience:`,
    "",
    ...tools.map((t, idx) => {
      const bullet = t.bullets?.[0] || t.hook;
      return [
        `${idx + 1}. ${t.name} (Replaces ${t.insteadOf})`,
        `→ ${t.hook}`,
        `→ Highlight: ${bullet}`,
        `→ Setup: ${t.setup}`,
        "",
      ].join("\n");
    }),
    "The biggest surprise when moving to open-source: performance is noticeably snappier without background tracking calls and telemetry SDKs.",
    "",
    "Swipe through the carousel above for previews and feature breakdowns.",
    "",
    "What's the one proprietary app you haven't been able to find a good FOSS replacement for yet?",
    "",
    "#OpenSource #SelfHosted #Privacy #TechTools #FOSS #DigitalFreedom",
  ].join("\n");
}

/** Builds a numbered X / Twitter thread format ready to post with slides. */
export function generateTwitterThread(post: Post, tools: Tool[]): string {
  const replacements = formatReplacements(tools);
  const total = tools.length + 2;

  const tweets: string[] = [];

  // Tweet 1: Hook
  tweets.push(
    [
      `1/${total}`,
      post.intro.headline,
      "",
      `Here are ${tools.length} open-source tools replacing ${replacements} this year 🧵👇`,
      "",
      "(Swipe through the slides attached for UI previews)",
    ].join("\n"),
  );

  // Tweets 2..N: Per tool
  tools.forEach((t, idx) => {
    const tweetNum = idx + 2;
    tweets.push(
      [
        `${tweetNum}/${total}`,
        `${t.name} (replaces ${t.insteadOf})`,
        "",
        `• ${t.hook}`,
        `• Setup: ${t.setup} (${t.difficulty})`,
        `• Code: ${t.repo}`,
      ].join("\n"),
    );
  });

  // Final Tweet
  tweets.push(
    [
      `${total}/${total}`,
      post.outro.headline,
      "",
      post.outro.subhead,
      "",
      "Bookmark this thread 🔖 to reference when setting up your next device.",
      "",
      "#FOSS #OpenSource #SelfHosted",
    ].join("\n"),
  );

  return tweets.join("\n\n---\n\n");
}

/** Builds technical, zero-BS Markdown tailored for Reddit (r/selfhosted, r/privacy, r/opensource). */
export function generateRedditMarkdown(post: Post, tools: Tool[]): string {
  const replacements = formatReplacements(tools);

  return [
    `# ${post.title}`,
    "",
    `**TL;DR**: ${post.intro.headline} — ${post.intro.subhead}`,
    "",
    `A quick practical overview of open-source alternatives replacing **${replacements}**:`,
    "",
    ...tools.map((t, idx) => {
      const tags = t.tags?.map(formatTagLabel).join(", ") || "FOSS";
      const bullets = (t.bullets || []).map((b) => `  - ${b}`).join("\n");
      return [
        `### ${idx + 1}. [${t.name}](${t.link}) (replaces ${t.insteadOf})`,
        `- **Category**: ${t.category}`,
        `- **Deployment**: ${tags}`,
        `- **Overview**: ${t.hook}`,
        bullets ? `- **Highlights**:\n${bullets}` : "",
        `- **Setup & Difficulty**: ${t.difficulty.toUpperCase()} — ${t.setup}`,
        `- **Repository**: [${t.repo}](${t.repo})`,
        "",
      ].filter(Boolean).join("\n");
    }),
    "## Practical Takeaway",
    post.outro.subhead,
    "",
    "Are you using any of these in your homelab or daily mobile stack? What's your experience been with stability and migration?",
  ].join("\n");
}

/** Builds mobile-first Instagram / Threads carousel caption. */
export function generateInstagramCaption(post: Post, tools: Tool[]): string {
  const replacements = formatReplacements(tools);

  return [
    post.intro.headline,
    "",
    `Swipe left for the visual breakdown 👉`,
    "",
    `${tools.length} open-source swaps for ${replacements}:`,
    "",
    ...tools.map((t) => `• ${t.name} (swaps ${t.insteadOf}) — ${t.hook}`),
    "",
    post.outro.subhead,
    "",
    "Save this post for your next device setup 💾",
    "",
    "#opensource #selfhosted #privacy #foss #techtips #productivity #degoogle",
  ].join("\n");
}

/** Master narrative generator supporting all platforms and angles. */
export function generateNarrative(
  post: Post,
  tools: Tool[],
  options: NarrativeOptions = {},
): string {
  const platform = options.platform || "linkedin";
  switch (platform) {
    case "twitter":
      return generateTwitterThread(post, tools);
    case "reddit":
      return generateRedditMarkdown(post, tools);
    case "instagram":
      return generateInstagramCaption(post, tools);
    case "linkedin":
    default:
      return generateLinkedInPost(post, tools, options.angle || "story");
  }
}

/** Generates all narrative texts for packaging inside export ZIPs or documentation. */
export function generateAllNarratives(post: Post, tools: Tool[]): Record<string, string> {
  return {
    "linkedin-story.txt": generateLinkedInPost(post, tools, "story"),
    "linkedin-tech.txt": generateLinkedInPost(post, tools, "tech"),
    "linkedin-quick.txt": generateLinkedInPost(post, tools, "quick"),
    "twitter-thread.txt": generateTwitterThread(post, tools),
    "reddit.md": generateRedditMarkdown(post, tools),
    "instagram.txt": generateInstagramCaption(post, tools),
  };
}
