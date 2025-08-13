// 导入动画剪辑类，用于创建和管理动画剪辑对象
import { AnimationClip } from "../animation/AnimationClip.js";
// 导入文件加载器类，用于处理文件的异步加载
import { FileLoader } from "./FileLoader.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

/**
 * 用于加载JSON格式动画剪辑的类。文件内部通过 {@link FileLoader} 进行加载。
 * Class for loading animation clips in the JSON format. The files are internally
 * loaded via {@link FileLoader}.
 *
 * ```js
 * const loader = new THREE.AnimationLoader();
 * const animations = await loader.loadAsync( 'animations/animation.js' );
 * ```
 *
 * @augments Loader
 */
class AnimationLoader extends Loader {
  /**
   * 构造一个新的动画加载器。
   * Constructs a new animation loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的动画作为包含 {@link AnimationClip} 实例的数组传递给 `onLoad()` 回调函数。
   * Starts loading from the given URL and pass the loaded animations as an array
   * holding instances of {@link AnimationClip} to the `onLoad()` callback.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Array<AnimationClip>)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 创建文件加载器实例，传入加载管理器
    const loader = new FileLoader(this.manager);
    // 设置文件加载路径
    loader.setPath(this.path);
    // 设置请求头信息
    loader.setRequestHeader(this.requestHeader);
    // 设置是否携带凭证信息
    loader.setWithCredentials(this.withCredentials);
    // 开始加载文件，传入URL和回调函数
    loader.load(
      url,
      function (text) {
        // 使用try-catch捕获解析过程中可能出现的异常
        try {
          // 将加载的文本解析为JSON，然后调用parse方法解析为动画剪辑数组，最后调用onLoad回调
          onLoad(scope.parse(JSON.parse(text)));
        } catch (e) {
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
      },
      onProgress,
      onError
    );
  }

  /**
   * 解析给定的JSON对象并返回动画剪辑数组。
   * Parses the given JSON object and returns an array of animation clips.
   *
   * @param {Object} json - 序列化的动画剪辑数据。The serialized animation clips.
   * @return {Array<AnimationClip>} 解析后的动画剪辑数组。The parsed animation clips.
   */
  parse(json) {
    // 创建空数组用于存储解析后的动画剪辑
    const animations = [];

    // 遍历JSON数组中的每个动画剪辑数据
    for (let i = 0; i < json.length; i++) {
      // 使用AnimationClip.parse方法解析单个动画剪辑数据
      const clip = AnimationClip.parse(json[i]);

      // 将解析后的动画剪辑添加到数组中
      animations.push(clip);
    }

    // 返回包含所有动画剪辑的数组
    return animations;
  }
}

// 导出AnimationLoader类供其他模块使用
export { AnimationLoader };
