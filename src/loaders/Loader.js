// 导入默认加载管理器
// Import default loading manager
import { DefaultLoadingManager } from "./LoadingManager.js";

/**
 * 加载器的抽象基类。
 * Abstract base class for loaders.
 *
 * @abstract
 */
class Loader {
  /**
   * 构造一个新的加载器。
   * Constructs a new loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    /**
     * 加载管理器。
     * The loading manager.
     *
     * @type {LoadingManager}
     * @default DefaultLoadingManager
     */
    this.manager = manager !== undefined ? manager : DefaultLoadingManager;

    /**
     * 用于实现CORS的crossOrigin字符串，用于从允许CORS的不同域加载URL。
     * The crossOrigin string to implement CORS for loading the url from a
     * different domain that allows CORS.
     *
     * @type {string}
     * @default 'anonymous'
     */
    this.crossOrigin = "anonymous";

    /**
     * XMLHttpRequest是否使用凭据。
     * Whether the XMLHttpRequest uses credentials.
     *
     * @type {boolean}
     * @default false
     */
    this.withCredentials = false;

    /**
     * 资源将从中加载的基础路径。
     * The base path from which the asset will be loaded.
     *
     * @type {string}
     */
    this.path = "";

    /**
     * 额外资源（如纹理）将从中加载的基础路径。
     * The base path from which additional resources like textures will be loaded.
     *
     * @type {string}
     */
    this.resourcePath = "";

    /**
     * 在HTTP请求中使用的[请求头]{@link https://developer.mozilla.org/en-US/docs/Glossary/Request_header}。
     * The [request header]{@link https://developer.mozilla.org/en-US/docs/Glossary/Request_header}
     * used in HTTP request.
     *
     * @type {Object<string, any>}
     */
    this.requestHeader = {};
  }

  /**
   * 此方法需要由所有具体的加载器实现。它包含从后端加载资源的逻辑。
   * This method needs to be implemented by all concrete loaders. It holds the
   * logic for loading assets from the backend.
   *
   * @abstract
   * @param {string} url - 要加载的文件的路径/URL。The path/URL of the file to be loaded.
   * @param {Function} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} [onProgress] - 加载过程中执行的回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} [onError] - 发生错误时执行的回调函数。Executed when errors occur.
   */
  load(/* url, onLoad, onProgress, onError */) {}

  /**
   * {@link Loader#load}的异步版本。
   * A async version of {@link Loader#load}.
   *
   * @param {string} url - 要加载的文件的路径/URL。The path/URL of the file to be loaded.
   * @param {onProgressCallback} [onProgress] - 加载过程中执行的回调函数。Executed while the loading is in progress.
   * @return {Promise} 当资源加载完成时解析的Promise。A Promise that resolves when the asset has been loaded.
   */
  loadAsync(url, onProgress) {
    // 保存当前作用域的引用
    // Save reference to current scope
    const scope = this;

    // 返回一个Promise
    // Return a Promise
    return new Promise(function (resolve, reject) {
      // 调用load方法，使用resolve和reject作为回调
      // Call load method with resolve and reject as callbacks
      scope.load(url, resolve, onProgress, reject);
    });
  }

  /**
   * 此方法需要由所有具体的加载器实现。它包含将资源解析为three.js实体的逻辑。
   * This method needs to be implemented by all concrete loaders. It holds the
   * logic for parsing the asset into three.js entities.
   *
   * @abstract
   * @param {any} data - 要解析的数据。The data to parse.
   */
  parse(/* data */) {}

  /**
   * 设置`crossOrigin`字符串以实现CORS，用于从允许CORS的不同域加载URL。
   * Sets the `crossOrigin` String to implement CORS for loading the URL
   * from a different domain that allows CORS.
   *
   * @param {string} crossOrigin - `crossOrigin`值。The `crossOrigin` value.
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  setCrossOrigin(crossOrigin) {
    // 设置跨域属性
    // Set cross-origin property
    this.crossOrigin = crossOrigin;
    // 返回当前实例以支持链式调用
    // Return current instance for method chaining
    return this;
  }

  /**
   * XMLHttpRequest是否使用凭据，如cookies、授权头或TLS客户端证书，
   * 参见[XMLHttpRequest.withCredentials]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials}。
   * Whether the XMLHttpRequest uses credentials such as cookies, authorization
   * headers or TLS client certificates, see [XMLHttpRequest.withCredentials]{@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials}.
   *
   * 注意：如果您在本地或从同一域加载文件，此设置无效。
   * Note: This setting has no effect if you are loading files locally or from the same domain.
   *
   * @param {boolean} value - `withCredentials`值。The `withCredentials` value.
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  setWithCredentials(value) {
    // 设置凭据属性
    // Set credentials property
    this.withCredentials = value;
    // 返回当前实例以支持链式调用
    // Return current instance for method chaining
    return this;
  }

  /**
   * 设置资源的基础路径。
   * Sets the base path for the asset.
   *
   * @param {string} path - 基础路径。The base path.
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  setPath(path) {
    // 设置路径属性
    // Set path property
    this.path = path;
    // 返回当前实例以支持链式调用
    // Return current instance for method chaining
    return this;
  }

  /**
   * 设置依赖资源（如纹理）的基础路径。
   * Sets the base path for dependent resources like textures.
   *
   * @param {string} resourcePath - 资源路径。The resource path.
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  setResourcePath(resourcePath) {
    // 设置资源路径属性
    // Set resource path property
    this.resourcePath = resourcePath;
    // 返回当前实例以支持链式调用
    // Return current instance for method chaining
    return this;
  }

  /**
   * 设置给定的请求头。
   * Sets the given request header.
   *
   * @param {Object} requestHeader - 用于配置HTTP请求的[请求头]{@link https://developer.mozilla.org/en-US/docs/Glossary/Request_header}。
   * A [request header]{@link https://developer.mozilla.org/en-US/docs/Glossary/Request_header}
   * for configuring the HTTP request.
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  setRequestHeader(requestHeader) {
    // 设置请求头属性
    // Set request header property
    this.requestHeader = requestHeader;
    // 返回当前实例以支持链式调用
    // Return current instance for method chaining
    return this;
  }

  /**
   * 此方法可以在加载器中实现，用于中止正在进行的请求。
   * This method can be implemented in loaders for aborting ongoing requests.
   *
   * @abstract
   * @return {Loader} 对此实例的引用。A reference to this instance.
   */
  abort() {
    // 返回当前实例（默认实现不执行任何操作）
    // Return current instance (default implementation does nothing)
    return this;
  }
}

/**
 * 加载器中onProgress的回调函数。
 * Callback for onProgress in loaders.
 *
 * @callback onProgressCallback
 * @param {ProgressEvent} event - 表示当前加载状态的`ProgressEvent`实例。An instance of `ProgressEvent` that represents the current loading status.
 */

/**
 * 加载器中onError的回调函数。
 * Callback for onError in loaders.
 *
 * @callback onErrorCallback
 * @param {Error} error - 加载过程中发生的错误。The error which occurred during the loading process.
 */

/**
 * 加载器在为加载的3D对象创建材质时使用的默认材质名称。
 * The default material name that is used by loaders
 * when creating materials for loaded 3D objects.
 *
 * 注意：并非所有加载器都会遵循此设置。
 * Note: Not all loaders might honor this setting.
 *
 * @static
 * @type {string}
 * @default '__DEFAULT'
 */
Loader.DEFAULT_MATERIAL_NAME = "__DEFAULT";

// 导出Loader类
// Export Loader class
export { Loader };
