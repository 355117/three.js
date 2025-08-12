// 导入节点基类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入TSL基础类型和函数
import { float, nodeProxy, Fn, ivec2, int, If } from "../tsl/TSLBase.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";
// 导入引用节点
import { reference } from "./ReferenceNode.js";
// 导入本地位置节点
import { positionLocal } from "./Position.js";
// 导入本地法线节点
import { normalLocal } from "./Normal.js";
// 导入纹理加载函数
import { textureLoad } from "./TextureNode.js";
// 导入实例索引和顶点索引
import { instanceIndex, vertexIndex } from "../core/IndexNode.js";
// 导入循环节点
import { Loop } from "../utils/LoopNode.js";

// 导入数据数组纹理类
import { DataArrayTexture } from "../../textures/DataArrayTexture.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 导入四维向量类
import { Vector4 } from "../../math/Vector4.js";
// 导入浮点类型常量
import { FloatType } from "../../constants.js";

// 变形纹理缓存，使用WeakMap存储几何体与纹理的映射
const _morphTextures = /*@__PURE__*/ new WeakMap();
// 临时四维向量，用于变形数据处理
const _morphVec4 = /*@__PURE__*/ new Vector4();

// TSL函数：获取变形数据
const getMorph = /*@__PURE__*/ Fn(({ bufferMap, influence, stride, width, depth, offset }) => {
  // 计算纹理像素索引：顶点索引 * 步长 + 偏移
  const texelIndex = int(vertexIndex).mul(stride).add(offset);

  // 计算纹理坐标：y = 索引 / 宽度，x = 索引 - y * 宽度
  const y = texelIndex.div(width);
  const x = texelIndex.sub(y.mul(width));

  // 从缓冲区贴图加载属性数据
  const bufferAttrib = textureLoad(bufferMap, ivec2(x, y)).depth(depth).xyz;

  // 返回属性数据乘以影响权重
  return bufferAttrib.mul(influence);
});

// 获取几何体的变形纹理条目
function getEntry(geometry) {
  // 检查几何体是否有各种变形属性
  const hasMorphPosition = geometry.morphAttributes.position !== undefined;
  const hasMorphNormals = geometry.morphAttributes.normal !== undefined;
  const hasMorphColors = geometry.morphAttributes.color !== undefined;

  // 使用数据纹理数组而不是属性，WebGL 2代码路径将变形目标编码到数据纹理数组中
  // 每一层代表一个单独的变形目标

  // 获取变形属性（位置、法线或颜色中的任意一个）
  const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
  // 计算变形目标数量
  const morphTargetsCount = morphAttribute !== undefined ? morphAttribute.length : 0;

  // 从缓存中获取条目
  let entry = _morphTextures.get(geometry);

  // 如果条目不存在或变形目标数量发生变化，需要重新创建
  if (entry === undefined || entry.count !== morphTargetsCount) {
    // 如果存在旧条目，先释放其纹理
    if (entry !== undefined) entry.texture.dispose();

    // 获取各种变形属性数组
    const morphTargets = geometry.morphAttributes.position || [];
    const morphNormals = geometry.morphAttributes.normal || [];
    const morphColors = geometry.morphAttributes.color || [];

    // 计算顶点数据数量
    let vertexDataCount = 0;

    if (hasMorphPosition === true) vertexDataCount = 1;
    if (hasMorphNormals === true) vertexDataCount = 2;
    if (hasMorphColors === true) vertexDataCount = 3;

    // 计算纹理尺寸
    let width = geometry.attributes.position.count * vertexDataCount;
    let height = 1;

    const maxTextureSize = 4096; // @TODO: 使用 'capabilities.maxTextureSize'

    // 如果宽度超过最大纹理尺寸，调整高度
    if (width > maxTextureSize) {
      height = Math.ceil(width / maxTextureSize);
      width = maxTextureSize;
    }

    // 创建缓冲区数组
    const buffer = new Float32Array(width * height * 4 * morphTargetsCount);

    // 创建数据数组纹理
    const bufferTexture = new DataArrayTexture(buffer, width, height, morphTargetsCount);
    bufferTexture.type = FloatType;
    bufferTexture.needsUpdate = true;

    // 填充缓冲区

    // 顶点数据步长（每个顶点4个分量）
    const vertexDataStride = vertexDataCount * 4;

    // 遍历所有变形目标
    for (let i = 0; i < morphTargetsCount; i++) {
      // 获取当前变形目标的各种属性
      const morphTarget = morphTargets[i];
      const morphNormal = morphNormals[i];
      const morphColor = morphColors[i];

      // 计算当前变形目标在缓冲区中的偏移
      const offset = width * height * 4 * i;

      // 遍历变形目标的所有顶点
      for (let j = 0; j < morphTarget.count; j++) {
        // 计算当前顶点的步长偏移
        const stride = j * vertexDataStride;

        // 处理位置变形
        if (hasMorphPosition === true) {
          // 从缓冲区属性获取向量数据
          _morphVec4.fromBufferAttribute(morphTarget, j);

          // 将位置数据写入缓冲区
          buffer[offset + stride + 0] = _morphVec4.x;
          buffer[offset + stride + 1] = _morphVec4.y;
          buffer[offset + stride + 2] = _morphVec4.z;
          buffer[offset + stride + 3] = 0;
        }

        // 处理法线变形
        if (hasMorphNormals === true) {
          // 从缓冲区属性获取法线数据
          _morphVec4.fromBufferAttribute(morphNormal, j);

          // 将法线数据写入缓冲区
          buffer[offset + stride + 4] = _morphVec4.x;
          buffer[offset + stride + 5] = _morphVec4.y;
          buffer[offset + stride + 6] = _morphVec4.z;
          buffer[offset + stride + 7] = 0;
        }

        // 处理颜色变形
        if (hasMorphColors === true) {
          // 从缓冲区属性获取颜色数据
          _morphVec4.fromBufferAttribute(morphColor, j);

          // 将颜色数据写入缓冲区
          buffer[offset + stride + 8] = _morphVec4.x;
          buffer[offset + stride + 9] = _morphVec4.y;
          buffer[offset + stride + 10] = _morphVec4.z;
          // 如果颜色有4个分量则使用w，否则使用1
          buffer[offset + stride + 11] = morphColor.itemSize === 4 ? _morphVec4.w : 1;
        }
      }
    }

    // 创建新的条目对象
    entry = {
      count: morphTargetsCount,
      texture: bufferTexture,
      stride: vertexDataCount,
      size: new Vector2(width, height),
    };

    // 将条目存入缓存
    _morphTextures.set(geometry, entry);

    // 纹理释放函数
    function disposeTexture() {
      // 释放缓冲区纹理
      bufferTexture.dispose();

      // 从缓存中删除条目
      _morphTextures.delete(geometry);

      // 移除事件监听器
      geometry.removeEventListener("dispose", disposeTexture);
    }

    // 监听几何体的释放事件
    geometry.addEventListener("dispose", disposeTexture);
  }

  // 返回条目
  return entry;
}

