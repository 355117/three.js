/**
 * 包含加载器实用工具函数的类。
 * A class with loader utility functions.
 */
class LoaderUtils {
  /**
   * 从给定的URL中提取基础URL。
   * Extracts the base URL from the given URL.
   *
   * @param {string} url - 要从中提取基础URL的URL字符串。The URL to extract the base URL from.
   * @return {string} 提取出的基础URL。The extracted base URL.
   */
  static extractUrlBase(url) {
    // 查找最后一个斜杠的位置
    // Find the position of the last slash
    const index = url.lastIndexOf("/");

    // 如果没有找到斜杠，返回当前目录
    // If no slash is found, return current directory
    if (index === -1) return "./";

    // 返回从开始到最后一个斜杠（包含斜杠）的子字符串
    // Return substring from start to last slash (including slash)
    return url.slice(0, index + 1);
  }

  /**
   * 根据给定路径解析相对URL。绝对路径、数据URL和blob URL将原样返回。
   * 无效的URL将返回空字符串。
   * Resolves relative URLs against the given path. Absolute paths, data urls,
   * and blob URLs will be returned as is. Invalid URLs will return an empty
   * string.
   *
   * @param {string} url - 要解析的URL。The URL to resolve.
   * @param {string} path - 相对URL要解析的基础路径。The base path for relative URLs to be resolved against.
   * @return {string} 解析后的URL。The resolved URL.
   */
  static resolveURL(url, path) {
    // 无效的URL - 检查URL是否为字符串且不为空
    // Invalid URL - check if URL is string and not empty
    if (typeof url !== "string" || url === "") return "";

    // 主机相对URL - 如果路径是http/https开头且URL以/开头
    // Host Relative URL - if path starts with http/https and URL starts with /
    if (/^https?:\/\//i.test(path) && /^\//.test(url)) {
      // 提取协议和主机部分，去掉路径部分
      // Extract protocol and host part, remove path part
      path = path.replace(/(^https?:\/\/[^\/]+).*/i, "$1");
    }

    // 绝对URL - http://、https://、//开头的URL
    // Absolute URL - URLs starting with http://, https://, //
    if (/^(https?:)?\/\//i.test(url)) return url;

    // 数据URI - data:开头的URL
    // Data URI - URLs starting with data:
    if (/^data:.*,.*$/i.test(url)) return url;

    // Blob URL - blob:开头的URL
    // Blob URL - URLs starting with blob:
    if (/^blob:.*$/i.test(url)) return url;

    // 相对URL - 将路径和URL拼接
    // Relative URL - concatenate path and URL
    return path + url;
  }
}

// 导出LoaderUtils类
// Export LoaderUtils class
export { LoaderUtils };
