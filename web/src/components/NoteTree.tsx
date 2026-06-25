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
  onTagClick?: (tag: string) => void;
  onMove?: (dragId: number, targetParentId: number) => void;
}

export default function NoteTree({ nodes, draggable = false, onTagClick, onMove }: Props) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [overRoot, setOverRoot] = useState(false);

  // 当前被拖节点（用于防环判断）
  const findNode = (list: NoteNode[], id: number): NoteNode | null => {
    for (const n of list) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  };
  const dragNode = dragId != null ? findNode(nodes, dragId) : null;

  // 目标是否为合法放置点：非自身、非自己的子孙
  const canDropOn = (targetId: number) =>
    dragNode != null &&
    dragId !== targetId &&
    !isDescendant(dragNode, targetId) &&
    dragNode.parent !== targetId;

  const handleDropOn = (targetId: number) => {
    if (dragId != null && canDropOn(targetId)) onMove?.(dragId, targetId);
    reset();
  };

  const handleDropRoot = () => {
    if (dragId != null && dragNode && dragNode.parent !== -1) onMove?.(dragId, -1);
    reset();
  };

  const reset = () => {
    setDragId(null);
    setOverId(null);
    setOverRoot(false);
  };

  const ctx = {
    draggable,
    dragId,
    overId,
    setDragId,
    setOverId,
    onTagClick,
    canDropOn,
    handleDropOn
  };

  return (
    <div>
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
          拖到此处设为顶级笔记
        </div>
      )}
      <ul className="note-tree">
        {nodes.map((node) => (
          <TreeItem key={node.id} node={node} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
}

interface ItemCtx {
  draggable: boolean;
  dragId: number | null;
  overId: number | null;
  setDragId: (id: number | null) => void;
  setOverId: (id: number | null) => void;
  onTagClick?: (tag: string) => void;
  canDropOn: (id: number) => boolean;
  handleDropOn: (id: number) => void;
}

function TreeItem({ node, ctx }: { node: NoteNode; ctx: ItemCtx }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const tags = node.tag ? node.tag.split('|').filter(Boolean) : [];
  const isOver = ctx.overId === node.id && ctx.canDropOn(node.id);

  return (
    <li className="tree-item">
      <div
        className={`tree-row ${isOver ? 'tree-drop-active' : ''} ${ctx.dragId === node.id ? 'tree-dragging' : ''}`}
        draggable={ctx.draggable}
        onDragStart={(e) => {
          e.stopPropagation();
          ctx.setDragId(node.id);
        }}
        onDragEnd={() => ctx.setDragId(null)}
        onDragOver={(e) => {
          if (ctx.dragId == null) return;
          e.preventDefault();
          e.stopPropagation();
          ctx.setOverId(node.id);
        }}
        onDragLeave={() => ctx.setOverId(null)}
        onDrop={(e) => {
          e.stopPropagation();
          ctx.handleDropOn(node.id);
        }}
      >
        <button
          className={`tree-toggle ${hasChildren ? '' : 'tree-toggle-empty'}`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          aria-label={expanded ? '折叠' : '展开'}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : '·'}
        </button>

        <div className="tree-main" onClick={() => navigate(`/note/${node.id}`)}>
          <span className="tree-title">
            {node.recommend === ENCRYPTED && <span className="tree-icon" title="加密">🔒</span>}
            {node.recommend === RECOMMEND && <span className="tree-icon" title="推荐">⭐</span>}
            <span className="tree-title-text">{node.title}</span>
          </span>
          {node.summary && <span className="tree-summary">{node.summary}</span>}
        </div>

        <div className="tree-meta">
          {tags.map((tag) => (
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
          <span className="tree-time">{fromNow(node.postTime)}</span>
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
