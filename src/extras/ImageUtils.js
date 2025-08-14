// 导入DOM元素创建工具函数
import { createElementNS } from "../utils.js";
// 导入颜色管理中的sRGB到线性空间转换函数
import { SRGBToLinear } from "../math/ColorManagement.js";

// 全局canvas缓存，用于图像处理操作
let _canvas;

/**
 * 包含图像处理工具函数的类
 * 提供图像数据处理、格式转换等功能
 *
 * @hideconstructor
 */
class ImageUtils {
  /**
   * 返回包含给定图像表示的数据URI
   * 将图像对象转换为base64编码的数据URI字符串
   *
   * @param {(HTMLImageElement|HTMLCanvasElement)} image - 图像对象
   * @param {string} [type='image/png'] - 指示图像格式，默认为PNG
   * @return {string} 数据URI字符串
   */
  static getDataURL(image, type = "image/png") {
    // 如果图像源已经是数据URI，直接返回
    if (/^data:/i.test(image.src)) {
      return image.src;
    }

    // 如果环境不支持HTMLCanvasElement，返回原始源
    if (typeof HTMLCanvasElement === "undefined") {
      return image.src;
    }

    let canvas; // 用于处理的canvas元素

    // 如果输入已经是canvas元素，直接使用
    if (image instanceof HTMLCanvasElement) {
      canvas = image;
    } else {
      // 创建或复用全局canvas
      if (_canvas === undefined) _canvas = createElementNS("canvas");

      // 设置canvas尺寸与图像相同
      _canvas.width = image.width;
      _canvas.height = image.height;

      // 获取2D绘图上下文
      const context = _canvas.getContext("2d");

      // 处理ImageData类型的图像
      if (image instanceof ImageData) {
        context.putImageData(image, 0, 0);
      } else {
        context.drawImage(image, 0, 0, image.width, image.height);
      }

      // 使用处理后的canvas
      canvas = _canvas;
    }

    // 将canvas转换为指定格式的数据URI
    return canvas.toDataURL(type);
  }

  /**
   * 将给定的sRGB图像数据转换为线性颜色空间
   * 执行从sRGB颜色空间到线性颜色空间的转换，用于正确的颜色计算
   *
   * @param {(HTMLImageElement|HTMLCanvasElement|ImageBitmap|Object)} image - 图像对象
   * @return {HTMLCanvasElement|Object} 转换后的图像
   */
  static sRGBToLinear(image) {
    // 检查图像是否为支持的DOM图像类型
    if (
      (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) ||
      (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) ||
      (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap)
    ) {
      // 创建新的canvas用于颜色空间转换
      const canvas = createElementNS("canvas");

      // 设置canvas尺寸与原图像相同
      canvas.width = image.width;
      canvas.height = image.height;

      // 获取2D绘图上下文
      const context = canvas.getContext("2d");
      // 将原图像绘制到canvas上
      context.drawImage(image, 0, 0, image.width, image.height);

      // 获取图像的像素数据
      const imageData = context.getImageData(0, 0, image.width, image.height);
      const data = imageData.data; // RGBA像素数据数组

      // 遍历所有像素数据进行颜色空间转换
      for (let i = 0; i < data.length; i++) {
        // 将每个颜色分量从sRGB转换为线性空间
        // 先归一化到0-1范围，转换后再缩放回0-255范围
        data[i] = SRGBToLinear(data[i] / 255) * 255;
      }

      // 将转换后的像素数据放回canvas
      context.putImageData(imageData, 0, 0);

      // 返回包含线性颜色空间数据的canvas
      return canvas;
    } else if (image.data) {
      // 处理包含原始像素数据的图像对象
      const data = image.data.slice(0); // 复制像素数据数组

      // 遍历所有像素数据进行颜色空间转换
      for (let i = 0; i < data.length; i++) {
        // 检查数据类型并进行相应的转换
        if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
          // 对于8位整数数据，转换后取整并限制在0-255范围内
          data[i] = Math.floor(SRGBToLinear(data[i] / 255) * 255);
        } else {
          // 假设为浮点数据，直接进行转换
          data[i] = SRGBToLinear(data[i]);
        }
      }

      // 返回包含转换后数据的新图像对象
      return {
        data: data, // 转换后的像素数据
        width: image.width, // 图像宽度
        height: image.height, // 图像高度
      };
    } else {
      // 不支持的图像类型，输出警告并返回原图像
      console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.");
      return image;
    }
  }
}

// 导出ImageUtils类
export { ImageUtils };
