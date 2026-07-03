import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NoteNode } from '../utils/tree';
import { isDescendant } from '../utils/tree';
import { useTreeDrag } from '../hooks/useTreeDrag';
import { ENCRYPTED, RECOMMEND } from '../types';
import './noteTree.css';

interface Props {
  nodes: NoteNode[];
  draggable?: boolean;
  // 过滤中：无视持久化状态全部展开，以展示命中的子节点
  expandAll?: boolean;
  // 当前正在阅读的笔记 id：高亮并自动展开其祖先链
  activeId?: number | null;
  // 展开状态持久化 key；不传则不持久化
  storageKey?: string;
  onTagClick?: (tag: string) => void;
  onMove?: (dragId: number, targetParentId: number) => void;
  // 点击笔记后的附加回调（如移动端关闭抽屉）
  onNavigate?: () => void;
}

function loadExpanded(key: string | undefined): Set<number> {
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    // 忽略损坏的持久化数据
  }
  return new Set();
}

// 收集 activeId 的祖先链 id
function ancestorsOf(nodes: NoteNode[], targetId: number, trail: number[] = []): number[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return trail;
    const found = ancestorsOf(n.children, targetId, [...trail, n.id]);
    if (found) return found;
  }
  return null;
}

export default function NoteTree({
  nodes,
  draggable = false,
  expandAll = false,
  activeId = null,
  storageKey,
  onTagClick,
  onMove,
  onNavigate
}: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(() => loadExpanded(storageKey));

  // 阅读中的笔记：自动展开其祖先链，保证在树中可见
  useEffect(() => {
    if (activeId == null) return;
    const chain = ancestorsOf(nodes, activeId);
    if (!chain || chain.length === 0) return;
    setExpanded((prev) => {
      if (chain.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...chain]);
    });
  }, [activeId, nodes]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...expanded]));
  }, [expanded, storageKey]);

  const onToggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const findNode = (list: NoteNode[], id: number): NoteNode | null => {
    for (const n of list) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };

  const canDropOn = (dragId: number, targetId: number) => {
    const dragNode = findNode(nodes, dragId);
    return (
      dragNode != null &&
      dragId !== targetId &&
      !isDescendant(dragNode, targetId) &&
      dragNode.parent !== targetId
    );
  };

  const { state, onItemPointerDown, isDragging } = useTreeDrag({
    enabled: draggable,
    canDropOn,
    onDropOn: (dragId, targetId) => onMove?.(dragId, targetId),
    onDropRoot: (dragId) => {
      const dragNode = findNode(nodes, dragId);
      if (dragNode && dragNode.parent !== -1) onMove?.(dragId, -1);
    }
  });

  const ctx: ItemCtx = {
    draggable,
    expandAll,
    expanded,
    onToggle,
    activeId,
    dragId: state.dragId,
    overId: state.overId,
    onItemPointerDown,
    onTagClick,
    onNavigate,
    canDropOn,
    isDragging
  };

  return (
    <div className="note-tree-wrap">
      {draggable && state.dragId != null && (
        <div
          data-drop-root
          className={`tree-root-drop ${state.overRoot ? 'tree-drop-active' : ''}`}
        >
          {state.overRoot ? '松手 · 移到顶层' : '拖到这里 · 移出为顶层笔记'}
        </div>
      )}

      <ul className="note-tree" role="tree">
        {nodes.map((node) => (
          <TreeItem key={node.id} node={node} ctx={ctx} />
        ))}
      </ul>

      {/* 拖拽浮层：跟随指针 */}
      {state.ghost && (
        <div
          className="tree-ghost"
          style={{ left: state.ghost.x + 12, top: state.ghost.y + 12 }}
        >
          {state.ghost.title}
        </div>
      )}
    </div>
  );
}

interface ItemCtx {
  draggable: boolean;
  expandAll: boolean;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  activeId: number | null;
  dragId: number | null;
  overId: number | null;
  onItemPointerDown: (e: React.PointerEvent, id: number, title: string) => void;
  onTagClick?: (tag: string) => void;
  onNavigate?: () => void;
  canDropOn: (dragId: number, targetId: number) => boolean;
  isDragging: () => boolean;
}

function TreeItem({ node, ctx }: { node: NoteNode; ctx: ItemCtx }) {
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const expanded = ctx.expandAll || ctx.expanded.has(node.id);
  const tags = node.tag ? node.tag.split('|').filter(Boolean) : [];
  const isOver =
    ctx.dragId != null && ctx.overId === node.id && ctx.canDropOn(ctx.dragId, node.id);
  const isDragSource = ctx.dragId === node.id;
  const isActive = ctx.activeId === node.id;

  const flag =
    node.recommend === ENCRYPTED ? 'enc' : node.recommend === RECOMMEND ? 'rec' : '';

  // 拖拽刚结束的瞬间不要触发导航
  const handleClick = () => {
    if (ctx.isDragging()) return;
    navigate(`/note/${node.id}`);
    ctx.onNavigate?.();
  };

  return (
    <li className="tree-item">
      <div
        data-note-id={node.id}
        className={`tree-row${flag ? ` tree-row-${flag}` : ''}${isOver ? ' tree-drop-active' : ''}${isDragSource ? ' tree-dragging' : ''}${isActive ? ' tree-row-active' : ''}`}
        style={ctx.draggable ? { touchAction: 'pan-y' } : undefined}
        onPointerDown={(e) => ctx.draggable && ctx.onItemPointerDown(e, node.id, node.title)}
      >
        <button
          className={`tree-toggle${hasChildren ? '' : ' is-leaf'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) ctx.onToggle(node.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={hasChildren ? (expanded ? '折叠' : '展开') : undefined}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren ? (
            <svg viewBox="0 0 16 16" className={`tree-caret${expanded ? ' open' : ''}`} aria-hidden="true">
              <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="tree-dot" aria-hidden="true" />
          )}
        </button>

        <button className="tree-main" onClick={handleClick}>
          {flag === 'enc' && <span className="tree-flag" title="加密笔记">🔒</span>}
          {flag === 'rec' && <span className="tree-flag" title="推荐笔记">★</span>}
          <span className="tree-title">{node.title}</span>
          {hasChildren && <span className="tree-count">{node.children.length}</span>}
        </button>

        <div className="tree-meta">
          {tags.slice(0, 2).map((tag) => (
            <button
              key={tag}
              className="tag clickable"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                ctx.onTagClick?.(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="note-tree tree-children">
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}
