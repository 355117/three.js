// 导入图像加载器类，用于加载图像文件
import { ImageLoader } from "./ImageLoader.js";
// 导入立方体纹理类，用于创建立方体纹理对象
import { CubeTexture } from "../textures/CubeTexture.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";
// 导入sRGB颜色空间常量，用于设置纹理颜色空间
import { SRGBColorSpace } from "../constants.js";

/**
 * 用于加载立方体纹理的类。图像内部通过 {@link ImageLoader} 进行加载。
 * Class for loading cube textures. Images are internally loaded via {@link ImageLoader}.
 *
 * 加载器返回一个 {@link CubeTexture} 实例，并期望立方体贴图定义为代表立方体各面的六个独立图像。
 * 不支持其他立方体贴图定义，如垂直和水平十字、列和行布局。
 * The loader returns an instance of {@link CubeTexture} and expects the cube map to
 * be defined as six separate images representing the sides of a cube. Other cube map definitions
 * like vertical and horizontal cross, column and row layouts are not supported.
 *
 * 请注意，按照惯例，立方体贴图在坐标系统中指定，其中正x轴在查看正z轴时指向右侧——
 * 换句话说，使用左手坐标系统。由于three.js使用右手坐标系统，
 * 在three.js中使用的环境贴图将交换正x和负x。
 * Note that, by convention, cube maps are specified in a coordinate system
 * in which positive-x is to the right when looking up the positive-z axis --
 * in other words, using a left-handed coordinate system. Since three.js uses
 * a right-handed coordinate system, environment maps used in three.js will
 * have pos-x and neg-x swapped.
 *
 * 加载的立方体纹理处于sRGB颜色空间中。意味着 {@link Texture#colorSpace} 默认设置为 `SRGBColorSpace`。
 * The loaded cube texture is in sRGB color space. Meaning {@link Texture#colorSpace}
 * is set to `SRGBColorSpace` by default.
 *
 * ```js
 * const loader = new THREE.CubeTextureLoader().setPath( 'textures/cubeMaps/' );
 * const cubeTexture = await loader.loadAsync( [
 * 	'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'
 * ] );
 * scene.background = cubeTexture;
 * ```
 *
 * @augments Loader
 */
class CubeTextureLoader extends Loader {
  /**
   * 构造一个新的立方体纹理加载器。
   * Constructs a new cube texture loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将完全加载的立方体纹理传递给 `onLoad()` 回调函数。
   * 该方法还返回一个新的立方体纹理对象，可以直接用于材质创建。
   * 如果这样做，立方体纹理可能会在相应的加载过程完成后出现在场景中。
   * Starts loading from the given URL and pass the fully loaded cube texture
   * to the `onLoad()` callback. The method also returns a new cube texture object which can
   * directly be used for material creation. If you do it this way, the cube texture
   * may pop up in your scene once the respective loading process is finished.
   *
   * @param {Array<string>} urls - 包含6个图像URL的数组，立方体纹理的每一面对应一个。
   * URL应按以下顺序指定：正x、负x、正y、负y、正z、负z。也允许数据URI数组。
   * Array of 6 URLs to images, one for each side of the cube texture. The urls should be specified in the following order: pos-x, neg-x, pos-y, neg-y, pos-z, neg-z. An array of data URIs are allowed as well.
   * @param {function(CubeTexture)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 此加载器不支持进度回调。Unsupported in this loader.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   * @return {CubeTexture} 立方体纹理对象。The cube texture.
   */
  load(urls, onLoad, onProgress, onError) {
    // 创建立方体纹理实例
    const texture = new CubeTexture();
    // 设置纹理颜色空间为sRGB
    texture.colorSpace = SRGBColorSpace;

    // 创建图像加载器实例，传入加载管理器
    const loader = new ImageLoader(this.manager);
    // 设置跨域属性
    loader.setCrossOrigin(this.crossOrigin);
    // 设置文件加载路径
    loader.setPath(this.path);

    // 记录已加载的图像数量
    let loaded = 0;

    // 定义加载单个纹理的内部函数
    function loadTexture(i) {
      // 加载指定索引的URL对应的图像
      loader.load(
        urls[i],
        function (image) {
          // 将加载的图像存储到纹理的对应位置
          texture.images[i] = image;

          // 增加已加载计数
          loaded++;

          // 如果所有6个面都已加载完成
          if (loaded === 6) {
            // 标记纹理需要更新
            texture.needsUpdate = true;

            // 如果提供了加载完成回调，则调用它
            if (onLoad) onLoad(texture);
          }
        },
        undefined,
        onError
      );
    }

    // 遍历所有URL，加载每个图像
    for (let i = 0; i < urls.length; ++i) {
      // 加载第i个纹理
      loadTexture(i);
    }

    // 返回创建的立方体纹理对象
    return texture;
  }
}

// 导出CubeTextureLoader类供其他模块使用
export { CubeTextureLoader };
