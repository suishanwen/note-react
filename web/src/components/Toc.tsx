import { useEffect, useRef, useState } from 'react';
import './toc.css';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  // 正文容器 ref：从中提取 h1-h3 生成目录
  contentRef: React.RefObject<HTMLElement>;
  // 正文内容（变化时重建目录）
  content: string;
}

type ScrollRoot = HTMLElement | Window;

const ACTIVE_THRESHOLD = 24;
const SCROLL_POSITION_TOLERANCE = 1;
const SCROLL_LOCK_IDLE = 160;
const SCROLL_LOCK_MAX = 700;

function getScrollRoot(root: HTMLElement): ScrollRoot {
  let el = root.parentElement;
  while (el) {
    const style = window.getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(style.overflowY)) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

function getRootTop(root: ScrollRoot): number {
  return root instanceof HTMLElement ? root.getBoundingClientRect().top : 0;
}

function getScrollTop(root: ScrollRoot): number {
  return root instanceof HTMLElement ? root.scrollTop : window.scrollY;
}

function getMaxScrollTop(root: ScrollRoot): number {
  if (root instanceof HTMLElement) {
    return Math.max(0, root.scrollHeight - root.clientHeight);
  }

  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function scrollToHeading(root: ScrollRoot, heading: HTMLElement): number {
  const targetTop =
    root instanceof HTMLElement
      ? getScrollTop(root) + heading.getBoundingClientRect().top - root.getBoundingClientRect().top
      : getScrollTop(root) + heading.getBoundingClientRect().top;
  const top = Math.min(Math.max(targetTop, 0), getMaxScrollTop(root));

  root.scrollTo({ top, behavior: 'smooth' });
  return top;
}

function isScrollEnd(root: ScrollRoot): boolean {
  if (root instanceof HTMLElement) {
    const canScroll = root.scrollHeight > root.clientHeight + 2;
    return canScroll && root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
  }

  const doc = document.documentElement;
  const canScroll = doc.scrollHeight > window.innerHeight + 2;
  return canScroll && window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
}

// 文章目录：提取正文标题，滚动联动高亮，点击平滑跳转
export default function Toc({ contentRef, content }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');
  const headingEls = useRef<HTMLElement[]>([]);
  const lockedActiveId = useRef('');
  const scrollLockTimer = useRef<number | null>(null);

  function scheduleScrollLockRelease(id: string, delay: number) {
    if (scrollLockTimer.current !== null) window.clearTimeout(scrollLockTimer.current);
    scrollLockTimer.current = window.setTimeout(() => {
      if (lockedActiveId.current === id) lockedActiveId.current = '';
      scrollLockTimer.current = null;
    }, delay);
  }

  // 渲染完成后提取标题并补充锚点 id
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'));
    const list: Heading[] = [];
    const validEls: HTMLElement[] = [];
    const usedIds = new Set<string>();
    els.forEach((el, i) => {
      const text = el.textContent?.trim() ?? '';
      if (!text) return;
      const baseId = el.id || `heading-${i}`;
      let id = baseId;
      let suffix = 1;
      while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      el.id = id;
      usedIds.add(id);
      list.push({ id: el.id, text, level: Number(el.tagName[1]) });
      validEls.push(el);
    });
    headingEls.current = validEls;
    setHeadings(list);
    if (list.length > 0) setActiveId(list[0].id);
  }, [contentRef, content]);

  // 滚动联动：监听滚动容器，取视口上缘最近的标题
  useEffect(() => {
    if (headings.length === 0) return;
    const root = contentRef.current;
    if (!root) return;
    const scroller = getScrollRoot(root);

    const onScroll = () => {
      if (lockedActiveId.current) {
        const id = lockedActiveId.current;
        setActiveId((prev) => (prev === id ? prev : id));
        scheduleScrollLockRelease(id, SCROLL_LOCK_IDLE);
        return;
      }

      if (isScrollEnd(scroller)) {
        setActiveId(headings[headings.length - 1].id);
        return;
      }

      const top = getRootTop(scroller) + ACTIVE_THRESHOLD;
      let current = headings[0]?.id ?? '';
      for (const el of headingEls.current) {
        if (el.getBoundingClientRect().top <= top) current = el.id;
        else break;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (scrollLockTimer.current !== null) window.clearTimeout(scrollLockTimer.current);
      scrollLockTimer.current = null;
      lockedActiveId.current = '';
    };
  }, [contentRef, headings]);

  if (headings.length < 2) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav className="toc" aria-label="文章目录">
      <div className="toc-label">目录</div>
      <ul className="toc-list">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              className={`toc-item${activeId === h.id ? ' active' : ''}`}
              style={{ paddingLeft: `${(h.level - minLevel) * 14 + 10}px` }}
              onClick={() => {
                const heading = headingEls.current.find((el) => el.id === h.id);
                const root = contentRef.current;
                if (!heading || !root) return;
                const scroller = getScrollRoot(root);
                lockedActiveId.current = h.id;
                setActiveId(h.id);
                const targetTop = scrollToHeading(scroller, heading);
                if (Math.abs(getScrollTop(scroller) - targetTop) <= SCROLL_POSITION_TOLERANCE) {
                  lockedActiveId.current = '';
                  return;
                }
                scheduleScrollLockRelease(h.id, SCROLL_LOCK_MAX);
              }}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
