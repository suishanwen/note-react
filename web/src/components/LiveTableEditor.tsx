import { useState } from 'react';
import LiveEditor from './LiveEditor';
import LiveBlock from './LiveBlock';
import TableDataEditor from './TableDataEditor';
import { parseTable } from '../utils/tableEdit';
import './liveTableEditor.css';

interface Props {
  // live 块内部源码（HTML/JS）
  value: string;
  onChange: (src: string) => void;
}

type View = 'table' | 'source';

// 可运行应用编辑器外层：在「表格数据」可视化与「HTML 源码」两视图间切换。
// 含 <table> 默认进表格视图，否则进源码视图。
export default function LiveTableEditor({ value, onChange }: Props) {
  const hasTable = parseTable(value) != null;
  const [view, setView] = useState<View>(hasTable ? 'table' : 'source');

  return (
    <div>
      <div className="lte-tabs">
        <button
          type="button"
          className={view === 'table' ? 'active' : ''}
          disabled={!hasTable}
          title={hasTable ? '' : '未检测到表格'}
          onClick={() => setView('table')}
        >
          表格
        </button>
        <button
          type="button"
          className={view === 'source' ? 'active' : ''}
          onClick={() => setView('source')}
        >
          HTML 源码
        </button>
      </div>

      {view === 'table' && hasTable ? (
        <div className="lte-split">
          <div className="lte-pane">
            <div className="lte-label">表格数据</div>
            <TableDataEditor value={value} onChange={onChange} />
          </div>
          <div className="lte-pane">
            <div className="lte-label">实时预览 · 沙箱运行</div>
            <div className="lte-preview">
              <LiveBlock html={value} />
            </div>
          </div>
        </div>
      ) : (
        <LiveEditor value={value} onChange={onChange} />
      )}
    </div>
  );
}
