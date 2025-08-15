// 导入四元数类，用于处理旋转动画
import { Quaternion } from "../math/Quaternion.js";
// 导入加法动画混合模式常量
import { AdditiveAnimationBlendMode } from "../constants.js";

/**
 * 将数组转换为指定类型
 *
 * @param {TypedArray|Array} array - 要转换的数组
 * @param {TypedArray.constructor} type - 定义新类型的类型化数组构造函数
 * @return {TypedArray} 转换后的数组
 */
function convertArray(array, type) {
  // 如果数组不存在或已经是目标类型，直接返回
  if (!array || array.constructor === type) return array;

  // 检查是否为类型化数组构造函数
  if (typeof type.BYTES_PER_ELEMENT === "number") {
    // 创建类型化数组
    return new type(array);
  }

  // 创建普通数组
  return Array.prototype.slice.call(array);
}

/**
 * 判断给定对象是否为类型化数组
 *
 * @param {any} object - 要检查的对象
 * @return {boolean} 给定对象是否为类型化数组
 */
function isTypedArray(object) {
  // 使用 ArrayBuffer.isView 检查是否为类型化数组，但排除 DataView
  return ArrayBuffer.isView(object) && !(object instanceof DataView);
}

/**
 * 返回一个可用于对时间和值进行排序的数组
 *
 * @param {Array<number>} times - 关键帧时间值
 * @return {Array<number>} 排序索引数组
 */
function getKeyframeOrder(times) {
  // 比较函数：根据时间值比较两个索引
  function compareTime(i, j) {
    return times[i] - times[j];
  }

  // 获取时间数组长度
  const n = times.length;
  // 创建索引数组
  const result = new Array(n);
  // 初始化索引数组，每个位置存储对应的索引值
  for (let i = 0; i !== n; ++i) result[i] = i;

  // 根据时间值对索引进行排序
  result.sort(compareTime);

  // 返回排序后的索引数组
  return result;
}

/**
 * 根据之前通过 `getKeyframeOrder()` 计算的顺序对给定数组进行排序
 *
 * @param {Array<number>} values - 要排序的值数组
 * @param {number} stride - 步长（每个元素占用的数组位置数）
 * @param {Array<number>} order - 排序顺序
 * @return {Array<number>} 排序后的值数组
 */
function sortedArray(values, stride, order) {
  // 获取值数组的长度
  const nValues = values.length;
  // 创建与原数组相同类型的结果数组
  const result = new values.constructor(nValues);

  // 遍历排序顺序，重新排列数据
  for (let i = 0, dstOffset = 0; dstOffset !== nValues; ++i) {
    // 计算源数据的偏移量
    const srcOffset = order[i] * stride;

    // 复制一个完整的数据块（根据步长）
    for (let j = 0; j !== stride; ++j) {
      // 将源数据复制到目标位置
      result[dstOffset++] = values[srcOffset + j];
    }
  }

  // 返回排序后的结果数组
  return result;
}

/**
 * 用于解析 AOS（Array of Structures）关键帧格式
 *
 * @param {Array<number>} jsonKeys - JSON关键帧列表
 * @param {Array<number>} times - 此函数将用关键帧时间填充此数组
 * @param {Array<number>} values - 此函数将用关键帧值填充此数组
 * @param {string} valuePropertyName - 要使用的属性名称
 */
