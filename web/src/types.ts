// 笔记列表项（不含正文）
export interface NoteSummary {
  id: number;
  parent: number;
  title: string;
  tag: string | null;
  summary: string | null;
  poster: string | null;
  recommend: number;
  postTime: string | null;
  editTime: string | null;
}

// 笔记详情（含正文）
export interface NoteDetail extends NoteSummary {
  content: string;
  ip: string | null;
}

// 编辑/新增提交体
export interface NoteInput {
  title: string;
  content: string;
  summary: string;
  tag: string;
  poster: string;
  recommend: boolean;
}
