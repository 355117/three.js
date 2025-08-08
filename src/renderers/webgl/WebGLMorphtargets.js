/**
 * 导入浮点数类型常量
 */
import { FloatType } from "../../constants.js";
/**
 * 导入数据数组纹理类，用于存储变形目标数据
 */
import { DataArrayTexture } from "../../textures/DataArrayTexture.js";
/**
 * 导入四维向量类，用于处理变形数据
 */
import { Vector4 } from "../../math/Vector4.js";
/**
 * 导入二维向量类，用于存储纹理尺寸
 */
import { Vector2 } from "../../math/Vector2.js";

/**
 * WebGL 变形目标管理器
 * 负责管理和更新 WebGL 渲染器中的变形目标（Morph Targets）
 * 变形目标用于实现顶点动画，如面部表情、肌肉变形等
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {WebGLCapabilities} capabilities - WebGL 能力检测对象
 * @param {WebGLTextures} textures - WebGL 纹理管理器
 * @returns {Object} 返回包含变形目标管理方法的对象
 */
function WebGLMorphtargets(gl, capabilities, textures) {
  /**
   * 存储几何体对应的变形纹理的弱映射表
   * 使用 WeakMap 确保当几何体被垃圾回收时，对应的纹理也会被自动清理
   */
  const morphTextures = new WeakMap();

  /**
   * 临时向量，用于从缓冲区属性中读取变形数据
   */
  const morph = new Vector4();

  /**
   * 更新对象的变形目标数据
   * 将变形目标编码到数据纹理中，每一层代表一个变形目标
   *
   * @param {Object3D} object - 要更新变形目标的 3D 对象
   * @param {BufferGeometry} geometry - 对象的几何体
   * @param {WebGLProgram} program - WebGL 着色器程序
   */
  function update(object, geometry, program) {
    // 获取对象的变形目标影响权重数组
    const objectInfluences = object.morphTargetInfluences;

    // 以下代码将变形目标编码到数据纹理数组中，每一层代表一个变形目标
    // the following encodes morph targets into an array of data textures. Each layer represents a single morph target.

    // 获取变形属性（位置、法线或颜色中的任意一个）
    const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
    // 计算变形目标的数量
    const morphTargetsCount = morphAttribute !== undefined ? morphAttribute.length : 0;

    // 获取该几何体对应的变形纹理条目
    let entry = morphTextures.get(geometry);

    // 如果纹理条目不存在或变形目标数量发生变化，需要重新创建纹理
    if (entry === undefined || entry.count !== morphTargetsCount) {
      // 如果已存在旧纹理，先销毁它
      if (entry !== undefined) entry.texture.dispose();

      // 检查几何体是否包含各种类型的变形属性
      const hasMorphPosition = geometry.morphAttributes.position !== undefined;
      const hasMorphNormals = geometry.morphAttributes.normal !== undefined;
      const hasMorphColors = geometry.morphAttributes.color !== undefined;

      // 获取各种类型的变形目标数组
      const morphTargets = geometry.morphAttributes.position || [];
      const morphNormals = geometry.morphAttributes.normal || [];
      const morphColors = geometry.morphAttributes.color || [];

      // 计算每个顶点需要存储的数据类型数量
      let vertexDataCount = 0;

      if (hasMorphPosition === true) vertexDataCount = 1; // 位置数据
      if (hasMorphNormals === true) vertexDataCount = 2; // 位置 + 法线数据
      if (hasMorphColors === true) vertexDataCount = 3; // 位置 + 法线 + 颜色数据

      // 计算纹理的宽度和高度
      let width = geometry.attributes.position.count * vertexDataCount;
      let height = 1;

      // 如果宽度超过最大纹理尺寸，调整为多行布局
      if (width > capabilities.maxTextureSize) {
        height = Math.ceil(width / capabilities.maxTextureSize);
        width = capabilities.maxTextureSize;
      }

      // 创建浮点数缓冲区，每个像素4个分量（RGBA），存储所有变形目标数据
      const buffer = new Float32Array(width * height * 4 * morphTargetsCount);

      // 创建数据数组纹理，每一层存储一个变形目标的数据
      const texture = new DataArrayTexture(buffer, width, height, morphTargetsCount);
      texture.type = FloatType; // 设置为浮点数类型
      texture.needsUpdate = true; // 标记需要更新到 GPU

      // 填充缓冲区数据
      // fill buffer

      // 每个顶点数据的步长（每种数据类型占4个浮点数）
      const vertexDataStride = vertexDataCount * 4;

      // 遍历每个变形目标
      for (let i = 0; i < morphTargetsCount; i++) {
        const morphTarget = morphTargets[i]; // 当前变形目标的位置数据
        const morphNormal = morphNormals[i]; // 当前变形目标的法线数据
        const morphColor = morphColors[i]; // 当前变形目标的颜色数据

        // 计算当前变形目标在缓冲区中的起始偏移量
        const offset = width * height * 4 * i;

        // 遍历当前变形目标的每个顶点
        for (let j = 0; j < morphTarget.count; j++) {
          // 计算当前顶点在缓冲区中的步长偏移
          const stride = j * vertexDataStride;

          // 如果有位置变形数据，填充位置信息（占用前4个分量）
          if (hasMorphPosition === true) {
            morph.fromBufferAttribute(morphTarget, j);

            buffer[offset + stride + 0] = morph.x; // X 坐标
            buffer[offset + stride + 1] = morph.y; // Y 坐标
            buffer[offset + stride + 2] = morph.z; // Z 坐标
            buffer[offset + stride + 3] = 0; // W 分量（未使用）
          }

          // 如果有法线变形数据，填充法线信息（占用第5-8个分量）
          if (hasMorphNormals === true) {
            morph.fromBufferAttribute(morphNormal, j);

            buffer[offset + stride + 4] = morph.x; // 法线 X 分量
            buffer[offset + stride + 5] = morph.y; // 法线 Y 分量
            buffer[offset + stride + 6] = morph.z; // 法线 Z 分量
            buffer[offset + stride + 7] = 0; // W 分量（未使用）
          }

          // 如果有颜色变形数据，填充颜色信息（占用第9-12个分量）
          if (hasMorphColors === true) {
            morph.fromBufferAttribute(morphColor, j);

            buffer[offset + stride + 8] = morph.x; // 红色分量
            buffer[offset + stride + 9] = morph.y; // 绿色分量
            buffer[offset + stride + 10] = morph.z; // 蓝色分量
            // Alpha 分量：如果原始数据有4个分量则使用 w，否则默认为1
            buffer[offset + stride + 11] = morphColor.itemSize === 4 ? morph.w : 1;
          }
        }
      }

      // 创建新的纹理条目
      entry = {
        count: morphTargetsCount, // 变形目标数量
        texture: texture, // 数据纹理
        size: new Vector2(width, height), // 纹理尺寸
      };

      // 将新条目与几何体关联
      morphTextures.set(geometry, entry);

      /**
       * 纹理销毁函数
       * 当几何体被销毁时，清理相关的变形纹理资源
       */
      function disposeTexture() {
        // 销毁纹理资源
        texture.dispose();

        // 从映射表中删除条目
        morphTextures.delete(geometry);

        // 移除事件监听器，避免内存泄漏
        geometry.removeEventListener("dispose", disposeTexture);
      }

      // 为几何体添加销毁事件监听器
      geometry.addEventListener("dispose", disposeTexture);
    }

    // 设置着色器 uniform 变量
    if (object.isInstancedMesh === true && object.morphTexture !== null) {
      // 对于实例化网格，如果有自定义变形纹理，使用该纹理
      program.getUniforms().setValue(gl, "morphTexture", object.morphTexture, textures);
    } else {
      // 计算所有变形目标影响权重的总和
      let morphInfluencesSum = 0;

      for (let i = 0; i < objectInfluences.length; i++) {
        morphInfluencesSum += objectInfluences[i];
      }

      // 计算基础影响权重
      // 如果是相对变形，基础权重为1；否则为 1 - 所有变形权重之和
      const morphBaseInfluence = geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;

      // 设置基础影响权重和各个变形目标的影响权重
      program.getUniforms().setValue(gl, "morphTargetBaseInfluence", morphBaseInfluence);
      program.getUniforms().setValue(gl, "morphTargetInfluences", objectInfluences);
    }

    // 设置变形目标纹理和纹理尺寸
    program.getUniforms().setValue(gl, "morphTargetsTexture", entry.texture, textures);
    program.getUniforms().setValue(gl, "morphTargetsTextureSize", entry.size);
  }

  // 返回变形目标管理器的公共接口
  return {
    update: update, // 更新变形目标数据
  };
}

/**
 * 导出 WebGL 变形目标管理器
 */
export { WebGLMorphtargets };
