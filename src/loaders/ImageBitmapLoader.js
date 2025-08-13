// 导入缓存模块，用于图像缓存功能
import { Cache } from "./Cache.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

// 用于存储Promise错误的WeakMap，避免内存泄漏
const _errorMap = new WeakMap();

/**
 * 用于将图像加载为 [ImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap} 的加载器。
 * `ImageBitmap` 提供了一种异步且资源高效的方式来为渲染准备纹理。
 * A loader for loading images as an [ImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap}.
 * An `ImageBitmap` provides an asynchronous and resource efficient pathway to prepare
 * textures for rendering.
 *
 * 请注意，{@link Texture#flipY} 和 {@link Texture#premultiplyAlpha} 在图像位图中被忽略。
 * 它们需要在位图创建时进行配置，而不像常规图像需要在上传到GPU时配置。
 * Note that {@link Texture#flipY} and {@link Texture#premultiplyAlpha} are ignored with image bitmaps.
 * They needs these configuration on bitmap creation unlike regular images need them on uploading to GPU.
 *
 * 您需要通过 {@link ImageBitmapLoader#setOptions} 设置等效选项。
 * You need to set the equivalent options via {@link ImageBitmapLoader#setOptions} instead.
 *
 * 另请注意，与 {@link FileLoader} 不同，此加载器仅在启用 `Cache` 时才避免对同一URL的多个并发请求。
 * Also note that unlike {@link FileLoader}, this loader avoids multiple concurrent requests to the same URL only if `Cache` is enabled.
 *
 * ```js
 * const loader = new THREE.ImageBitmapLoader();
 * loader.setOptions( { imageOrientation: 'flipY' } ); // set options if needed
 * const imageBitmap = await loader.loadAsync( 'image.png' );
 *
 * const texture = new THREE.Texture( imageBitmap );
 * texture.needsUpdate = true;
 * ```
 *
 * @augments Loader
 */
class ImageBitmapLoader extends Loader {
  /**
   * 构造一个新的图像位图加载器。
   * Constructs a new image bitmap loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);

    /**
     * 此标志可用于类型测试。
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isImageBitmapLoader = true; // 标识此实例为ImageBitmapLoader类型

    // 检查浏览器是否支持createImageBitmap API
    if (typeof createImageBitmap === "undefined") {
      // 如果不支持，输出警告信息
      console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported.");
    }

    // 检查浏览器是否支持fetch API
    if (typeof fetch === "undefined") {
      // 如果不支持，输出警告信息
      console.warn("THREE.ImageBitmapLoader: fetch() not supported.");
    }

    /**
     * 表示加载器选项。
     * Represents the loader options.
     *
     * @type {Object}
     * @default {premultiplyAlpha:'none'}
     */
    this.options = { premultiplyAlpha: "none" }; // 默认选项，不进行预乘alpha

