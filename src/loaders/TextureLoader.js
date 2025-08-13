// 导入ImageLoader类用于内部图像加载
// Import ImageLoader class for internal image loading
import { ImageLoader } from "./ImageLoader.js";
// 导入Texture类用于创建纹理对象
// Import Texture class for creating texture objects
import { Texture } from "../textures/Texture.js";
// 导入Loader基类
// Import Loader base class
import { Loader } from "./Loader.js";

/**
 * 用于加载纹理的类。图像通过{@link ImageLoader}在内部加载。
 * Class for loading textures. Images are internally
 * loaded via {@link ImageLoader}.
 *
 * ```js
 * const loader = new THREE.TextureLoader();
 * const texture = await loader.loadAsync( 'textures/land_ocean_ice_cloud_2048.jpg' );
 *
 * const material = new THREE.MeshBasicMaterial( { map:texture } );
 * ```
 * 请注意，`TextureLoader`在r84版本中已经放弃了对进度事件的支持。
 * 如需支持进度事件的`TextureLoader`，请参见[此讨论]{@link https://github.com/mrdoob/three.js/issues/10439#issuecomment-293260145}。
 * Please note that `TextureLoader` has dropped support for progress
 * events in `r84`. For a `TextureLoader` that supports progress events, see
 * [this thread]{@link https://github.com/mrdoob/three.js/issues/10439#issuecomment-293260145}.
 *
 * @augments Loader
 */
class TextureLoader extends Loader {
  /**
   * 构造一个新的纹理加载器。
   * Constructs a new texture loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数
    // Call parent class constructor
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将完全加载的纹理传递给`onLoad()`回调函数。
   * 该方法还返回一个新的纹理对象，可以直接用于材质创建。
   * 如果这样做，纹理可能会在相应的加载过程完成后出现在场景中。
   * Starts loading from the given URL and pass the fully loaded texture
   * to the `onLoad()` callback. The method also returns a new texture object which can
   * directly be used for material creation. If you do it this way, the texture
   * may pop up in your scene once the respective loading process is finished.
   *
   * @param {string} url - 要加载的文件的路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(Texture)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 此加载器不支持进度回调。Unsupported in this loader.
   * @param {onErrorCallback} onError - 发生错误时执行的回调函数。Executed when errors occur.
   * @return {Texture} 纹理对象。The texture.
   */
  load(url, onLoad, onProgress, onError) {
    // 创建一个新的纹理对象
    // Create a new texture object
    const texture = new Texture();

    // 创建图像加载器实例，使用当前的管理器
    // Create image loader instance with current manager
    const loader = new ImageLoader(this.manager);
    // 设置跨域属性
    // Set cross-origin property
    loader.setCrossOrigin(this.crossOrigin);
    // 设置路径
    // Set path
    loader.setPath(this.path);

    // 使用图像加载器加载图像
    // Load image using image loader
    loader.load(
      url,
      function (image) {
        // 将加载的图像设置为纹理的图像
        // Set loaded image as texture's image
        texture.image = image;
        // 标记纹理需要更新
        // Mark texture as needing update
        texture.needsUpdate = true;

        // 如果提供了onLoad回调函数
        // If onLoad callback is provided
        if (onLoad !== undefined) {
          // 调用onLoad回调函数，传入纹理对象
          // Call onLoad callback with texture object
          onLoad(texture);
        }
      },
      onProgress,
      onError
    );

    // 返回纹理对象（此时可能还在加载中）
    // Return texture object (may still be loading)
    return texture;
  }
}

// 导出TextureLoader类
// Export TextureLoader class
export { TextureLoader };
