// 导入缓存模块，用于文件缓存功能
import { Cache } from "./Cache.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

// 全局加载状态对象，用于跟踪正在进行的加载请求
const loading = {};

// HTTP错误类，继承自Error，用于处理HTTP请求错误
class HttpError extends Error {
  // 构造函数，接收错误消息和响应对象
  constructor(message, response) {
    // 调用父类构造函数，传入错误消息
    super(message);
    // 存储响应对象
    this.response = response;
  }
}

/**
 * 使用Fetch API加载资源的低级类，被大多数加载器内部使用。
 * 也可以直接用于加载任何没有专用加载器的文件类型。
 * A low level class for loading resources with the Fetch API, used internally by
 * most loaders. It can also be used directly to load any file type that does
 * not have a loader.
 *
 * 此加载器支持缓存。如果要使用它，请在应用程序中添加 `THREE.Cache.enabled = true;`。
 * This loader supports caching. If you want to use it, add `THREE.Cache.enabled = true;`
 * once to your application.
 *
 * ```js
 * const loader = new THREE.FileLoader();
 * const data = await loader.loadAsync( 'example.txt' );
 * ```
 *
 * @augments Loader
 */
class FileLoader extends Loader {
  /**
   * 构造一个新的文件加载器。
   * Constructs a new file loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);

    /**
     * 期望的MIME类型。有效值可以在
     * [这里]{@link hhttps://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#mimetype} 找到
     * The expected mime type. Valid values can be found
     * [here]{@link hhttps://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString#mimetype}
     *
     * @type {string}
     */
    this.mimeType = ""; // MIME类型，默认为空字符串

    /**
     * 期望的响应类型。
     * The expected response type.
     *
     * @type {('arraybuffer'|'blob'|'document'|'json'|'')}
     * @default ''
     */
    this.responseType = ""; // 响应类型，默认为空字符串