function flattenJSON(jsonKeys, times, values, valuePropertyName) {
  // 初始化索引和第一个关键帧
  let i = 1,
    key = jsonKeys[0];

  // 寻找第一个包含指定属性的关键帧
  while (key !== undefined && key[valuePropertyName] === undefined) {
    key = jsonKeys[i++];
  }

  // 如果没有找到有效的关键帧，直接返回
  if (key === undefined) return; // 没有数据

  // 获取第一个有效值
  let value = key[valuePropertyName];
  if (value === undefined) return; // 没有数据

  // 根据值的类型采用不同的处理方式
  if (Array.isArray(value)) {
    // 处理数组类型的值
    do {
      // 获取当前关键帧的值
      value = key[valuePropertyName];

      if (value !== undefined) {
        // 添加时间点
        times.push(key.time);
        // 展开数组并添加所有元素到值数组中
        values.push(...value);
      }

      // 移动到下一个关键帧
      key = jsonKeys[i++];
    } while (key !== undefined);
  } else if (value.toArray !== undefined) {
    // 处理具有 toArray 方法的对象（如 THREE.js 的数学对象）

    do {
      // 获取当前关键帧的值
      value = key[valuePropertyName];

      if (value !== undefined) {
        // 添加时间点
        times.push(key.time);
        // 使用 toArray 方法将对象转换为数组并添加到值数组中
        value.toArray(values, values.length);
      }

      // 移动到下一个关键帧
      key = jsonKeys[i++];
    } while (key !== undefined);
  } else {
    // 其他情况：直接推入值

    do {
      // 获取当前关键帧的值
      value = key[valuePropertyName];

      if (value !== undefined) {
        // 添加时间点
        times.push(key.time);
        // 直接添加值
        values.push(value);
      }

      // 移动到下一个关键帧
      key = jsonKeys[i++];
    } while (key !== undefined);
  }
}

/**
 * 创建一个新的动画片段，仅包含原始片段在给定帧之间的部分
 *
 * @param {AnimationClip} sourceClip - 源动画片段
 * @param {string} name - 片段名称
 * @param {number} startFrame - 起始帧
 * @param {number} endFrame - 结束帧
 * @param {number} [fps=30] - 帧率
 * @return {AnimationClip} 新的子片段
 */
function subclip(sourceClip, name, startFrame, endFrame, fps = 30) {
  // 克隆源动画片段
  const clip = sourceClip.clone();

  // 设置新片段的名称
  clip.name = name;

  // 存储处理后的轨道
  const tracks = [];

  // 遍历所有动画轨道
  for (let i = 0; i < clip.tracks.length; ++i) {
    const track = clip.tracks[i]; // 获取当前轨道
    const valueSize = track.getValueSize(); // 获取每个关键帧值的大小

    // 存储筛选后的时间和值
    const times = [];
    const values = [];

    // 遍历轨道中的所有时间点
    for (let j = 0; j < track.times.length; ++j) {
      // 将时间转换为帧数
      const frame = track.times[j] * fps;

      // 跳过不在指定帧范围内的关键帧
      if (frame < startFrame || frame >= endFrame) continue;

      // 添加符合条件的时间点
      times.push(track.times[j]);

      // 添加对应的值（可能是多维的）
      for (let k = 0; k < valueSize; ++k) {
        values.push(track.values[j * valueSize + k]);
      }
    }

    // 如果没有符合条件的时间点，跳过此轨道
    if (times.length === 0) continue;

    // 将筛选后的数据转换为与原轨道相同的数组类型
    track.times = convertArray(times, track.times.constructor);
    track.values = convertArray(values, track.values.constructor);

    // 将处理后的轨道添加到结果中
    tracks.push(track);
  }

  // 更新片段的轨道列表
  clip.tracks = tracks;

  // 在修剪后的片段中找到所有轨道的最小时间值

  let minStartTime = Infinity;

  // 遍历所有轨道，找到最早的开始时间
  for (let i = 0; i < clip.tracks.length; ++i) {
    if (minStartTime > clip.tracks[i].times[0]) {
      minStartTime = clip.tracks[i].times[0];
    }
  }

  // 移动所有轨道，使片段从 t=0 开始

  // 对所有轨道应用时间偏移
  for (let i = 0; i < clip.tracks.length; ++i) {
    clip.tracks[i].shift(-1 * minStartTime);
  }

  // 重新计算片段持续时间
  clip.resetDuration();

  // 返回处理后的片段
  return clip;
}

/**
 * 将给定动画片段的关键帧转换为加法格式
 *
 * @param {AnimationClip} targetClip - 要转换为加法的片段
 * @param {number} [referenceFrame=0] - 参考帧
 * @param {AnimationClip} [referenceClip=targetClip] - 参考片段
 * @param {number} [fps=30] - 帧率
 * @return {AnimationClip} 更新后的片段，现在是加法格式
 */
