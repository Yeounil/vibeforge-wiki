import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, Link } from "mdast";

const WIKI_LINK_RE = /(?<!\[)\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\](?!\])/g;

export const remarkWikiLink: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const value = node.value;
      const matches = Array.from(value.matchAll(WIKI_LINK_RE));
      if (matches.length === 0) return;

      const newChildren: (Text | Link)[] = [];
      let cursor = 0;

      for (const match of matches) {
        const matchStart = match.index ?? 0;
        const [full, target, display] = match;
        const matchEnd = matchStart + full.length;

        if (matchStart > cursor) {
          newChildren.push({
            type: "text",
            value: value.slice(cursor, matchStart),
          });
        }

        const linkText = (display ?? target).trim();
        const targetClean = target.trim();

        const link: Link = {
          type: "link",
          url: `#wiki-pending:${targetClean}`,
          title: null,
          children: [{ type: "text", value: linkText }],
          data: {
            hProperties: {
              "data-wiki-target": targetClean,
            },
          },
        };
        newChildren.push(link);
        cursor = matchEnd;
      }

      if (cursor < value.length) {
        newChildren.push({
          type: "text",
          value: value.slice(cursor),
        });
      }

      parent.children.splice(index, 1, ...newChildren);
      return [visit.SKIP, index + newChildren.length];
    });
  };
};
