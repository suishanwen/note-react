import { request } from './client';
import type { NoteSummary, NoteDetail, NoteInput } from '../types';

export interface ListParams {
  keyword?: string;
  tag?: string;
}

export function fetchNotes(params: ListParams = {}): Promise<NoteSummary[]> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.tag) qs.set('tag', params.tag);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<NoteSummary[]>(`/notes${suffix}`);
}

export function fetchNote(id: number | string): Promise<NoteDetail> {
  return request<NoteDetail>(`/notes/${id}`);
}

export function createNote(input: NoteInput): Promise<{ id: number }> {
  return request<{ id: number }>('/notes', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function updateNote(id: number, input: NoteInput): Promise<{ id: number }> {
  return request<{ id: number }>(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input)
  });
}

export function deleteNote(id: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/notes/${id}`, { method: 'DELETE' });
}

// 仅调整父级（拖拽改层级）
export function setNoteParent(id: number, parent: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/notes/${id}/parent`, {
    method: 'PATCH',
    body: JSON.stringify({ parent })
  });
}

export function login(password: string): Promise<{ token: string }> {
  return request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

// 凭管理员密码解锁加密笔记，返回解锁令牌
export function unlock(password: string): Promise<{ token: string }> {
  return request<{ token: string }>('/auth/unlock', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

// 触发宿主机远程更新（拉代码+重建+重启）
export function triggerUpdate(): Promise<{ message: string }> {
  return request<{ message: string }>('/admin/update', { method: 'POST' });
}

// 上传图片返回可访问 URL
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const data = await request<{ url: string }>('/upload', { method: 'POST', body: form });
  return data.url;
}
