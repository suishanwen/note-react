import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragState {
  dragId: number | null;
  overId: number | null;
  overRoot: boolean;
  // 拖拽中浮层的位置与内容
  ghost: { x: number; y: number; title: string } | null;
}

interface Options {
  // 校验能否把 dragId 放到 targetId 下
  canDropOn: (dragId: number, targetId: number) => boolean;
  // 拖到某行上 -> 成为其子级
  onDropOn: (dragId: number, targetId: number) => void;
  // 拖到顶部区域 -> 移到顶层
  onDropRoot: (dragId: number) => void;
  enabled: boolean;
}

const LONG_PRESS_MS = 400;
const MOVE_TOLERANCE = 8; // 长按期间手指移动超过此值则取消（视为滚动）

// 基于 Pointer Events 的树拖拽：桌面与 iOS/Safari 均可用
// 行用 data-note-id 标记；顶部放置区用 data-drop-root
export function useTreeDrag({ canDropOn, onDropOn, onDropRoot, enabled }: Options) {
  const [state, setState] = useState<DragState>({
    dragId: null,
    overId: null,
    overRoot: false,
    ghost: null
  });

  const timer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const pressId = useRef<number | null>(null);
  const pressTitle = useRef<string>('');
  const pressType = useRef<string>('mouse');
  const dragging = useRef(false);
  // 拖拽结束后短暂为 true，抑制 pointerup 之后浏览器派发的 click 导致误导航
  const justDragged = useRef(false);
  // 镜像当前放置目标，避免在 setState updater 里调副作用（严格模式会重复执行）
  const over = useRef<{ id: number | null; root: boolean }>({ id: null, root: false });

  const clearTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // 命中检测：返回手指/指针下方的目标行 id 或顶部放置区
  const hitTest = (x: number, y: number): { overId: number | null; overRoot: boolean } => {
    const el = document.elementFromPoint(x, y);
    if (!el) return { overId: null, overRoot: false };
    if (el.closest('[data-drop-root]')) return { overId: null, overRoot: true };
    const row = el.closest<HTMLElement>('[data-note-id]');
    if (row) {
      const id = Number(row.dataset.noteId);
      return { overId: Number.isNaN(id) ? null : id, overRoot: false };
    }
    return { overId: null, overRoot: false };
  };

  // 进入拖拽状态（鼠标移动或触屏长按达成时调用）
  const beginDrag = useCallback((x: number, y: number) => {
    clearTimer();
    if (pressId.current == null) return;
    dragging.current = true;
    over.current = { id: null, root: false };
    document.body.style.userSelect = 'none';
    // iOS Safari 靠 touch-action 阻止滚动，拖拽期间锁定整页
    document.body.style.touchAction = 'none';
    document.body.style.overflow = 'hidden';
    if (navigator.vibrate) navigator.vibrate(15);
    setState({
      dragId: pressId.current,
      overId: null,
      overRoot: false,
      ghost: { x, y, title: pressTitle.current }
    });
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      clearTimer();
      const dragId = pressId.current;
      if (commit && dragging.current && dragId != null) {
        const { id: overId, root: overRoot } = over.current;
        if (overRoot) onDropRoot(dragId);
        else if (overId != null && canDropOn(dragId, overId)) onDropOn(dragId, overId);
      }
      over.current = { id: null, root: false };
      const wasDragging = dragging.current;
      dragging.current = false;
      pressId.current = null;
      startPos.current = null;
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      document.body.style.overflow = '';
      setState({ dragId: null, overId: null, overRoot: false, ghost: null });
      // 拖拽过的话，抑制紧随其后的 click
      if (wasDragging) {
        justDragged.current = true;
        window.setTimeout(() => {
          justDragged.current = false;
        }, 50);
      }
    },
    [canDropOn, onDropOn, onDropRoot]
  );

  // 全局监听 move/up：拖拽中实时命中检测、更新浮层
  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      if (pressId.current == null) return;

      // 候选阶段（长按计时中）
      if (!dragging.current) {
        const sp = startPos.current;
        if (!sp) return;
        const moved = Math.hypot(e.clientX - sp.x, e.clientY - sp.y);
        if (moved <= MOVE_TOLERANCE) return;
        // 鼠标：移动即开始拖拽，无需等长按；触屏：移动视为滚动，取消候选
        if (pressType.current === 'mouse') {
          beginDrag(e.clientX, e.clientY);
        } else {
          clearTimer();
          pressId.current = null;
          startPos.current = null;
        }
        return;
      }

      // 拖拽中：阻止页面滚动，更新命中与浮层
      e.preventDefault();
      const { overId, overRoot } = hitTest(e.clientX, e.clientY);
      over.current = { id: overId, root: overRoot };
      setState((s) => ({
        ...s,
        overId,
        overRoot,
        ghost: { x: e.clientX, y: e.clientY, title: pressTitle.current }
      }));
    };

    const onUp = () => {
      if (pressId.current != null && !dragging.current) {
        // 长按未达成，按普通点击处理：什么都不做，交给行自身的 onClick
        clearTimer();
        pressId.current = null;
        startPos.current = null;
        return;
      }
      endDrag(true);
    };

    const onCancel = () => endDrag(false);

    // passive:false 才能在 touchmove 时 preventDefault 阻止滚动
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [enabled, endDrag, beginDrag]);

  // 在行的 onPointerDown 上调用
  const onItemPointerDown = useCallback(
    (e: React.PointerEvent, id: number, title: string) => {
      if (!enabled) return;
      // 仅主键/单指
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pressId.current = id;
      pressTitle.current = title;
      pressType.current = e.pointerType;
      startPos.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      // 触屏/笔：长按进入拖拽；鼠标：等移动再进入（在 onMove 处理）
      if (e.pointerType !== 'mouse') {
        const { x, y } = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => beginDrag(x, y), LONG_PRESS_MS);
      }
    },
    [enabled, beginDrag]
  );

  // dragging 或刚拖完都视为"拖拽中"，供点击处理判断是否抑制导航
  return {
    state,
    onItemPointerDown,
    isDragging: () => dragging.current || justDragged.current
  };
}
