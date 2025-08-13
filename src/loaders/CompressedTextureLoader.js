// 导入线性过滤常量，用于纹理过滤设置
import { LinearFilter } from "../constants.js";
// 导入文件加载器类，用于处理文件的异步加载
import { FileLoader } from "./FileLoader.js";
// 导入压缩纹理类，用于创建压缩纹理对象
import { CompressedTexture } from "../textures/CompressedTexture.js";
// 导入基础加载器类，提供加载器的基本功能
import { Loader } from "./Loader.js";

/**
 * 用于加载压缩纹理格式（S3TC、ASTC或ETC）的抽象基类。
 * 纹理内部通过 {@link FileLoader} 进行加载。
 * Abstract base class for loading compressed texture formats S3TC, ASTC or ETC.
 * Textures are internally loaded via {@link FileLoader}.
 *
 * 派生类必须实现 `parse()` 方法，该方法包含相应格式的解析逻辑。
 * Derived classes have to implement the `parse()` method which holds the parsing
 * for the respective format.
 *
 * @abstract
 * @augments Loader
 */
class CompressedTextureLoader extends Loader {
  /**
   * 构造一个新的压缩纹理加载器。
   * Constructs a new compressed texture loader.
   *
   * @param {LoadingManager} [manager] - 加载管理器。The loading manager.
   */
  constructor(manager) {
    // 调用父类构造函数，传入加载管理器
    super(manager);
  }

  /**
   * 从给定的URL开始加载，并将加载的压缩纹理传递给 `onLoad()` 回调函数。
   * 该方法还返回一个新的纹理对象，可以直接用于材质创建。
   * 如果这样做，纹理可能会在相应的加载过程完成后出现在场景中。
   * Starts loading from the given URL and passes the loaded compressed texture
   * to the `onLoad()` callback. The method also returns a new texture object which can
   * directly be used for material creation. If you do it this way, the texture
   * may pop up in your scene once the respective loading process is finished.
   *
   * @param {string} url - 要加载的文件路径/URL。也可以是数据URI。The path/URL of the file to be loaded. This can also be a data URI.
   * @param {function(CompressedTexture)} onLoad - 加载过程完成时执行的回调函数。Executed when the loading process has been finished.
   * @param {onProgressCallback} onProgress - 加载过程中执行的进度回调函数。Executed while the loading is in progress.
   * @param {onErrorCallback} onError - 发生错误时执行的错误回调函数。Executed when errors occur.
   * @return {CompressedTexture} 压缩纹理对象。The compressed texture.
   */
  load(url, onLoad, onProgress, onError) {
    // 保存当前实例的引用，用于在回调函数中访问
    const scope = this;

    // 创建图像数组，用于存储立方体贴图的六个面
    const images = [];

    // 创建压缩纹理实例
    const texture = new CompressedTexture();

    // 创建文件加载器实例，传入加载管理器
    const loader = new FileLoader(this.manager);
    // 设置文件加载路径
    loader.setPath(this.path);
    // 设置响应类型为数组缓冲区，用于处理二进制纹理数据
    loader.setResponseType("arraybuffer");
    // 设置请求头信息
    loader.setRequestHeader(this.requestHeader);
    // 设置是否携带凭证信息
    loader.setWithCredentials(scope.withCredentials);

    // 记录已加载的纹理数量
    let loaded = 0;

    // 定义加载单个纹理的内部函数
    function loadTexture(i) {
      // 加载指定索引的URL对应的纹理文件
      loader.load(
        url[i],
        function (buffer) {
          // 解析缓冲区数据为纹理数据
          const texDatas = scope.parse(buffer, true);

          // 将解析后的纹理数据存储到图像数组中
          images[i] = {
            width: texDatas.width, // 纹理宽度
            height: texDatas.height, // 纹理高度
            format: texDatas.format, // 纹理格式
            mipmaps: texDatas.mipmaps, // mipmap数据
          };

          // 增加已加载计数
          loaded += 1;

          // 如果所有6个面都已加载完成（立方体贴图）
          if (loaded === 6) {
            // 如果只有一个mipmap级别，使用线性过滤
            if (texDatas.mipmapCount === 1) texture.minFilter = LinearFilter;

            // 设置纹理的图像数据
            texture.image = images;
            // 设置纹理格式
            texture.format = texDatas.format;
            // 标记纹理需要更新
            texture.needsUpdate = true;

            // 如果提供了加载完成回调，则调用它
            if (onLoad) onLoad(texture);
          }
        },
        onProgress,
        onError
      );
    }

    // 如果URL是数组（多个文件的立方体贴图）
    if (Array.isArray(url)) {
      // 遍历所有URL，加载每个纹理文件
      for (let i = 0, il = url.length; i < il; ++i) {
        // 加载第i个纹理
        loadTexture(i);
      }
    } else {
      // 存储在单个DDS文件中的压缩立方体贴图纹理
      // compressed cubemap texture stored in a single DDS file

      // 加载单个文件
      loader.load(
        url,
        function (buffer) {
          // 解析缓冲区数据为纹理数据
          const texDatas = scope.parse(buffer, true);

          // 如果是立方体贴图
          if (texDatas.isCubemap) {
            // 计算面数（总mipmap数除以每个面的mipmap数）
            const faces = texDatas.mipmaps.length / texDatas.mipmapCount;

            // 遍历每个面
            for (let f = 0; f < faces; f++) {
              // 初始化当前面的图像数据
              images[f] = { mipmaps: [] };

              // 遍历当前面的所有mipmap级别
              for (let i = 0; i < texDatas.mipmapCount; i++) {
                // 将对应的mipmap数据添加到当前面
                images[f].mipmaps.push(texDatas.mipmaps[f * texDatas.mipmapCount + i]);
                // 设置当前面的格式
                images[f].format = texDatas.format;
                // 设置当前面的宽度
                images[f].width = texDatas.width;
                // 设置当前面的高度
                images[f].height = texDatas.height;
              }
            }

            // 设置纹理的图像数据为所有面的数据
            texture.image = images;
          } else {
            // 如果不是立方体贴图，设置单个纹理的属性
            texture.image.width = texDatas.width;
            texture.image.height = texDatas.height;
            texture.mipmaps = texDatas.mipmaps;
          }

          // 如果只有一个mipmap级别，使用线性过滤
          if (texDatas.mipmapCount === 1) {
            texture.minFilter = LinearFilter;
          }

          // 设置纹理格式
          texture.format = texDatas.format;
          // 标记纹理需要更新
          texture.needsUpdate = true;

          // 如果提供了加载完成回调，则调用它
          if (onLoad) onLoad(texture);
        },
        onProgress,
        onError
      );
    }

    // 返回创建的纹理对象
    return texture;
  }
}

/**
 * 表示 `parse()` 方法的结果对象类型。
 * Represents the result object type of the `parse()` method.
 *
 * @typedef {Object} CompressedTextureLoader~TexData
 * @property {number} width - 基础mip的宽度。The width of the base mip.
 * @property {number} height - 基础mip的高度。The width of the base mip.
 * @property {boolean} isCubemap - 数据是否表示立方体贴图。Whether the data represent a cubemap or not.
 * @property {number} mipmapCount - mipmap数量。The mipmap count.
 * @property {Array<{data:TypedArray,width:number,height:number}>} mipmaps - 包含mipmap的数组。An array holding the mipmaps.
 * 每个条目包含每个级别的数据和尺寸。Each entry holds the data and the dimensions for each level.
 * @property {number} format - 纹理格式。The texture format.
 **/

// 导出CompressedTextureLoader类供其他模块使用
export { CompressedTextureLoader };