/**
 * 变形节点 - 实现变形目标动画所需的顶点变换着色器逻辑
 *
 * @augments Node
 */
class MorphNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "MorphNode";
  }

  /**
   * 构造一个新的变形节点
   *
   * @param {Mesh} mesh - 持有变形目标的网格
   */
  constructor(mesh) {
    // 调用父类构造函数，返回类型为void
    super("void");

    /**
     * 持有变形目标的网格
     *
     * @type {Mesh}
     */
    this.mesh = mesh;

    /**
     * 表示变形基础影响值的统一变量节点
     *
     * @type {UniformNode<float>}
     */
    this.morphBaseInfluence = uniform(1);

    /**
     * 更新类型被重写，因为变形节点是按对象更新的
     *
     * @type {string}
     */
    this.updateType = NodeUpdateType.OBJECT;
  }

  /**
   * 通过将变换后的顶点数据分配给预定义的节点变量来设置变形节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  setup(builder) {
    // 从构建器获取几何体
    const { geometry } = builder;

    // 检查是否有位置和法线变形属性
    const hasMorphPosition = geometry.morphAttributes.position !== undefined;
    const hasMorphNormals = geometry.hasAttribute("normal") && geometry.morphAttributes.normal !== undefined;

    // 获取变形属性和目标数量
    const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
    const morphTargetsCount = morphAttribute !== undefined ? morphAttribute.length : 0;

    // 节点设置

    // 从几何体条目获取纹理、步长和尺寸信息
    const { texture: bufferMap, stride, size } = getEntry(geometry);

    // 如果有位置变形，将本地位置乘以基础影响值
    if (hasMorphPosition === true) positionLocal.mulAssign(this.morphBaseInfluence);
    // 如果有法线变形，将本地法线乘以基础影响值
    if (hasMorphNormals === true) normalLocal.mulAssign(this.morphBaseInfluence);

    // 获取纹理宽度
    const width = int(size.width);

    // 循环处理所有变形目标
    Loop(morphTargetsCount, ({ i }) => {
      // 创建影响权重变量
      const influence = float(0).toVar();

      // 如果是实例化网格且有变形纹理
      if (this.mesh.count > 1 && this.mesh.morphTexture !== null && this.mesh.morphTexture !== undefined) {
        // 从变形纹理中加载影响权重
        influence.assign(textureLoad(this.mesh.morphTexture, ivec2(int(i).add(1), int(instanceIndex))).r);
      } else {
        // 从变形目标影响数组中获取权重
        influence.assign(reference("morphTargetInfluences", "float").element(i).toVar());
      }

      // 如果影响权重不为0，则应用变形
      If(influence.notEqual(0), () => {
        // 应用位置变形
        if (hasMorphPosition === true) {
          positionLocal.addAssign(
            getMorph({
              bufferMap, // 缓冲区贴图
              influence, // 影响权重
              stride, // 步长
              width, // 宽度
              depth: i, // 深度（变形目标索引）
              offset: int(0), // 偏移（位置数据偏移为0）
            })
          );
        }

        // 应用法线变形
        if (hasMorphNormals === true) {
          normalLocal.addAssign(
            getMorph({
              bufferMap, // 缓冲区贴图
              influence, // 影响权重
              stride, // 步长
              width, // 宽度
              depth: i, // 深度（变形目标索引）
              offset: int(1), // 偏移（法线数据偏移为1）
            })
          );
        }
      });
    });
  }

  /**
   * 通过更新基础影响值来更新变形网格的状态
   *
   * @param {NodeFrame} frame - 当前节点帧
   */
  update(/*frame*/) {
    // 获取变形基础影响值
    const morphBaseInfluence = this.morphBaseInfluence;

    // 如果变形目标是相对的
    if (this.mesh.geometry.morphTargetsRelative) {
      // 基础影响值设为1
      morphBaseInfluence.value = 1;
    } else {
      // 基础影响值 = 1 - 所有变形目标影响值的总和
      morphBaseInfluence.value = 1 - this.mesh.morphTargetInfluences.reduce((a, b) => a + b, 0);
    }
  }
}

// 导出MorphNode类作为默认导出
export default MorphNode;

/**
 * TSL函数 - 用于创建变形节点
 *
 * @tsl
 * @function
 * @param {Mesh} mesh - 持有变形目标的网格
 * @returns {MorphNode}
 */
export const morphReference = /*@__PURE__*/ nodeProxy(MorphNode).setParameterLength(1);
