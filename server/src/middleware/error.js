// 异步路由包装：自动捕获 async handler 抛出的异常并转交全局错误中间件，
// 消除各路由重复的 try/catch
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// 业务可抛出的带状态码错误
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 全局错误处理：统一日志与响应（4xx 用业务消息，5xx 兜底）
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('ErrorHandler#handle %s %s 失败 %s', req.method, req.originalUrl, err.message);
  }
  res.status(status).json({ message: err.message || '服务器内部错误' });
}