function makeClipAdditive(targetClip, referenceFrame = 0, referenceClip = targetClip, fps = 30) {
  // 确保帧率有效
  if (fps <= 0) fps = 30;

  // 获取参考片段的轨道数量
  const numTracks = referenceClip.tracks.length;
  // 计算参考时间
  const referenceTime = referenceFrame / fps;

  // 使每个轨道的值相对于参考帧的值
  for (let i = 0; i < numTracks; ++i) {
    const referenceTrack = referenceClip.tracks[i]; // 获取参考轨道
    const referenceTrackType = referenceTrack.ValueTypeName; // 获取轨道值类型

    // 跳过非数值类型的轨道
    if (referenceTrackType === "bool" || referenceTrackType === "string") continue;

    // 在目标片段中找到名称和类型与参考轨道匹配的轨道
    const targetTrack = targetClip.tracks.find(function (track) {
      return track.name === referenceTrack.name && track.ValueTypeName === referenceTrackType;
    });

    // 如果没有找到匹配的轨道，跳过
    if (targetTrack === undefined) continue;

    // 初始化参考偏移量
    let referenceOffset = 0;
    const referenceValueSize = referenceTrack.getValueSize(); // 获取参考轨道值大小

    // 如果是 GLTF 立方样条插值，调整偏移量
    if (referenceTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline) {
      referenceOffset = referenceValueSize / 3;
    }

    // 初始化目标偏移量
    let targetOffset = 0;
    const targetValueSize = targetTrack.getValueSize(); // 获取目标轨道值大小

    // 如果是 GLTF 立方样条插值，调整偏移量
    if (targetTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline) {
      targetOffset = targetValueSize / 3;
    }

    // 获取最后一个关键帧的索引
    const lastIndex = referenceTrack.times.length - 1;
    let referenceValue; // 存储参考值

    // 找到要从轨道中减去的值
    if (referenceTime <= referenceTrack.times[0]) {
      // 参考帧早于第一个关键帧，使用第一个关键帧
      const startIndex = referenceOffset;
      const endIndex = referenceValueSize - referenceOffset;
      referenceValue = referenceTrack.values.slice(startIndex, endIndex);
    } else if (referenceTime >= referenceTrack.times[lastIndex]) {
      // 参考帧晚于最后一个关键帧，使用最后一个关键帧
      const startIndex = lastIndex * referenceValueSize + referenceOffset;
      const endIndex = startIndex + referenceValueSize - referenceOffset;
      referenceValue = referenceTrack.values.slice(startIndex, endIndex);
    } else {
      // 插值到参考值
      const interpolant = referenceTrack.createInterpolant(); // 创建插值器
      const startIndex = referenceOffset;
      const endIndex = referenceValueSize - referenceOffset;
      interpolant.evaluate(referenceTime); // 在参考时间进行插值
      referenceValue = interpolant.resultBuffer.slice(startIndex, endIndex);
    }

    // 对四元数进行共轭操作
    if (referenceTrackType === "quaternion") {
      const referenceQuat = new Quaternion().fromArray(referenceValue).normalize().conjugate();
      referenceQuat.toArray(referenceValue);
    }

    // 从所有轨道值中减去参考值

    const numTimes = targetTrack.times.length; // 获取目标轨道的时间点数量
    for (let j = 0; j < numTimes; ++j) {
      // 计算当前值的起始位置
      const valueStart = j * targetValueSize + targetOffset;

      if (referenceTrackType === "quaternion") {
        // 对四元数轨道类型进行共轭乘法
        Quaternion.multiplyQuaternionsFlat(targetTrack.values, valueStart, referenceValue, 0, targetTrack.values, valueStart);
      } else {
        // 计算值的结束位置
        const valueEnd = targetValueSize - targetOffset * 2;

        // 对所有其他数值轨道类型减去每个值
        for (let k = 0; k < valueEnd; ++k) {
          targetTrack.values[valueStart + k] -= referenceValue[k];
        }
      }
    }
  }

  // 设置目标片段的混合模式为加法模式
  targetClip.blendMode = AdditiveAnimationBlendMode;

  // 返回更新后的片段
  return targetClip;
}

