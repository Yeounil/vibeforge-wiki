import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root as HastRoot, Element } from "hast";
import { remarkWikiLink } from "./wiki-link";

interface ResolveOptions {
  aliasMap: Map<string, string>;
}

const rehypeResolveWikiLinks: Plugin<[ResolveOptions], HastRoot> = (options) => {
  const { aliasMap } = options;
  return (tree) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") return;
      const target = node.properties?.["data-wiki-target"] ?? node.properties?.["dataWikiTarget"];
      if (typeof target !== "string") return;
      const resolved = aliasMap.get(target.toLowerCase());
      if (resolved) {
        node.properties!.href = `/wiki/${resolved}`;
      } else {
        node.properties!.href = "#broken";
        node.properties!.dataBroken = "true";
      }
    });
  };
};

export async function renderBody(
  body: string,
  aliasMap: Map<string, string>
): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLink)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeResolveWikiLinks, { aliasMap })
    .use(rehypeStringify)
    .process(body);
  return String(file);
}
