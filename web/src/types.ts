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

// 分享有效期：24 小时 / 7 天 / 永久
export type ShareDuration = 'day' | 'week' | 'forever';

// 当前分享信息，expireTime 为 null 表示永久
export interface ShareInfo {
  token: string;
  expireTime: string | null;
}

// 分享页公开笔记（不含 ip 与加密标记）
export interface SharedNote {
  title: string;
  content: string;
  tag: string | null;
  poster: string | null;
  postTime: string | null;
  editTime: string | null;
}
