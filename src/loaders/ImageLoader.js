// 导入缓存模块用于图像缓存
// Import Cache module for image caching
import { Cache } from "./Cache.js";
// 导入Loader基类
// Import Loader base class
import { Loader } from "./Loader.js";
// 导入创建元素的工具函数
// Import utility function for creating elements
import { createElementNS } from "../utils.js";

// 用于跟踪正在加载的图像的WeakMap
// WeakMap for tracking loading images
const _loading = new WeakMap();

/**
 * 用于加载图像的加载器。该类使用HTML `Image` API加载图像。
 * A loader for loading images. The class loads images with the HTML `Image` API.
 *
 * ```js
 * const loader = new THREE.ImageLoader();
 * const image = await loader.loadAsync( 'image.png' );
 * ```
 * 请注意，`ImageLoader`在r84版本中已经放弃了对进度事件的支持。
 * 如需支持进度事件的`ImageLoader`，请参见[此讨论]{@link https://github.com/mrdoob/three.js/issues/10439#issuecomment-275785639}。
 * Please note that `ImageLoader` has dropped support for progress
 * events in `r84`. For an `ImageLoader` that supports progress events, see
 * [this thread]{@link https://github.com/mrdoob/three.js/issues/10439#issuecomment-275785639}.
 *
 * @augments Loader
 */