    /**
     * 用于中止请求。
     * Used for aborting requests.
     *
     * @private
     * @type {AbortController}
     */
    this._abortController = new AbortController(); // 中止控制器，用于取消请求
  }

  /**
   * 从给定的URL开始加载，并将加载的响应传递给 `onLoad()` 回调函数。
   * Starts loading from the given URL and pass the loaded response to the `onLoad()` callback.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(any)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} [onProgress] - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} [onError] - 发生错误时执行的错误回调函数。Executed when errors occur.
   * @return {any|undefined} 如果可用，返回缓存的资源。The cached resource if available.
   */
  load(url, onLoad, onProgress, onError) {
    // 如果URL未定义，设置为空字符串
    if (url === undefined) url = "";

    // 如果设置了路径，将路径与URL拼接
    if (this.path !== undefined) url = this.path + url;

    // 通过管理器解析URL
    url = this.manager.resolveURL(url);

    // 尝试从缓存中获取文件
    const cached = Cache.get(`file:${url}`);

    // 如果缓存中存在该文件
    if (cached !== undefined) {
      // 通知管理器开始加载项目
      this.manager.itemStart(url);

      // 异步调用onLoad回调，传入缓存的数据
      setTimeout(() => {
        // 如果提供了加载完成回调，则调用它
        if (onLoad) onLoad(cached);

        // 通知管理器项目加载完成
        this.manager.itemEnd(url);
      }, 0);

      // 返回缓存的数据
      return cached;
    }

    // 检查请求是否重复
    // Check if request is duplicate

    // 如果该URL已经在加载中
    if (loading[url] !== undefined) {
      // 将回调函数添加到现有请求的回调列表中
      loading[url].push({
        onLoad: onLoad, // 加载完成回调
        onProgress: onProgress, // 进度回调
        onError: onError, // 错误回调
      });

      // 直接返回，不发起新的请求
      return;
    }

    // 为重复请求初始化数组
    // Initialise array for duplicate requests
    loading[url] = [];

    // 将当前请求的回调函数添加到数组中
    loading[url].push({
      onLoad: onLoad, // 加载完成回调
      onProgress: onProgress, // 进度回调
      onError: onError, // 错误回调
    });

    // 创建请求对象
    // create request
    const req = new Request(url, {
      headers: new Headers(this.requestHeader), // 设置请求头
      credentials: this.withCredentials ? "include" : "same-origin", // 设置凭证模式
      signal: typeof AbortSignal.any === "function" ? AbortSignal.any([this._abortController.signal, this.manager.abortController.signal]) : this._abortController.signal, // 设置中止信号
    });

    // 记录状态（避免数据竞争）
    // record states ( avoid data race )
    const mimeType = this.mimeType; // 保存MIME类型
    const responseType = this.responseType; // 保存响应类型

    // 开始fetch请求
    // start the fetch
    fetch(req)
      .then((response) => {
        // 如果响应状态为200（成功）或0（本地文件）
        if (response.status === 200 || response.status === 0) {
          // 某些浏览器在使用非HTTP协议时返回HTTP状态0
          // 例如 'file://' 或 'data://'。作为成功处理。
          // Some browsers return HTTP Status 0 when using non-http protocol
          // e.g. 'file://' or 'data://'. Handle as success.

          // 如果状态为0，输出警告
          if (response.status === 0) {
            console.warn("THREE.FileLoader: HTTP Status 0 received.");
          }

          // 解决方案：检查支付宝浏览器的response.body === undefined问题 #23548
          // Workaround: Checking if response.body === undefined for Alipay browser #23548

          // 如果不支持ReadableStream或响应体未定义或没有getReader方法
          if (typeof ReadableStream === "undefined" || response.body === undefined || response.body.getReader === undefined) {
            // 直接返回响应
            return response;
          }

          // 获取该URL的所有回调函数
          const callbacks = loading[url];
          // 获取响应体的读取器
          const reader = response.body.getReader();

          // Nginx需要X-File-Size检查
          // https://serverfault.com/questions/482875/why-does-nginx-remove-content-length-header-for-chunked-content
          // 获取内容长度，优先使用X-File-Size，其次使用Content-Length
          const contentLength = response.headers.get("X-File-Size") || response.headers.get("Content-Length");
          // 解析总大小
          const total = contentLength ? parseInt(contentLength) : 0;
          // 判断长度是否可计算
          const lengthComputable = total !== 0;
          // 已加载的字节数
          let loaded = 0;

          // 定期将数据读取到新流中，同时跟踪下载进度
          // periodically read data into the new stream tracking while download progress
          const stream = new ReadableStream({
            // 流开始时的回调函数
            start(controller) {
              // 开始读取数据
              readData();

              // 定义读取数据的内部函数
              function readData() {
                // 从读取器中读取数据
                reader.read().then(
                  ({ done, value }) => {
                    // 如果读取完成
                    if (done) {
                      // 关闭控制器
                      controller.close();
                    } else {
                      // 累加已加载的字节数
                      loaded += value.byteLength;

                      // 创建进度事件
                      const event = new ProgressEvent("progress", { lengthComputable, loaded, total });
                      // 遍历所有回调函数，调用进度回调
                      for (let i = 0, il = callbacks.length; i < il; i++) {
                        const callback = callbacks[i];
                        // 如果存在进度回调，则调用它
                        if (callback.onProgress) callback.onProgress(event);
                      }

                      // 将数据块加入队列
                      controller.enqueue(value);
                      // 递归读取下一块数据
                      readData();
                    }
                  },
                  (e) => {
                    // 如果读取出错，设置控制器错误
                    controller.error(e);
                  }
                );
              }
            },
          });

          // 返回包装了流的新响应对象
          return new Response(stream);
        } else {
          // 如果响应状态不是成功状态，抛出HTTP错误
          throw new HttpError(`fetch for "${response.url}" responded with ${response.status}: ${response.statusText}`, response);
        }
      })
      // 处理响应数据，根据响应类型进行不同的处理
      .then((response) => {
        // 根据响应类型进行分支处理
        switch (responseType) {
          // 数组缓冲区类型
          case "arraybuffer":
            // 返回数组缓冲区
            return response.arrayBuffer();

          // Blob类型
          case "blob":
            // 返回Blob对象
            return response.blob();

          // 文档类型
          case "document":
            // 先获取文本，然后解析为文档
            return response.text().then((text) => {
              // 创建DOM解析器
              const parser = new DOMParser();
              // 使用指定的MIME类型解析文本为文档
              return parser.parseFromString(text, mimeType);
            });

          // JSON类型
          case "json":
            // 返回JSON对象
            return response.json();

          // 默认情况（文本类型）
          default:
            // 如果MIME类型为空
            if (mimeType === "") {
              // 直接返回文本
              return response.text();
            } else {
              // 嗅探编码
              // sniff encoding
              const re = /charset="?([^;"\s]*)"?/i;
              const exec = re.exec(mimeType);
              const label = exec && exec[1] ? exec[1].toLowerCase() : undefined;
              // 创建文本解码器
              const decoder = new TextDecoder(label);
              // 获取数组缓冲区并解码为文本
              return response.arrayBuffer().then((ab) => decoder.decode(ab));
            }
        }
      })
      // 处理成功加载的数据
      .then((data) => {
        // 仅在HTTP成功时添加到缓存，这样我们就不会将错误响应体作为正确响应缓存
        // Add to cache only on HTTP success, so that we do not cache
        // error response bodies as proper responses to requests.
        Cache.add(`file:${url}`, data);

        // 获取该URL的所有回调函数
        const callbacks = loading[url];
        // 从加载状态中删除该URL
        delete loading[url];

        // 遍历所有回调函数，调用加载完成回调
        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i];
          // 如果存在加载完成回调，则调用它
          if (callback.onLoad) callback.onLoad(data);
        }
      })
      // 处理错误情况
      .catch((err) => {
        // 中止错误和其他错误的处理方式相同
        // Abort errors and other errors are handled the same

        // 获取该URL的所有回调函数
        const callbacks = loading[url];

        // 如果回调函数未定义（可能在onLoad调用后URL被删除）
        if (callbacks === undefined) {
          // 通知管理器项目加载出错
          // When onLoad was called and url was deleted in `loading`
          this.manager.itemError(url);
          // 重新抛出错误
          throw err;
        }

        // 从加载状态中删除该URL
        delete loading[url];

        // 遍历所有回调函数，调用错误回调
        for (let i = 0, il = callbacks.length; i < il; i++) {
          const callback = callbacks[i];
          // 如果存在错误回调，则调用它
          if (callback.onError) callback.onError(err);
        }

        // 通知管理器项目加载出错
        this.manager.itemError(url);
      })
      // 无论成功还是失败都会执行的清理操作
      .finally(() => {
        // 通知管理器项目加载结束
        this.manager.itemEnd(url);
      });

    // 通知管理器开始加载项目
    this.manager.itemStart(url);
  }

  /**
   * 设置期望的响应类型。
   * Sets the expected response type.
   *
   * @param {('arraybuffer'|'blob'|'document'|'json'|'')} value - 响应类型。The response type.
   * @return {FileLoader} 对此文件加载器的引用。A reference to this file loader.
   */
  setResponseType(value) {
    // 设置响应类型
    this.responseType = value;
    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 设置加载文件的期望MIME类型。
   * Sets the expected mime type of the loaded file.
   *
   * @param {string} value - MIME类型。The mime type.
   * @return {FileLoader} 对此文件加载器的引用。A reference to this file loader.
   */
  setMimeType(value) {
    // 设置MIME类型
    this.mimeType = value;
    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 中止正在进行的fetch请求。
   * Aborts ongoing fetch requests.
   *
   * @return {FileLoader} 对此实例的引用。A reference to this instance.
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

// 导出FileLoader类供其他模块使用
export { FileLoader };
