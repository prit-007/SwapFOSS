import type { IconName } from "@/icons";

export interface TagDefinition {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  color: string;
}

export const PRIMARY_TAGS: TagDefinition[] = [
  {
    id: "install-and-use",
    label: "Install & Use",
    description: "Standalone apps for desktop, mobile, or web with zero server setup required",
    icon: "download-01",
    color: "#4EA8DE",
  },
  {
    id: "plug-and-play",
    label: "Plug & Play",
    description: "Apps featuring rich plugin, add-on, extension, or modular integration systems",
    icon: "plug-01",
    color: "#FFC857",
  },
  {
    id: "self-hosted",
    label: "Self-Hosted",
    description: "Services, Docker containers, and servers you deploy on your own hardware",
    icon: "server-01",
    color: "#F472B6",
  },
];

export const PRIMARY_TAG_MAP: Record<string, TagDefinition> = Object.fromEntries(
  PRIMARY_TAGS.map((t) => [t.id, t]),
);

export function getTagMeta(id: string): TagDefinition | undefined {
  return PRIMARY_TAG_MAP[id];
}
