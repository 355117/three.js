/**
 * 处理并跟踪已加载和待加载的数据。如果没有手动提供，
 * 会创建并使用此类的默认全局实例供加载器使用。
 * Handles and keeps track of loaded and pending data. A default global
 * instance of this class is created and used by loaders if not supplied
 * manually.
 *
 * 一般来说这应该足够了，但有时使用单独的加载器会很有用 -
 * 例如，如果您想为对象和纹理显示单独的加载条。
 * In general that should be sufficient, however there are times when it can
 * be useful to have separate loaders - for example if you want to show
 * separate loading bars for objects and textures.
 *
 * ```js
 * const manager = new THREE.LoadingManager();
 * manager.onLoad = () => console.log( 'Loading complete!' );
 *
 * const loader1 = new OBJLoader( manager );
 * const loader2 = new ColladaLoader( manager );
 * ```
 */
class LoadingManager {
  /**
   * 构造一个新的加载管理器。
   * Constructs a new loading manager.
   *
   * @param {Function} [onLoad] - 所有项目加载完成时执行的回调函数。Executes when all items have been loaded.
   * @param {Function} [onProgress] - 单个项目加载完成时执行的回调函数。Executes when single items have been loaded.
   * @param {Function} [onError] - 发生错误时执行的回调函数。Executes when an error occurs.
   */
  constructor(onLoad, onProgress, onError) {
    // 保存当前作用域的引用
    // Save reference to current scope
    const scope = this;

    // 是否正在加载的标志
    // Flag indicating if loading is in progress
    let isLoading = false;
    // 已加载项目的数量
    // Number of items loaded
    let itemsLoaded = 0;
    // 总项目数量
    // Total number of items
    let itemsTotal = 0;
    // URL修改器函数
    // URL modifier function
    let urlModifier = undefined;
    // 处理器数组
    // Array of handlers
    const handlers = [];

    // 参考#5689了解为什么我们不在构造函数中设置.onStart
    // Refer to #5689 for the reason why we don't set .onStart
    // in the constructor

    /**
     * 项目开始加载时执行的回调函数。
     * Executes when an item starts loading.
     *
     * @type {Function|undefined}
     * @default undefined
     */
    this.onStart = undefined;

    /**
     * 所有项目加载完成时执行的回调函数。
     * Executes when all items have been loaded.
     *
     * @type {Function|undefined}
     * @default undefined
     */
    this.onLoad = onLoad;

    /**
     * 单个项目加载完成时执行的回调函数。
     * Executes when single items have been loaded.
     *
     * @type {Function|undefined}
     * @default undefined
     */
    this.onProgress = onProgress;

    /**
     * 发生错误时执行的回调函数。
     * Executes when an error occurs.
     *
     * @type {Function|undefined}
     * @default undefined
     */
    this.onError = onError;

    /**
     * 用于中止使用此管理器的加载器中正在进行的请求。
     * Used for aborting ongoing requests in loaders using this manager.
     *
     * @type {AbortController}
     */
    this.abortController = new AbortController();

    /**
     * 当使用管理器的加载器开始加载项目时，应该调用此方法。
     * This should be called by any loader using the manager when the loader
     * starts loading an item.
     *
     * @param {string} url - 要加载的URL。The URL to load.
     */
    this.itemStart = function (url) {
      // 增加总项目数
      // Increment total items count
      itemsTotal++;

      // 如果当前没有在加载
      // If not currently loading
      if (isLoading === false) {
        // 如果定义了onStart回调函数
        // If onStart callback is defined
        if (scope.onStart !== undefined) {
          // 调用onStart回调函数
          // Call onStart callback
          scope.onStart(url, itemsLoaded, itemsTotal);
        }
      }

      // 设置加载状态为true
      // Set loading state to true
      isLoading = true;
    };

    /**
     * 当使用管理器的加载器完成加载项目时，应该调用此方法。
     * This should be called by any loader using the manager when the loader
     * ended loading an item.
     *
     * @param {string} url - 已加载项目的URL。The URL of the loaded item.
     */
    this.itemEnd = function (url) {
      // 增加已加载项目数
      // Increment loaded items count
      itemsLoaded++;

      // 如果定义了onProgress回调函数
      // If onProgress callback is defined
      if (scope.onProgress !== undefined) {
        // 调用onProgress回调函数
        // Call onProgress callback
        scope.onProgress(url, itemsLoaded, itemsTotal);
      }

      // 如果所有项目都已加载完成
      // If all items have been loaded
      if (itemsLoaded === itemsTotal) {
        // 设置加载状态为false
        // Set loading state to false
        isLoading = false;

        // 如果定义了onLoad回调函数
        // If onLoad callback is defined
        if (scope.onLoad !== undefined) {
          // 调用onLoad回调函数
          // Call onLoad callback
          scope.onLoad();
        }
      }
    };

    /**
     * 当使用管理器的加载器在加载项目时遇到错误时，应该调用此方法。
     * This should be called by any loader using the manager when the loader
     * encounters an error when loading an item.
     *
     * @param {string} url - 产生错误的项目的URL。The URL of the item that produces an error.
     */
    this.itemError = function (url) {
      // 如果定义了onError回调函数
      // If onError callback is defined
      if (scope.onError !== undefined) {
        // 调用onError回调函数
        // Call onError callback
        scope.onError(url);
      }
    };

    /**
     * 给定一个URL，使用URL修改器回调函数（如果有的话）并返回解析后的URL。
     * 如果没有设置URL修改器，则返回原始URL。
     * Given a URL, uses the URL modifier callback (if any) and returns a
     * resolved URL. If no URL modifier is set, returns the original URL.
     *
     * @param {string} url - 要加载的URL。The URL to load.
     * @return {string} 解析后的URL。The resolved URL.
     */
    this.resolveURL = function (url) {
      // 如果存在URL修改器
      // If URL modifier exists
      if (urlModifier) {
        // 使用URL修改器处理URL
        // Process URL with URL modifier
        return urlModifier(url);
      }

      // 返回原始URL
      // Return original URL
      return url;
    };

    /**
     * 如果提供了回调函数，在发送请求之前会将每个资源URL传递给回调函数。
     * 回调函数可以返回原始URL，或返回新URL以覆盖加载行为。
     * 此行为可用于从.ZIP文件、拖放API和数据URI加载资源。
     * If provided, the callback will be passed each resource URL before a
     * request is sent. The callback may return the original URL, or a new URL to
     * override loading behavior. This behavior can be used to load assets from
     * .ZIP files, drag-and-drop APIs, and Data URIs.
     *
     * ```js
     * const blobs = {'fish.gltf': blob1, 'diffuse.png': blob2, 'normal.png': blob3};
     *
     * const manager = new THREE.LoadingManager();
     *
     * // Initialize loading manager with URL callback.
     * const objectURLs = [];
     * manager.setURLModifier( ( url ) => {
     *
     * 	url = URL.createObjectURL( blobs[ url ] );
     * 	objectURLs.push( url );
     * 	return url;
     *
     * } );
     *
     * // Load as usual, then revoke the blob URLs.
     * const loader = new GLTFLoader( manager );
     * loader.load( 'fish.gltf', (gltf) => {
     *
     * 	scene.add( gltf.scene );
     * 	objectURLs.forEach( ( url ) => URL.revokeObjectURL( url ) );
     *
     * } );
     * ```
     *
     * @param {function(string):string} transform - URL修改器回调函数。使用URL调用，必须返回解析后的URL。URL modifier callback. Called with an URL and must return a resolved URL.
     * @return {LoadingManager} 对此加载管理器的引用。A reference to this loading manager.
     */
    this.setURLModifier = function (transform) {
      // 设置URL修改器
      // Set URL modifier
      urlModifier = transform;

      // 返回当前实例以支持链式调用
      // Return current instance for method chaining
      return this;
    };

    /**
     * 使用给定的正则表达式注册加载器。可用于定义应使用哪个加载器来加载特定文件。
     * 典型的用例是覆盖纹理的默认加载器。
     * Registers a loader with the given regular expression. Can be used to
     * define what loader should be used in order to load specific files. A
     * typical use case is to overwrite the default loader for textures.
     *
     * ```js
     * // add handler for TGA textures
     * manager.addHandler( /\.tga$/i, new TGALoader() );
     * ```
     *
     * @param {string} regex - 正则表达式。A regular expression.
     * @param {Loader} loader - 应处理匹配情况的加载器。A loader that should handle matched cases.
     * @return {LoadingManager} 对此加载管理器的引用。A reference to this loading manager.
     */
    this.addHandler = function (regex, loader) {
      // 将正则表达式和加载器添加到处理器数组
      // Add regex and loader to handlers array
      handlers.push(regex, loader);

      // 返回当前实例以支持链式调用
      // Return current instance for method chaining
      return this;
    };

    /**
     * 移除给定正则表达式的加载器。
     * Removes the loader for the given regular expression.
     *
     * @param {string} regex - 正则表达式。A regular expression.
     * @return {LoadingManager} 对此加载管理器的引用。A reference to this loading manager.
     */
    this.removeHandler = function (regex) {
      // 查找正则表达式在处理器数组中的索引
      // Find index of regex in handlers array
      const index = handlers.indexOf(regex);

      // 如果找到了
      // If found
      if (index !== -1) {
        // 从处理器数组中移除正则表达式和对应的加载器
        // Remove regex and corresponding loader from handlers array
        handlers.splice(index, 2);
      }

      // 返回当前实例以支持链式调用
      // Return current instance for method chaining
      return this;
    };

    /**
     * 可用于检索给定文件路径的已注册加载器。
     * Can be used to retrieve the registered loader for the given file path.
     *
     * @param {string} file - 文件路径。The file path.
     * @return {?Loader} 已注册的加载器。如果没有找到加载器则返回`null`。The registered loader. Returns `null` if no loader was found.
     */
    this.getHandler = function (file) {
      // 遍历处理器数组，每次跳过2个元素（正则表达式和加载器成对出现）
      // Iterate through handlers array, skipping 2 elements each time (regex and loader appear in pairs)
      for (let i = 0, l = handlers.length; i < l; i += 2) {
        // 获取正则表达式
        // Get regex
        const regex = handlers[i];
        // 获取对应的加载器
        // Get corresponding loader
        const loader = handlers[i + 1];

        // 如果正则表达式是全局的，重置lastIndex（参见#17920）
        // If regex is global, reset lastIndex (see #17920)
        if (regex.global) regex.lastIndex = 0;

        // 如果正则表达式匹配文件路径
        // If regex matches file path
        if (regex.test(file)) {
          // 返回对应的加载器
          // Return corresponding loader
          return loader;
        }
      }

      // 没有找到匹配的加载器，返回null
      // No matching loader found, return null
      return null;
    };

    /**
     * 可用于中止使用此管理器的加载器中正在进行的加载请求。
     * 中止功能仅在加载器实现{@link Loader#abort}且浏览器支持`AbortSignal.any()`时有效。
     * Can be used to abort ongoing loading requests in loaders using this manager.
     * The abort only works if the loaders implement {@link Loader#abort} and `AbortSignal.any()`
     * is supported in the browser.
     *
     * @return {LoadingManager} 对此加载管理器的引用。A reference to this loading manager.
     */
    this.abort = function () {
      // 中止当前的AbortController
      // Abort current AbortController
      this.abortController.abort();
      // 创建新的AbortController
      // Create new AbortController
      this.abortController = new AbortController();

      // 返回当前实例以支持链式调用
      // Return current instance for method chaining
      return this;
    };
  }
}

/**
 * 全局默认加载管理器。
 * The global default loading manager.
 *
 * @constant
 * @type {LoadingManager}
 */
const DefaultLoadingManager = /*@__PURE__*/ new LoadingManager();

// 导出DefaultLoadingManager和LoadingManager类
// Export DefaultLoadingManager and LoadingManager class
export { DefaultLoadingManager, LoadingManager };
