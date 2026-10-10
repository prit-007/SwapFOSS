import { loadJSON, resolveDataPath } from "./api";
import {
  categoriesSchema,
  postManifestSchema,
  postSchema,
  toolManifestSchema,
  toolSchema,
} from "./validation";
import type { Categories, Post, Tool } from "@/types";

export async function loadCategories(): Promise<Categories> {
  return categoriesSchema.parse(await loadJSON("data/categories.json"));
}

export async function loadTools(): Promise<Tool[]> {
  const manifest = toolManifestSchema.parse(await loadJSON("data/manifest.json"));
  const tools = await Promise.all(
    manifest.tools.map((id) => loadJSON(`data/tools/${id}.json`)),
  );
  return tools.map((tool) => resolveToolAssets(toolSchema.parse(tool)));
}

export async function loadTool(id: string): Promise<Tool> {
  return resolveToolAssets(toolSchema.parse(await loadJSON(`data/tools/${id}.json`)));
}

export async function loadPosts(): Promise<Post[]> {
  const manifest = postManifestSchema.parse(await loadJSON("data/posts-manifest.json"));
  const posts = await Promise.all(
    manifest.posts.map((id) => loadJSON(`data/posts/${id}.json`)),
  );
  return posts.map((post) => postSchema.parse(post));
}

export async function loadPost(id: string): Promise<Post> {
  return postSchema.parse(await loadJSON(`data/posts/${id}.json`));
}

/**
 * Anchor logo/screenshot URLs to the deploy base. Asset paths in the JSON are
 * root-relative ("assets/..."), which would otherwise resolve against the
 * current history-mode route instead of the site root.
 */
function resolveToolAssets(tool: Tool): Tool {
  return {
    ...tool,
    logo: tool.logo ? resolveDataPath(tool.logo) : tool.logo,
    screenshot: tool.screenshot ? resolveDataPath(tool.screenshot) : tool.screenshot,
  };
}
