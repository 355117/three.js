/**
 * BufferUtils.js
 *
 * 缓冲区工具函数 - GPU缓冲区内存布局计算
 *
 * 这个模块提供了用于计算GPU缓冲区内存布局的工具函数，
 * 确保数据按照STD140布局规范正确对齐。STD140是OpenGL和
 * WebGL中uniform缓冲区的标准内存布局规范。
 */

// 导入GPU块字节大小常量
import { GPU_CHUNK_BYTES } from "./Constants.js";

/**
 * 获取对齐后的浮点数长度
 *
 * 这个函数通常使用数组缓冲区的字节长度调用，返回一个填充值，
 * 确保根据STD140布局进行块大小对齐。STD140布局要求数据按照
 * 特定的对齐规则排列，以确保GPU能够高效访问。
 *
 * @function
 * @param {number} floatLength - 缓冲区长度（字节）
 * @return {number} 对齐后的长度
 */
function getFloatLength(floatLength) {
  // 确保块大小对齐（STD140布局）
  // 计算需要填充的字节数，使总长度是GPU_CHUNK_BYTES的倍数
  return floatLength + ((GPU_CHUNK_BYTES - (floatLength % GPU_CHUNK_BYTES)) % GPU_CHUNK_BYTES);
}

/**
 * 获取向量数组的对齐长度
 *
 * 给定向量的数量和向量长度，这个函数计算根据STD140布局
 * 进行缓冲区对齐的总字节长度。这对于创建包含多个向量的
 * uniform缓冲区非常有用。
 *
 * @function
 * @param {number} count - 向量的数量
 * @param {number} [vectorLength=4] - 向量长度（默认为4，即vec4）
 * @return {number} 对齐后的总长度
 */
function getVectorLength(count, vectorLength = 4) {
  // 获取单个向量的步长长度
  const strideLength = getStrideLength(vectorLength);

  // 计算所有向量的总长度
  const floatLength = strideLength * count;

  // 返回对齐后的长度
  return getFloatLength(floatLength);
}

/**
 * 获取向量的步长长度
 *
 * 这个函数使用向量长度调用，确保计算出的长度匹配预定义的
 * 步长（在这种情况下是`4`）。这确保了向量在内存中的正确对齐。
 *
 * @function
 * @param {number} vectorLength - 向量长度
 * @return {number} 对齐后的步长长度
 */
function getStrideLength(vectorLength) {
  // STD140布局中的标准步长为4（16字节对齐）
  const strideLength = 4;

  // 计算填充后的长度，确保是步长的倍数
  return vectorLength + ((strideLength - (vectorLength % strideLength)) % strideLength);
}

// 导出所有工具函数
export {
  getFloatLength, // 获取对齐后的浮点数长度
  getVectorLength, // 获取向量数组的对齐长度
  getStrideLength, // 获取向量的步长长度
};
