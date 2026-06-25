import './footer.css';

// 页脚社交链接，迁移自旧 contact.js
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="http://wpa.qq.com/msgrd?v=3&uin=526253340&site=qq&menu=yes" target="_blank" rel="noreferrer">
          QQ
        </a>
        <a href="http://www.weibo.com/suiswinging2012" target="_blank" rel="noreferrer">
          微博
        </a>
        <a href="http://www.github.com/suishanwen" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} suishanwen</div>
    </footer>
  );
}
