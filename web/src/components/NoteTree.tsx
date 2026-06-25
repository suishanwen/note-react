import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NoteNode } from '../utils/tree';
import { fromNow } from '../utils/date';
import { ENCRYPTED, RECOMMEND } from '../types';
import './noteTree.css';

interface Props {
  nodes: NoteNode[];
  onTagClick?: (tag: string) => void;
}

export default function NoteTree({ nodes, onTagClick }: Props) {
  return (
    <ul className="note-tree">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} onTagClick={onTagClick} />
      ))}
    </ul>
  );
}

function TreeItem({ node, onTagClick }: { node: NoteNode; onTagClick?: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const tags = node.tag ? node.tag.split('|').filter(Boolean) : [];

  return (
    <li className="tree-item">
      <div className="tree-row">
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
            {node.title}
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
                onTagClick?.(tag);
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
            <TreeItem key={child.id} node={child} onTagClick={onTagClick} />
          ))}
        </ul>
      )}
    </li>
  );
}
