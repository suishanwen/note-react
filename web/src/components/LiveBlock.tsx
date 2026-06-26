import { useEffect, useRef, useState } from 'react';
import './liveBlock.css';

// 可执行代码块：放进 sandbox iframe 运行。
// sandbox 仅给 allow-scripts，不给 allow-same-origin —— iframe 处于不透明源，
// 无法访问父页面 DOM / localStorage / 管理员 token，加密内容不会泄露。
// 注入高度上报脚本，按内容自适应 iframe 高度。
const HEIGHT_REPORTER = `<script>
(function(){
  function report(){
    var h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    parent.postMessage({ __liveHeight: h }, '*');
  }
  window.addEventListener('load', report);
  window.addEventListener('resize', report);
  new MutationObserver(report).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  setInterval(report, 1000);
})();
<\/script>`;

export default function LiveBlock({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(160);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 仅接受来自本 iframe 的高度上报
      if (ref.current && e.source === ref.current.contentWindow) {
        const h = e.data?.__liveHeight;
        if (typeof h === 'number' && h > 0) setHeight(Math.ceil(h) + 8);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // 包裹基础样式，使沙箱内排版与正文协调
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{ margin:0; padding:12px; font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#1a1a1a; background:transparent; line-height:1.6; }
  table{ border-collapse:collapse; }
  th,td{ border:1px solid #d0d0d0; padding:6px 10px; }
</style></head>
<body>${html}${HEIGHT_REPORTER}</body></html>`;

  return (
    <div className="live-block">
      <div className="live-block-bar">
        <span className="live-dot" /> 可运行 · 沙箱隔离
      </div>
      <iframe
        ref={ref}
        className="live-block-frame"
        title="可运行内容"
        sandbox="allow-scripts allow-popups allow-forms"
        srcDoc={srcDoc}
        style={{ height }}
      />
    </div>
  );
}
