// recommend 三态：-1 加密 / 1 推荐 / 0 普通
export const NORMAL = 0;
export const RECOMMEND = 1;
export const ENCRYPTED = -1;

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
  // 加密且无权查看时为 true，仅返回标题与层级
  locked?: boolean;
}

// 笔记详情（含正文）
export interface NoteDetail extends NoteSummary {
  content: string;
  ip: string | null;
}

// 编辑/新增提交体
export interface NoteInput {
  parent: number;
  title: string;
  content: string;
  summary: string;
  tag: string;
  poster: string;
  recommend: number;
}
