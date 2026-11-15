export * from "./narrative";
import { generateLinkedInPost } from "./narrative";
import type { Post, Tool } from "@/types";

/**
 * Builds the primary human-crafted social narrative for a post + its resolved tools.
 * Defaults to the high-converting LinkedIn carousel companion format.
 */
export function generateCaption(post: Post, tools: Tool[]): string {
  return generateLinkedInPost(post, tools, "story");
}
