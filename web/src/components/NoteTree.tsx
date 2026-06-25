import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NoteNode } from '../utils/tree';
import { isDescendant } from '../utils/tree';
import { useTreeDrag } from '../hooks/useTreeDrag';
import { fromNow } from '../utils/date';
import { ENCRYPTED, RECOMMEND } from '../types';
import './noteTree.css';

interface Props {
  nodes: NoteNode[];
  draggable?: boolean;
  defaultExpanded?: boolean;
  onTagClick?: (tag: string) => void;
  onMove?: (dragId: number, targetParentId: number) => void;
}

export default function NoteTree({
  nodes,
  draggable = false,
  defaultExpanded = false,
  onTagClick,
  onMove
}: Props) {
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
    defaultExpanded,
    dragId: state.dragId,
    overId: state.overId,
    onItemPointerDown,
    onTagClick,
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

      <ul className="note-tree" key={defaultExpanded ? 'expanded' : 'collapsed'}>
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
  defaultExpanded: boolean;
  dragId: number | null;
  overId: number | null;
  onItemPointerDown: (e: React.PointerEvent, id: number, title: string) => void;
  onTagClick?: (tag: string) => void;
  canDropOn: (dragId: number, targetId: number) => boolean;
  isDragging: () => boolean;
}

function TreeItem({ node, ctx }: { node: NoteNode; ctx: ItemCtx }) {
  const [expanded, setExpanded] = useState(ctx.defaultExpanded);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const tags = node.tag ? node.tag.split('|').filter(Boolean) : [];
  const isOver =
    ctx.dragId != null && ctx.overId === node.id && ctx.canDropOn(ctx.dragId, node.id);
  const isDragSource = ctx.dragId === node.id;

  const flag =
    node.recommend === ENCRYPTED ? 'enc' : node.recommend === RECOMMEND ? 'rec' : '';

  // 拖拽刚结束的瞬间不要触发导航
  const handleClick = () => {
    if (ctx.isDragging()) return;
    navigate(`/note/${node.id}`);
  };

  return (
    <li className="tree-item">
      <div
        data-note-id={node.id}
        className={`tree-row${flag ? ` tree-row-${flag}` : ''}${isOver ? ' tree-drop-active' : ''}${isDragSource ? ' tree-dragging' : ''}`}
        style={ctx.draggable ? { touchAction: 'pan-y' } : undefined}
        onPointerDown={(e) => ctx.draggable && ctx.onItemPointerDown(e, node.id, node.title)}
      >
        <button
          className={`tree-toggle${hasChildren ? '' : ' is-leaf'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
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
          {node.summary && <span className="tree-summary">{node.summary}</span>}
        </button>

        <div className="tree-meta">
          {tags.slice(0, 3).map((tag) => (
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
          <time className="tree-time">{fromNow(node.editTime ?? node.postTime)}</time>
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
