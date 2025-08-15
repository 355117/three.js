// 全局音频上下文变量
let _context;

/**
 * 管理引擎中的全局音频上下文。
 *
 * @hideconstructor
 */
class AudioContext {
  /**
   * 返回全局原生音频上下文。
   *
   * @return {AudioContext} 原生音频上下文。
   */
  static getContext() {
    // 如果上下文未定义，则创建新的音频上下文
    if (_context === undefined) {
      // 创建音频上下文，兼容不同浏览器
      _context = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 返回音频上下文
    return _context;
  }

  /**
   * 允许从外部设置全局原生音频上下文。
   *
   * @param {AudioContext} value - 要设置的原生上下文。
   */
  static setContext(value) {
    // 设置全局音频上下文
    _context = value;
  }
}

// 导出AudioContext类
export { AudioContext };