    /**
     * 用于中止请求。
     * Used for aborting requests.
     *
     * @private
     * @type {AbortController}
     */
    this._abortController = new AbortController(); // 创建中止控制器
  }

  /**
   * 设置给定的加载器选项。对象的结构必须与
   * [createImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap} 的 `options` 参数匹配。
   * Sets the given loader options. The structure of the object must match the `options` parameter of
   * [createImageBitmap]{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap}.
   *
   * @param {Object} options - 要设置的加载器选项。The loader options to set.
   * @return {ImageBitmapLoader} 对此图像位图加载器的引用。A reference to this image bitmap loader.
   */
  setOptions(options) {
    // 设置选项对象
    this.options = options;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 从给定的URL开始加载，并将加载的图像位图传递给 `onLoad()` 回调函数。
   * Starts loading from the given URL and pass the loaded image bitmap to the `onLoad()` callback.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(ImageBitmap)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 此加载器不支持进度回调。Unsupported in this loader.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   * @return {ImageBitmap|undefined} 图像位图对象。The image bitmap.
   */
  load(url, onLoad, onProgress, onError) {
    // 如果URL未定义，设置为空字符串
    if (url === undefined) url = "";

    // 如果设置了路径，将路径与URL拼接
    if (this.path !== undefined) url = this.path + url;

    // 通过管理器解析URL
    url = this.manager.resolveURL(url);

    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 尝试从缓存中获取图像位图
    const cached = Cache.get(`image-bitmap:${url}`);

    // 如果缓存中存在该图像
    if (cached !== undefined) {
      // 通知管理器开始加载项目
      scope.manager.itemStart(url);

      // 如果缓存是一个Promise，等待它解析
      // If cached is a promise, wait for it to resolve
      if (cached.then) {
        // 等待Promise解析
        cached.then((imageBitmap) => {
          // 检查缓存的Promise是否有错误
          // check if there is an error for the cached promise

          // 如果错误映射中存在该Promise的错误
          if (_errorMap.has(cached) === true) {
            // 如果提供了错误回调，则调用它
            if (onError) onError(_errorMap.get(cached));

            // 通知管理器项目加载出错
            scope.manager.itemError(url);
            // 通知管理器项目加载结束
            scope.manager.itemEnd(url);
          } else {
            // 如果没有错误，调用加载完成回调
            if (onLoad) onLoad(imageBitmap);

            // 通知管理器项目加载完成
            scope.manager.itemEnd(url);

            // 返回图像位图
            return imageBitmap;
          }
        });

        // 直接返回，不继续执行后续代码
        return;
      }

      // 如果缓存不是Promise（即已经是imageBitmap）
      // If cached is not a promise (i.e., it's already an imageBitmap)
      setTimeout(function () {
        // 如果提供了加载完成回调，则调用它
        if (onLoad) onLoad(cached);

        // 通知管理器项目加载完成
        scope.manager.itemEnd(url);
      }, 0);

      // 返回缓存的图像位图
      return cached;
    }

    // 创建fetch选项对象
    const fetchOptions = {};
    // 根据跨域设置配置凭证模式
    fetchOptions.credentials = this.crossOrigin === "anonymous" ? "same-origin" : "include";
    // 设置请求头
    fetchOptions.headers = this.requestHeader;
    // 设置中止信号，支持多个信号的组合
    fetchOptions.signal =
      typeof AbortSignal.any === "function" ? AbortSignal.any([this._abortController.signal, this.manager.abortController.signal]) : this._abortController.signal;

    // 创建fetch Promise链
    const promise = fetch(url, fetchOptions)
      .then(function (res) {
        // 将响应转换为Blob对象
        return res.blob();
      })
      .then(function (blob) {
        // 使用createImageBitmap创建图像位图，合并选项并禁用颜色空间转换
        return createImageBitmap(blob, Object.assign(scope.options, { colorSpaceConversion: "none" }));
      })
      .then(function (imageBitmap) {
        // 将图像位图添加到缓存中
        Cache.add(`image-bitmap:${url}`, imageBitmap);

        // 如果提供了加载完成回调，则调用它
        if (onLoad) onLoad(imageBitmap);

        // 通知管理器项目加载完成
        scope.manager.itemEnd(url);

        // 返回图像位图
        return imageBitmap;
      })
      .catch(function (e) {
        // 如果提供了错误回调，则调用它
        if (onError) onError(e);

        // 将错误存储到错误映射中
        _errorMap.set(promise, e);

        // 从缓存中移除失败的条目
        Cache.remove(`image-bitmap:${url}`);

        // 通知管理器项目加载出错
        scope.manager.itemError(url);
        // 通知管理器项目加载结束
        scope.manager.itemEnd(url);
      });

    // 将Promise添加到缓存中（在解析之前）
    Cache.add(`image-bitmap:${url}`, promise);
    // 通知管理器开始加载项目
    scope.manager.itemStart(url);
  }

  /**
   * 中止正在进行的fetch请求。
   * Aborts ongoing fetch requests.
   *
   * @return {ImageBitmapLoader} 对此实例的引用。A reference to this instance.
   */
  abort() {
    // 中止当前的请求
    this._abortController.abort();
    // 创建新的中止控制器以供后续请求使用
    this._abortController = new AbortController();

    // 返回当前实例以支持链式调用
    return this;
  }
}

// 导出ImageBitmapLoader类供其他模块使用
export { ImageBitmapLoader };
