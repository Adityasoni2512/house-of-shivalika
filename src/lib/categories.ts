import type { Database } from "@/lib/supabase/types.generated";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CategoryNode = CategoryRow & {
  children: CategoryNode[];
  depth: number;
  /** Ancestors then self, root first. Used to build /shop/a/b/c URLs. */
  path: string[];
};

/**
 * Builds the category tree from a flat list.
 *
 * Rows whose parent is missing (inactive or filtered out) are attached at the
 * root rather than dropped — silently losing a category from the nav is far
 * worse than showing it one level too high.
 */
export function buildCategoryTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();

  for (const row of rows) {
    byId.set(row.id, { ...row, children: [], depth: 0, path: [] });
  }

  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortByPosition = (a: CategoryNode, b: CategoryNode) =>
    a.position - b.position || a.name.localeCompare(b.name);

  const assign = (nodes: CategoryNode[], depth: number, path: string[]) => {
    nodes.sort(sortByPosition);
    for (const node of nodes) {
      node.depth = depth;
      node.path = [...path, node.slug];
      assign(node.children, depth + 1, node.path);
    }
  };

  assign(roots, 0, []);
  return roots;
}

/** Depth-first flatten, so a tree can be rendered in a table. */
export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** All descendant ids of a category, for "show everything under this branch". */
export function descendantIds(node: CategoryNode): string[] {
  const out: string[] = [];
  const walk = (n: CategoryNode) => {
    for (const child of n.children) {
      out.push(child.id);
      walk(child);
    }
  };
  walk(node);
  return out;
}

/** Find a node by its full slug path, e.g. ["kurtas", "cotton"]. */
export function findByPath(
  nodes: CategoryNode[],
  segments: string[],
): CategoryNode | null {
  if (segments.length === 0) return null;

  let list = nodes;
  let found: CategoryNode | null = null;

  for (const segment of segments) {
    found = list.find((n) => n.slug === segment) ?? null;
    if (!found) return null;
    list = found.children;
  }

  return found;
}

/** "Kurtas / Cotton" breadcrumb label. */
export function categoryTrail(node: CategoryNode, all: CategoryNode[]): CategoryNode[] {
  const flat = flattenTree(all);
  const byId = new Map(flat.map((n) => [n.id, n]));

  const trail: CategoryNode[] = [];
  let cursor: CategoryNode | undefined = node;

  while (cursor) {
    trail.unshift(cursor);
    cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
  }

  return trail;
}
