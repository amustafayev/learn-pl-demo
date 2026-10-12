/* The Library's folder trees (word sets, reading texts): flat lists of nodes
   with a `parentId` (null = top level), nested to any depth like a file
   system. Everything that walks one lives here, so views just ask. A node's
   display name is `title` for word sets and `name` for reading folders. */

export const kidsOf = (nodes, parentId = null) => nodes.filter((n) => (n.parentId ?? null) === parentId);

// Every node below `id` (not including it).
export function descendantsOf(nodes, id) {
  const out = [];
  const walk = (parent) => kidsOf(nodes, parent).forEach((n) => { out.push(n); walk(n.id); });
  walk(id);
  return out;
}

// Root → … → node.
export function pathOf(nodes, id) {
  const path = [];
  for (let n = nodes.find((x) => x.id === id); n; n = n.parentId ? nodes.find((x) => x.id === n.parentId) : null) path.unshift(n);
  return path;
}

export const pathLabel = (nodes, id, key = "title") => pathOf(nodes, id).map((n) => n[key]).join(" › ");

// A word-set node's own words plus every word below it, in tree order.
export function subtreeWords(nodes, id) {
  const self = nodes.find((n) => n.id === id);
  return [...(self?.words || []), ...descendantsOf(nodes, id).flatMap((n) => n.words || [])];
}

// New ids that can't collide with existing ones.
export const nodeId = (prefix) => prefix + Math.random().toString(36).slice(2, 8);
