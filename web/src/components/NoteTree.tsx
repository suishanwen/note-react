import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NoteNode } from '../utils/tree';
import { isDescendant } from '../utils/tree';
import { fromNow } from '../utils/date';
import { ENCRYPTED, RECOMMEND } from '../types';
import './noteTree.css';

interface Props {
  nodes: NoteNode[];
  draggable?: boolean;
  // 默认是否展开子级；搜索/筛选时传 true 以显示命中的子节点
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
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [overRoot, setOverRoot] = useState(false);

  const findNode = (list: NoteNode[], id: number): NoteNode | null => {
    for (const n of list) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };
  const dragNode = dragId != null ? findNode(nodes, dragId) : null;

  // 合法放置点：非自身、非自己的子孙、非当前父级
  const canDropOn = (targetId: number) =>
    dragNode != null &&
    dragId !== targetId &&
    !isDescendant(dragNode, targetId) &&
    dragNode.parent !== targetId;

  const reset = () => {
    setDragId(null);
    setOverId(null);
    setOverRoot(false);
  };

  const handleDropOn = (targetId: number) => {
    if (dragId != null && canDropOn(targetId)) onMove?.(dragId, targetId);
    reset();
  };

  const handleDropRoot = () => {
    if (dragId != null && dragNode && dragNode.parent !== -1) onMove?.(dragId, -1);
    reset();
  };

  const ctx: ItemCtx = {
    draggable,
    defaultExpanded,
    dragId,
    overId,
    setDragId,
    setOverId,
    onTagClick,
    canDropOn,
    handleDropOn
  };

  return (
    <div className="note-tree-wrap">
      {draggable && dragId != null && (
        <div
          className={`tree-root-drop ${overRoot ? 'tree-drop-active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOverRoot(true);
          }}
          onDragLeave={() => setOverRoot(false)}
          onDrop={handleDropRoot}
        >
          放到这里 · 设为顶级笔记
        </div>
      )}
      <ul className="note-tree" key={defaultExpanded ? 'expanded' : 'collapsed'}>
        {nodes.map((node) => (
          <TreeItem key={node.id} node={node} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
}

interface ItemCtx {
  draggable: boolean;
  defaultExpanded: boolean;
  dragId: number | null;
  overId: number | null;
  setDragId: (id: number | null) => void;
  setOverId: (id: number | null) => void;
  onTagClick?: (tag: string) => void;
  canDropOn: (id: number) => boolean;
  handleDropOn: (id: number) => void;
}

function TreeItem({ node, ctx }: { node: NoteNode; ctx: ItemCtx }) {
  const [expanded, setExpanded] = useState(ctx.defaultExpanded);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const tags = node.tag ? node.tag.split('|').filter(Boolean) : [];
  const isOver = ctx.overId === node.id && ctx.canDropOn(node.id);
  const isDragging = ctx.dragId === node.id;

  const flag =
    node.recommend === ENCRYPTED ? 'enc' : node.recommend === RECOMMEND ? 'rec' : '';

  return (
    <li className="tree-item">
      <div
        className={`tree-row${flag ? ` tree-row-${flag}` : ''}${isOver ? ' tree-drop-active' : ''}${isDragging ? ' tree-dragging' : ''}`}
        draggable={ctx.draggable}
        onDragStart={(e) => {
          e.stopPropagation();
          // 必须 setData，否则 Firefox 等浏览器不启动拖拽
          e.dataTransfer.setData('text/plain', String(node.id));
          e.dataTransfer.effectAllowed = 'move';
          ctx.setDragId(node.id);
        }}
        onDragEnd={() => ctx.setDragId(null)}
        onDragOver={(e) => {
          if (ctx.dragId == null) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = ctx.canDropOn(node.id) ? 'move' : 'none';
          ctx.setOverId(node.id);
        }}
        onDragLeave={() => ctx.setOverId(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.handleDropOn(node.id);
        }}
      >
        <button
          className={`tree-toggle${hasChildren ? '' : ' is-leaf'}`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
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

        <button className="tree-main" onClick={() => navigate(`/note/${node.id}`)}>
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
