import { useMemo } from 'react';
import { parseTable, replaceCellText, type TableCell } from '../utils/tableEdit';
import './tableDataEditor.css';

interface Props {
  // live 块内部源码（HTML/JS）
  value: string;
  onChange: (src: string) => void;
}

// live 应用的「表格数据」可视化编辑：把首个 <table> 渲染成输入框表格，
// 仅改单元格文本并定点写回源码，<style>/<script>/id/结构原样保留。
// 带 id 的单元格是脚本计算输出，只读灰显。
export default function TableDataEditor({ value, onChange }: Props) {
  // value 变化后单元格在源码中的位置会变，每次都基于最新源码解析
  const table = useMemo(() => parseTable(value), [value]);

  if (!table) {
    return (
      <div className="tde-empty">
        此应用不含可识别表格，请切到「HTML 源码」编辑
      </div>
    );
  }

  const [head, ...body] = table.rows;

  // 改某个单元格：基于当前源码重新解析定位，避免使用过期偏移
  const editCell = (rowIndex: number, colIndex: number, text: string) => {
    const fresh = parseTable(value);
    const cell = fresh?.rows[rowIndex]?.[colIndex];
    if (!cell) return;
    onChange(replaceCellText(value, cell, text));
  };

  const isAuto = (cell: TableCell) => cell.id != null;

  return (
    <div className="tde">
      <table className="tde-table">
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i}>{c.display || `列${i + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) =>
                isAuto(cell) ? (
                  <td key={c} className="tde-auto" title={`脚本自动计算（${cell.id}）`}>
                    自动
                  </td>
                ) : (
                  <td key={c}>
                    <input
                      className="tde-input"
                      value={cell.text}
                      onChange={(e) => editCell(cell.rowIndex, cell.colIndex, e.target.value)}
                    />
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tde-hint">
        灰色「自动」格由脚本计算，不可编辑；改完数据切「HTML 源码」可见结构完整保留
      </p>
    </div>
  );
}
