import type { NoteSummary } from '../types';

export interface NoteNode extends NoteSummary {
  children: NoteNode[];
  depth: number;
}

// 把平铺笔记按 parent 组装成树；parent 为 -1/null 或指向不存在的节点视为顶级
export function buildTree(notes: NoteSummary[]): NoteNode[] {
  const map = new Map<number, NoteNode>();
  notes.forEach((n) => map.set(n.id, { ...n, children: [], depth: 0 }));

  const roots: NoteNode[] = [];
  for (const node of map.values()) {
    const parent = node.parent != null && node.parent !== -1 ? map.get(node.parent) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 递归设置深度，保持后端已排好的顺序（recommend DESC, post_time DESC）
  const setDepth = (nodes: NoteNode[], depth: number) => {
    for (const n of nodes) {
      n.depth = depth;
      setDepth(n.children, depth + 1);
    }
  };
  setDepth(roots, 0);
  return roots;
}

// 按深度优先顺序把树压平为列表，保留 depth（用于下拉缩进展示父级选择）
export function flattenTree(nodes: NoteNode[]): NoteNode[] {
  const result: NoteNode[] = [];
  const walk = (list: NoteNode[]) => {
    for (const n of list) {
      result.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return result;
}

// 判断 maybeDescendantId 是否在 node 的子孙中（拖拽防环用）
export function isDescendant(node: NoteNode, maybeDescendantId: number): boolean {
  for (const child of node.children) {
    if (child.id === maybeDescendantId || isDescendant(child, maybeDescendantId)) {
      return true;
    }
  }
  return false;
}

// 过滤树：保留命中节点及其祖先链；命中的判定由 predicate 决定
export function filterTree(nodes: NoteNode[], predicate: (n: NoteNode) => boolean): NoteNode[] {
  const result: NoteNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, predicate);
    if (predicate(node) || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}
