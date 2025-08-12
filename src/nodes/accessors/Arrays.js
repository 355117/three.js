// 导入存储实例化缓冲区属性类，用于实例化渲染的存储缓冲区
import StorageInstancedBufferAttribute from "../../renderers/common/StorageInstancedBufferAttribute.js";
// 导入存储缓冲区属性类，用于通用的存储缓冲区
import StorageBufferAttribute from "../../renderers/common/StorageBufferAttribute.js";
// 导入存储缓冲区节点创建函数
import { storage } from "./StorageBufferNode.js";
// 导入节点工具函数，用于类型长度和类型数组的获取
import { getLengthFromType, getTypedArrayFromType } from "../core/NodeUtils.js";

/**
 * TSL函数，用于创建配置了StorageBufferAttribute的存储缓冲区节点
 * 存储缓冲区允许在着色器中读写大量数据，常用于计算着色器和高级渲染技术
 *
 * @tsl
 * @function
 * @param {number|Array} count - 数据数量，也可以传递类型化数组作为参数
 * @param {string|Struct} [type='float'] - 数据类型，可以是基础类型或结构体
 * @returns {StorageBufferNode} 存储缓冲区节点
 */
export const attributeArray = (count, type = "float") => {
  let itemSize, typedArray;

  // 如果类型是结构体
  if (type.isStruct === true) {
    // 获取结构体布局的长度
    itemSize = type.layout.getLength();
    // 结构体使用float类型的数组
    typedArray = getTypedArrayFromType("float");
  } else {
    // 获取基础类型的长度
    itemSize = getLengthFromType(type);
    // 获取对应类型的类型化数组构造函数
    typedArray = getTypedArrayFromType(type);
  }

  // 创建存储缓冲区属性
  const buffer = new StorageBufferAttribute(count, itemSize, typedArray);
  // 创建存储缓冲区节点
  const node = storage(buffer, type, count);

  return node;
};

/**
 * TSL函数，用于创建配置了StorageInstancedBufferAttribute的存储缓冲区节点
 * 实例化存储缓冲区专门用于实例化渲染，每个实例可以有不同的数据
 *
 * @tsl
 * @function
 * @param {number|Array} count - 数据数量，也可以传递类型化数组作为参数
 * @param {string|Struct} [type='float'] - 数据类型，可以是基础类型或结构体
 * @returns {StorageBufferNode} 实例化存储缓冲区节点
 */
export const instancedArray = (count, type = "float") => {
  let itemSize, typedArray;

  // 如果类型是结构体
  if (type.isStruct === true) {
    // 获取结构体布局的长度
    itemSize = type.layout.getLength();
    // 结构体使用float类型的数组
    typedArray = getTypedArrayFromType("float");
  } else {
    // 获取基础类型的长度
    itemSize = getLengthFromType(type);
    // 获取对应类型的类型化数组构造函数
    typedArray = getTypedArrayFromType(type);
  }

  // 创建实例化存储缓冲区属性
  const buffer = new StorageInstancedBufferAttribute(count, itemSize, typedArray);
  // 创建存储缓冲区节点
  const node = storage(buffer, type, count);

  return node;
};