class ImageLoader extends Loader {
  /**
   * 构造一个新的图像加载器。
   * Constructs a new image loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数
    // Call parent class constructor
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的图像传递给`onLoad()`回调函数。
   * 该方法还返回一个新的`Image`对象，可以直接用于纹理创建。
   * 如果这样做，纹理可能会在相应的加载过程完成后出现在场景中。
   * Starts loading from the given URL and passes the loaded image
   * to the `onLoad()` callback. The method also returns a new `Image` object which can
   * directly be used for texture creation. If you do it this way, the texture
   * may pop up in your scene once the respective loading process is finished.
   *
   * @param {string} url - 要加载的文件的路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Image)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 此加载器不支持进度回调。Unsupported in this loader.
   * @param {onErrorCallback} onError - 发生错误时执行的回调函数。Executed when errors occur.
   * @return {Image} 图像对象。The image.
   */
  load(url, onLoad, onProgress, onError) {
    // 如果设置了路径，则将路径添加到URL前面
    // If path is set, prepend it to the URL
    if (this.path !== undefined) url = this.path + url;

    // 通过管理器解析URL
    // Resolve URL through manager
    url = this.manager.resolveURL(url);

    // 保存当前作用域的引用
    // Save reference to current scope
    const scope = this;

    // 尝试从缓存中获取图像
    // Try to get image from cache
    const cached = Cache.get(`image:${url}`);

    // 如果缓存中存在该图像
    // If image exists in cache
    if (cached !== undefined) {
      // 如果图像已经完全加载
      // If image is completely loaded
      if (cached.complete === true) {
        // 通知管理器开始处理项目
        // Notify manager that item processing started
        scope.manager.itemStart(url);

        // 异步调用onLoad回调
        // Asynchronously call onLoad callback
        setTimeout(function () {
          // 如果提供了onLoad回调函数，则调用它
          // If onLoad callback is provided, call it
          if (onLoad) onLoad(cached);

          // 通知管理器项目处理结束
          // Notify manager that item processing ended
          scope.manager.itemEnd(url);
        }, 0);
      } else {
        // 图像还在加载中，获取等待回调的数组
        // Image is still loading, get array of waiting callbacks
        let arr = _loading.get(cached);

        // 如果数组不存在，创建一个新数组
        // If array doesn't exist, create a new one
        if (arr === undefined) {
          arr = [];
          _loading.set(cached, arr);
        }

        // 将当前的回调函数添加到等待数组中
        // Add current callbacks to waiting array
        arr.push({ onLoad, onError });
      }

      // 返回缓存的图像
      // Return cached image
      return cached;
    }

    // 创建新的图像元素
    // Create new image element
    const image = createElementNS("img");

    // 图像加载成功的处理函数
    // Image load success handler function
    function onImageLoad() {
      // 移除事件监听器
      // Remove event listeners
      removeEventListeners();

      // 如果提供了onLoad回调函数，则调用它
      // If onLoad callback is provided, call it
      if (onLoad) onLoad(this);

      // 空行分隔符
      // Empty line separator
      //

      // 获取等待此图像加载的回调函数数组
      // Get array of callbacks waiting for this image to load
      const callbacks = _loading.get(this) || [];

      // 遍历所有等待的回调函数
      // Iterate through all waiting callbacks
      for (let i = 0; i < callbacks.length; i++) {
        // 获取当前回调对象
        // Get current callback object
        const callback = callbacks[i];
        // 如果存在onLoad回调，则调用它
        // If onLoad callback exists, call it
        if (callback.onLoad) callback.onLoad(this);
      }

      // 从加载映射中删除此图像
      // Delete this image from loading map
      _loading.delete(this);

      // 通知管理器项目处理结束
      // Notify manager that item processing ended
      scope.manager.itemEnd(url);
    }

    // 图像加载错误的处理函数
    // Image load error handler function
    function onImageError(event) {
      // 移除事件监听器
      // Remove event listeners
      removeEventListeners();

      // 如果提供了onError回调函数，则调用它
      // If onError callback is provided, call it
      if (onError) onError(event);

      // 从缓存中移除失败的图像
      // Remove failed image from cache
      Cache.remove(`image:${url}`);

      // 空行分隔符
      // Empty line separator
      //

      // 获取等待此图像加载的回调函数数组
      // Get array of callbacks waiting for this image to load
      const callbacks = _loading.get(this) || [];

      // 遍历所有等待的回调函数
      // Iterate through all waiting callbacks
      for (let i = 0; i < callbacks.length; i++) {
        // 获取当前回调对象
        // Get current callback object
        const callback = callbacks[i];
        // 如果存在onError回调，则调用它
        // If onError callback exists, call it
        if (callback.onError) callback.onError(event);
      }

      // 从加载映射中删除此图像
      // Delete this image from loading map
      _loading.delete(this);

      // 空行
      // Empty line

      // 通知管理器项目出错
      // Notify manager that item had an error
      scope.manager.itemError(url);
      // 通知管理器项目处理结束
      // Notify manager that item processing ended
      scope.manager.itemEnd(url);
    }

    // 移除事件监听器的函数
    // Function to remove event listeners
    function removeEventListeners() {
      // 移除加载事件监听器
      // Remove load event listener
      image.removeEventListener("load", onImageLoad, false);
      // 移除错误事件监听器
      // Remove error event listener
      image.removeEventListener("error", onImageError, false);
    }

    // 添加加载成功事件监听器
    // Add load success event listener
    image.addEventListener("load", onImageLoad, false);
    // 添加加载错误事件监听器
    // Add load error event listener
    image.addEventListener("error", onImageError, false);

    // 如果URL不是数据URI
    // If URL is not a data URI
    if (url.slice(0, 5) !== "data:") {
      // 如果设置了跨域属性，则应用到图像元素
      // If crossOrigin is set, apply it to image element
      if (this.crossOrigin !== undefined) image.crossOrigin = this.crossOrigin;
    }

    // 将图像添加到缓存中
    // Add image to cache
    Cache.add(`image:${url}`, image);
    // 通知管理器开始处理项目
    // Notify manager that item processing started
    scope.manager.itemStart(url);

    // 设置图像源，开始加载
    // Set image source to start loading
    image.src = url;

    // 返回图像对象（此时可能还在加载中）
    // Return image object (may still be loading)
    return image;
  }
}

// 导出ImageLoader类
// Export ImageLoader class
export { ImageLoader };
