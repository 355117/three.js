// 导入纹理过滤和包装常量
import { LinearFilter, LinearMipmapLinearFilter, ClampToEdgeWrapping } from "../constants.js";
// 导入文件加载器类，用于处理文件的异步加载
import { FileLoader } from "./FileLoader.js";
// 导入数据纹理类，用于创建数据纹理对象
import { DataTexture } from "../textures/DataTexture.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

/**
 * 用于加载二进制纹理格式（RGBE、EXR或TGA）的抽象基类。
 * 纹理内部通过 {@link FileLoader} 进行加载。
 * Abstract base class for loading binary texture formats RGBE, EXR or TGA.
 * Textures are internally loaded via {@link FileLoader}.
 *
 * 派生类必须实现 `parse()` 方法，该方法包含相应格式的解析逻辑。
 * Derived classes have to implement the `parse()` method which holds the parsing
 * for the respective format.
 *
 * @abstract
 * @augments Loader
 */
class DataTextureLoader extends Loader {
  /**
   * 构造一个新的数据纹理加载器。
   * Constructs a new data texture loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的数据纹理传递给 `onLoad()` 回调函数。
   * 该方法还返回一个新的纹理对象，可以直接用于材质创建。
   * 如果这样做，纹理可能会在相应的加载过程完成后出现在场景中。
   * Starts loading from the given URL and passes the loaded data texture
   * to the `onLoad()` callback. The method also returns a new texture object which can
   * directly be used for material creation. If you do it this way, the texture
   * may pop up in your scene once the respective loading process is finished.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(DataTexture)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   * @return {DataTexture} 数据纹理对象。The data texture.
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 创建数据纹理实例
    const texture = new DataTexture();

    // 创建文件加载器实例，传入加载管理器
    const loader = new FileLoader(this.manager);
    // 设置响应类型为数组缓冲区，用于处理二进制纹理数据
    loader.setResponseType("arraybuffer");
    // 设置请求头信息
    loader.setRequestHeader(this.requestHeader);
    // 设置文件加载路径
    loader.setPath(this.path);
    // 设置是否携带凭证信息
    loader.setWithCredentials(scope.withCredentials);
    // 开始加载文件
    loader.load(
      url,
      function (buffer) {
        // 声明纹理数据变量
        let texData;

        // 使用try-catch捕获解析过程中可能出现的异常
        try {
          // 调用parse方法解析缓冲区数据
          texData = scope.parse(buffer);
        } catch (error) {
          // 如果提供了错误回调函数
          if (onError !== undefined) {
            // 调用错误回调函数，传入异常对象
            onError(error);
          } else {
            // 否则在控制台输出错误信息并返回
            console.error(error);
            return;
          }
        }

        // 如果解析结果包含图像对象
        if (texData.image !== undefined) {
          // 直接设置纹理的图像
          texture.image = texData.image;
        } else if (texData.data !== undefined) {
          // 如果包含原始数据，设置图像的尺寸和数据
          texture.image.width = texData.width;
          texture.image.height = texData.height;
          texture.image.data = texData.data;
        }

        // 设置纹理的S轴包装方式，默认为边缘夹紧
        texture.wrapS = texData.wrapS !== undefined ? texData.wrapS : ClampToEdgeWrapping;
        // 设置纹理的T轴包装方式，默认为边缘夹紧
        texture.wrapT = texData.wrapT !== undefined ? texData.wrapT : ClampToEdgeWrapping;

        // 设置纹理的放大过滤方式，默认为线性过滤
        texture.magFilter = texData.magFilter !== undefined ? texData.magFilter : LinearFilter;
        // 设置纹理的缩小过滤方式，默认为线性过滤
        texture.minFilter = texData.minFilter !== undefined ? texData.minFilter : LinearFilter;

        // 设置纹理的各向异性过滤值，默认为1
        texture.anisotropy = texData.anisotropy !== undefined ? texData.anisotropy : 1;

        // 如果指定了颜色空间
        if (texData.colorSpace !== undefined) {
          // 设置纹理的颜色空间
          texture.colorSpace = texData.colorSpace;
        }

        // 如果指定了垂直翻转
        if (texData.flipY !== undefined) {
          // 设置纹理的垂直翻转属性
          texture.flipY = texData.flipY;
        }

        // 如果指定了纹理格式
        if (texData.format !== undefined) {
          // 设置纹理格式
          texture.format = texData.format;
        }

        // 如果指定了纹理类型
        if (texData.type !== undefined) {
          // 设置纹理类型
          texture.type = texData.type;
        }

        // 如果包含mipmap数据
        if (texData.mipmaps !== undefined) {
          // 设置纹理的mipmap数据
          texture.mipmaps = texData.mipmaps;
          // 设置缩小过滤为线性mipmap线性过滤（推测）
          texture.minFilter = LinearMipmapLinearFilter; // presumably...
        }

        // 如果只有一个mipmap级别
        if (texData.mipmapCount === 1) {
          // 设置缩小过滤为线性过滤
          texture.minFilter = LinearFilter;
        }

        // 如果指定了是否生成mipmap
        if (texData.generateMipmaps !== undefined) {
          // 设置纹理的mipmap生成属性
          texture.generateMipmaps = texData.generateMipmaps;
        }

        // 标记纹理需要更新
        texture.needsUpdate = true;

        // 如果提供了加载完成回调，则调用它，传入纹理和纹理数据
        if (onLoad) onLoad(texture, texData);
      },
      onProgress,
      onError
    );

    // 返回创建的纹理对象
    return texture;
  }
}

/**
 * 表示 `parse()` 方法的结果对象类型。
 * Represents the result object type of the `parse()` method.
 *
 * @typedef {Object} DataTextureLoader~TexData
 * @property {Object} [image] - 包含宽度、高度和纹理数据的对象。An object holding width, height and the texture data.
 * @property {number} [width] - 基础mip的宽度。The width of the base mip.
 * @property {number} [height] - 基础mip的高度。The width of the base mip.
 * @property {TypedArray} [data] - 纹理数据。The texture data.
 * @property {number} [format] - 纹理格式。The texture format.
 * @property {number} [type] - 纹理类型。The texture type.
 * @property {boolean} [flipY] - 如果设置为 `true`，纹理在上传到GPU时沿垂直轴翻转。If set to `true`, the texture is flipped along the vertical axis when uploaded to the GPU.
 * @property {number} [wrapS=ClampToEdgeWrapping] - wrapS值。The wrapS value.
 * @property {number} [wrapT=ClampToEdgeWrapping] - wrapT值。The wrapT value.
 * @property {number} [anisotropy=1] - 各向异性值。The anisotropy value.
 * @property {boolean} [generateMipmaps] - 是否生成mipmap。Whether to generate mipmaps or not.
 * @property {string} [colorSpace] - 颜色空间。The color space.
 * @property {number} [magFilter] - 放大过滤器。The mag filter.
 * @property {number} [minFilter] - 缩小过滤器。The min filter.
 * @property {Array<Object>} [mipmaps] - mipmap数组。The mipmaps.
 **/

// 导出DataTextureLoader类供其他模块使用
export { DataTextureLoader };
