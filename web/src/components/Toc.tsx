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

const ACTIVE_OFFSET = 80;

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

function scrollToHeading(root: ScrollRoot, heading: HTMLElement) {
  if (root instanceof HTMLElement) {
    const targetTop =
      root.scrollTop + heading.getBoundingClientRect().top - root.getBoundingClientRect().top - ACTIVE_OFFSET;
    root.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });
    return;
  }

  window.scrollTo({
    top: window.scrollY + heading.getBoundingClientRect().top - ACTIVE_OFFSET,
    behavior: 'smooth'
  });
}

// 文章目录：提取正文标题，滚动联动高亮，点击平滑跳转
export default function Toc({ contentRef, content }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');
  const headingEls = useRef<HTMLElement[]>([]);

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
      const top = getRootTop(scroller) + ACTIVE_OFFSET;
      let current = headings[0]?.id ?? '';
      for (const el of headingEls.current) {
        if (el.getBoundingClientRect().top <= top) current = el.id;
        else break;
      }
      setActiveId(current);
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
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
                setActiveId(h.id);
                scrollToHeading(getScrollRoot(root), heading);
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