/**
 * 包含各种辅助动画方法的工具类
 *
 * @hideconstructor
 */
class AnimationUtils {
  /**
   * 将数组转换为指定类型
   *
   * @static
   * @param {TypedArray|Array} array - 要转换的数组
   * @param {TypedArray.constructor} type - 类型数组的构造函数
   * @return {TypedArray} 转换后的数组
   */
  static convertArray(array, type) {
    // 调用模块级别的 convertArray 函数
    return convertArray(array, type);
  }

  /**
   * 判断给定对象是否为类型化数组
   *
   * @static
   * @param {any} object - 要检查的对象
   * @return {boolean} 给定对象是否为类型化数组
   */
  static isTypedArray(object) {
    // 调用模块级别的 isTypedArray 函数
    return isTypedArray(object);
  }

  /**
   * 返回一个可用于对时间和值进行排序的数组
   *
   * @static
   * @param {Array<number>} times - 关键帧时间值
   * @return {Array<number>} 排序索引数组
   */
  static getKeyframeOrder(times) {
    // 调用模块级别的 getKeyframeOrder 函数
    return getKeyframeOrder(times);
  }

  /**
   * 根据之前通过 `getKeyframeOrder()` 计算的顺序对给定数组进行排序
   *
   * @static
   * @param {Array<number>} values - 要排序的值数组
   * @param {number} stride - 步长
   * @param {Array<number>} order - 排序顺序
   * @return {Array<number>} 排序后的值数组
   */
  static sortedArray(values, stride, order) {
    // 调用模块级别的 sortedArray 函数
    return sortedArray(values, stride, order);
  }

  /**
   * 用于解析 AOS 关键帧格式
   *
   * @static
   * @param {Array<number>} jsonKeys - JSON关键帧列表
   * @param {Array<number>} times - 此方法将用关键帧时间填充此数组
   * @param {Array<number>} values - 此方法将用关键帧值填充此数组
   * @param {string} valuePropertyName - 要使用的属性名称
   */
  static flattenJSON(jsonKeys, times, values, valuePropertyName) {
    // 调用模块级别的 flattenJSON 函数
    flattenJSON(jsonKeys, times, values, valuePropertyName);
  }

  /**
   * 创建一个新的动画片段，仅包含原始片段在给定帧之间的部分
   *
   * @static
   * @param {AnimationClip} sourceClip - 源动画片段
   * @param {string} name - 片段名称
   * @param {number} startFrame - 起始帧
   * @param {number} endFrame - 结束帧
   * @param {number} [fps=30] - 帧率
   * @return {AnimationClip} 新的子片段
   */
  static subclip(sourceClip, name, startFrame, endFrame, fps = 30) {
    // 调用模块级别的 subclip 函数
    return subclip(sourceClip, name, startFrame, endFrame, fps);
  }

  /**
   * 将给定动画片段的关键帧转换为加法格式
   *
   * @static
   * @param {AnimationClip} targetClip - 要转换为加法的片段
   * @param {number} [referenceFrame=0] - 参考帧
   * @param {AnimationClip} [referenceClip=targetClip] - 参考片段
   * @param {number} [fps=30] - 帧率
   * @return {AnimationClip} 更新后的片段，现在是加法格式
   */
  static makeClipAdditive(targetClip, referenceFrame = 0, referenceClip = targetClip, fps = 30) {
    // 调用模块级别的 makeClipAdditive 函数
    return makeClipAdditive(targetClip, referenceFrame, referenceClip, fps);
  }
}

// 导出所有动画工具函数和类
export {
  convertArray, // 数组类型转换函数
  isTypedArray, // 类型化数组检查函数
  getKeyframeOrder, // 关键帧排序索引生成函数
  sortedArray, // 数组排序函数
  flattenJSON, // JSON关键帧扁平化函数
  subclip, // 动画片段裁剪函数
  makeClipAdditive, // 动画片段加法转换函数
  AnimationUtils, // 动画工具类
};
