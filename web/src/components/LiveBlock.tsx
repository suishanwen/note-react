import { useEffect, useRef, useState } from 'react';
import './liveBlock.css';

// 可执行代码块：放进 sandbox iframe 运行。
// sandbox 仅给 allow-scripts，不给 allow-same-origin —— iframe 处于不透明源，
// 无法访问父页面 DOM / localStorage / 管理员 token，加密内容不会泄露。
// 高度上报测量内容包裹层（而非 documentElement.scrollHeight，后者会随 iframe 高度反馈放大致无限增高）。
const HEIGHT_REPORTER = `<script>
(function(){
  var root = document.getElementById('__live_root');
  if(!root) return;
  function report(){
    var h = root.getBoundingClientRect().height;
    parent.postMessage({ __liveHeight: Math.ceil(h) }, '*');
  }
  window.addEventListener('load', report);
  if (window.ResizeObserver) new ResizeObserver(report).observe(root);
  // 异步内容（图片/接口回填）就绪后再补报几次
  [200, 600, 1500].forEach(function(t){ setTimeout(report, t); });
  report();
})();
<\/script>`;

export default function LiveBlock({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 仅接受来自本 iframe 的高度上报
      if (ref.current && e.source === ref.current.contentWindow) {
        const h = e.data?.__liveHeight;
        if (typeof h === 'number' && h > 0) setHeight(h);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // body 无边距，内容统一包进 #__live_root（含 padding），其高度仅由内容决定
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html,body{ margin:0; }
  #__live_root{ padding:12px; font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:#1a1a1a; background:transparent; line-height:1.6; }
  #__live_root table{ border-collapse:collapse; }
  #__live_root th,#__live_root td{ border:1px solid #d0d0d0; padding:6px 10px; }
</style></head>
<body><div id="__live_root">${html}</div>${HEIGHT_REPORTER}</body></html>`;

  return (
    <div className="live-block">
      <div className="live-block-bar">
        <span className="live-dot" /> 可运行 · 沙箱隔离
      </div>
      <iframe
        ref={ref}
        className="live-block-frame"
        title="可运行内容"
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        srcDoc={srcDoc}
        style={{ height }}
      />
    </div>
  );
}
