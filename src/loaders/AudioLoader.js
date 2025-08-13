// 导入音频上下文类，用于管理Web Audio API的音频上下文
import { AudioContext } from "../audio/AudioContext.js";
// 导入文件加载器类，用于处理文件的异步加载
import { FileLoader } from "./FileLoader.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

/**
 * 用于加载音频缓冲区的类。音频文件内部通过 {@link FileLoader} 进行加载。
 * Class for loading audio buffers. Audios are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const audioListener = new THREE.AudioListener();
 * const ambientSound = new THREE.Audio( audioListener );
 *
 * const loader = new THREE.AudioLoader();
 * const audioBuffer = await loader.loadAsync( 'audio/ambient_ocean.ogg' );
 *
 * ambientSound.setBuffer( audioBuffer );
 * ambientSound.play();
 * ```
 *
 * @augments Loader
 */
class AudioLoader extends Loader {
  /**
   * 构造一个新的音频加载器。
   * Constructs a new audio loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的音频缓冲区传递给 `onLoad()` 回调函数。
   * Starts loading from the given URL and passes the loaded audio buffer
   * to the `onLoad()` callback.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(AudioBuffer)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 创建文件加载器实例，传入加载管理器
    const loader = new FileLoader(this.manager);
    // 设置响应类型为数组缓冲区，用于处理二进制音频数据
    loader.setResponseType("arraybuffer");
    // 设置文件加载路径
    loader.setPath(this.path);
    // 设置请求头信息
    loader.setRequestHeader(this.requestHeader);
    // 设置是否携带凭证信息
    loader.setWithCredentials(this.withCredentials);
    // 开始加载文件，传入URL和回调函数
    loader.load(
      url,
      function (buffer) {
        // 使用try-catch捕获音频解码过程中可能出现的异常
        try {
          // 创建缓冲区的副本。`decodeAudioData` 方法在完成时会分离缓冲区，防止重复使用。
          // Create a copy of the buffer. The `decodeAudioData` method
          // detaches the buffer when complete, preventing reuse.
          const bufferCopy = buffer.slice(0);

          // 获取音频上下文实例
          const context = AudioContext.getContext();
          // 解码音频数据，将原始音频数据转换为AudioBuffer对象
          context
            .decodeAudioData(bufferCopy, function (audioBuffer) {
              // 解码成功，调用onLoad回调函数，传入音频缓冲区
              onLoad(audioBuffer);
            })
            .catch(handleError);
        } catch (e) {
          // 捕获异常并调用错误处理函数
          handleError(e);
        }
      },
      onProgress,
      onError
    );

    // 定义错误处理函数
    function handleError(e) {
      // 如果提供了错误回调函数
      if (onError) {
        // 调用错误回调函数，传入异常对象
        onError(e);
      } else {
        // 否则在控制台输出错误信息
        console.error(e);
      }

      // 通知加载管理器该项目加载失败
      scope.manager.itemError(url);
    }
  }
}

// 导出AudioLoader类供其他模块使用
export { AudioLoader };
