import type { Post, Tool } from "@/types";

/** Builds the suggested social caption for a post + its resolved tools. */
export function generateCaption(post: Post, tools: Tool[]): string {
  const toolNames = tools.map((t) => t.name);
  const insteadOf = tools.map((t) => t.insteadOf).filter(Boolean);
  const uniqueInsteadOf = [...new Set(insteadOf.flatMap((s) => s.split(" / ")))];
  const replacements =
    uniqueInsteadOf.length <= 2
      ? uniqueInsteadOf.join(" and ")
      : uniqueInsteadOf.slice(0, -1).join(", ") + ", and " + uniqueInsteadOf[uniqueInsteadOf.length - 1];
  return `${post.intro.headline}\n\n${toolNames.length} tools that replace ${replacements}.\n${tools
    .map((t) => `\n• ${t.name} — ${t.hook}`)
    .join("")}\n\nAll free. All open-source. No subscriptions. No tracking.`;
}
