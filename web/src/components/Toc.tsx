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
    els.forEach((el, i) => {
      const text = el.textContent?.trim() ?? '';
      if (!text) return;
      if (!el.id) el.id = `heading-${i}`;
      list.push({ id: el.id, text, level: Number(el.tagName[1]) });
    });
    headingEls.current = els;
    setHeadings(list);
    if (list.length > 0) setActiveId(list[0].id);
  }, [contentRef, content]);

  // 滚动联动：监听滚动容器，取视口上缘最近的标题
  useEffect(() => {
    if (headings.length === 0) return;
    const scroller = document.querySelector('.workbench-main');
    if (!scroller) return;

    const onScroll = () => {
      const top = scroller.getBoundingClientRect().top + 80;
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
  }, [headings]);

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
                document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
