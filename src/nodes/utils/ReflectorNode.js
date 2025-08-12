/**
 * ReflectorNode.js - Three.js 反射器节点
 *
 * 该文件实现了用于创建镜面反射效果的节点系统。
 * 反射器可以模拟平面镜面反射，如水面、镜子等效果。
 */

// 导入核心节点类
import Node from "../core/Node.js";
// 导入纹理节点类
import TextureNode from "../accessors/TextureNode.js";
// 导入 TSL 基础工具
import { nodeObject } from "../tsl/TSLBase.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入屏幕 UV 坐标
import { screenUV } from "../display/ScreenNode.js";

// 导入 Three.js 核心常量和类
import { HalfFloatType, LinearMipMapLinearFilter, WebGPUCoordinateSystem } from "../../constants.js";
import { Plane } from "../../math/Plane.js";
import { Object3D } from "../../core/Object3D.js";
import { Vector2 } from "../../math/Vector2.js";
import { Vector3 } from "../../math/Vector3.js";
import { Vector4 } from "../../math/Vector4.js";
import { Matrix4 } from "../../math/Matrix4.js";
import { RenderTarget } from "../../core/RenderTarget.js";
import { DepthTexture } from "../../textures/DepthTexture.js";

// 私有变量：用于反射计算的临时对象，避免重复创建
const _reflectorPlane = new Plane(); // 反射平面
const _normal = new Vector3(); // 法向量
const _reflectorWorldPosition = new Vector3(); // 反射器世界坐标位置
const _cameraWorldPosition = new Vector3(); // 相机世界坐标位置
const _rotationMatrix = new Matrix4(); // 旋转矩阵
const _lookAtPosition = new Vector3(0, 0, -1); // 观察位置
const clipPlane = new Vector4(); // 裁剪平面

// 用于视图计算的临时向量
const _view = new Vector3(); // 视图向量
const _target = new Vector3(); // 目标向量
const _q = new Vector4(); // 四元数向量

// 尺寸向量
const _size = new Vector2();

// 默认渲染目标和 UV 坐标
const _defaultRT = new RenderTarget(); // 默认渲染目标
const _defaultUV = screenUV.flipX(); // 默认 UV 坐标（水平翻转）

// 为默认渲染目标设置深度纹理
_defaultRT.depthTexture = new DepthTexture(1, 1);

// 全局标志：防止反射器之间的无限递归渲染
let _inReflector = false;

/**
 * 反射器节点类 - 用于实现镜面反射效果的平面反射表面
 *
 * 该节点可以用来实现类似镜子的平面反射表面效果。
 * 常用于创建水面反射、镜子反射等视觉效果。
 *
 * 使用示例：
 * ```js
 * const groundReflector = reflector();
 * material.colorNode = groundReflector;
 *
 * const plane = new Mesh( geometry, material );
 * plane.add( groundReflector.target );
 * ```
 *
 * @augments TextureNode
 */
class ReflectorNode extends TextureNode {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 "ReflectorNode"
   */
  static get type() {
    return "ReflectorNode";
  }

  /**
   * 构造一个新的反射器节点
   *
   * @param {Object} [parameters={}] - 配置参数对象
   * @param {Object3D} [parameters.target=new Object3D()] - 反射器关联的3D对象
   * @param {number} [parameters.resolution=1] - 分辨率缩放比例
   * @param {boolean} [parameters.generateMipmaps=false] - 是否生成多级渐远纹理
   * @param {boolean} [parameters.bounces=true] - 反射器是否可以渲染其他反射器节点（避免无限递归）
   * @param {boolean} [parameters.depth=false] - 是否生成深度数据
   * @param {number} [parameters.samples] - 内部渲染目标的抗锯齿采样数
   * @param {TextureNode} [parameters.defaultTexture] - 默认纹理节点
   * @param {ReflectorBaseNode} [parameters.reflector] - 反射器基础节点
   */
  constructor(parameters = {}) {
    // 调用父类构造函数，传入默认纹理和UV坐标
    super(parameters.defaultTexture || _defaultRT.texture, _defaultUV);

    /**
     * 内部反射器基础节点的引用，包含实际的反射实现逻辑
     *
     * @private
     * @type {ReflectorBaseNode}
     * @default ReflectorBaseNode
     */
    this._reflectorBaseNode = parameters.reflector || new ReflectorBaseNode(this, parameters);

    /**
     * 内部深度节点的引用
     *
     * @private
     * @type {?Node}
     * @default null
     */
    this._depthNode = null;

    // 设置不更新矩阵（由基础节点处理）
    this.setUpdateMatrix(false);
  }

  /**
   * 获取内部反射器节点的引用
   *
   * @type {ReflectorBaseNode}
   */
  get reflector() {
    return this._reflectorBaseNode;
  }

  /**
   * 获取反射器关联的3D对象的引用
   *
   * @type {Object3D}
   */
  get target() {
    return this._reflectorBaseNode.target;
  }

  /**
   * 返回表示镜面深度的节点
   * 可用于实现更高级的反射效果，如距离衰减等
   *
   * @return {Node} 深度节点
   * @throws {Error} 当反射器未启用深度时抛出错误
   */
  getDepthNode() {
    if (this._depthNode === null) {
      // 检查反射器是否启用了深度
      if (this._reflectorBaseNode.depth !== true) {
        throw new Error("THREE.ReflectorNode: Depth node can only be requested when the reflector is created with { depth: true }. ");
      }

      // 创建深度节点，使用深度纹理
      this._depthNode = nodeObject(
        new ReflectorNode({
          defaultTexture: _defaultRT.depthTexture,
          reflector: this._reflectorBaseNode,
        })
      );
    }

    return this._depthNode;
  }

  /**
   * 设置节点构建逻辑
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {*} 父类setup方法的返回值
   */
  setup(builder) {
    // 如果不是在后处理中使用，则构建反射器基础节点
    if (!builder.object.isQuadMesh) this._reflectorBaseNode.build(builder);

    return super.setup(builder);
  }

  /**
   * 克隆当前反射器节点
   * @returns {ReflectorNode} 克隆的新节点
   */
  clone() {
    // 创建新的节点实例
    const newNode = new this.constructor(this.reflectorNode);

    // 复制所有相关属性
    newNode.uvNode = this.uvNode;
    newNode.levelNode = this.levelNode;
    newNode.biasNode = this.biasNode;
    newNode.sampler = this.sampler;
    newNode.depthNode = this.depthNode;
    newNode.compareNode = this.compareNode;
    newNode.gradNode = this.gradNode;
    newNode._reflectorBaseNode = this._reflectorBaseNode;

    return newNode;
  }

  /**
   * 释放内部资源
   * 当节点不再使用时应该调用此方法
   */
  dispose() {
    // 调用父类的dispose方法
    super.dispose();

    // 释放反射器基础节点的资源
    this._reflectorBaseNode.dispose();
  }
}

/**
 * 反射器基础节点类 - 包含反射器的实际实现逻辑
 *
 * 该类包含了反射器的核心实现。之所以将逻辑分离到基础节点中，
 * 是为了更好的代码组织和复用性。原本所有逻辑都在 ReflectorNode 中实现，
 * 参见 issue #29619。
 *
 * @private
 * @augments Node
 */
class ReflectorBaseNode extends Node {
  /**
   * 获取节点类型名称
   * @returns {string} 返回 "ReflectorBaseNode"
   */
  static get type() {
    return "ReflectorBaseNode";
  }

  /**
   * 构造一个新的反射器基础节点
   *
   * @param {TextureNode} textureNode - 表示渲染反射结果的纹理节点
   * @param {Object} [parameters={}] - 配置参数对象
   * @param {Object3D} [parameters.target=new Object3D()] - 反射器关联的3D对象
   * @param {number} [parameters.resolution=1] - 分辨率缩放比例
   * @param {boolean} [parameters.generateMipmaps=false] - 是否生成多级渐远纹理
   * @param {boolean} [parameters.bounces=true] - 反射器是否可以渲染其他反射器节点
   * @param {boolean} [parameters.depth=false] - 是否生成深度数据
   * @param {number} [parameters.samples] - 内部渲染目标的抗锯齿采样数
   */
  constructor(textureNode, parameters = {}) {
    super();

    // 解构参数，设置默认值
    const { target = new Object3D(), resolution = 1, generateMipmaps = false, bounces = true, depth = false, samples = 0 } = parameters;

    /**
     * 表示渲染反射结果的纹理节点
     *
     * @type {TextureNode}
     */
    this.textureNode = textureNode;

    /**
     * 反射器关联的3D对象
     *
     * @type {Object3D}
     * @default {new Object3D()}
     */
    this.target = target;

    /**
     * 分辨率缩放比例
     *
     * @type {number}
     * @default {1}
     */
    this.resolution = resolution;

    /**
     * 是否生成多级渐远纹理
     *
     * @type {boolean}
     * @default {false}
     */
    this.generateMipmaps = generateMipmaps;

    /**
     * 反射器是否可以渲染其他反射器节点
     * 设为false可以避免反射器之间的无限递归渲染
     *
     * @type {boolean}
     * @default {true}
     */
    this.bounces = bounces;

    /**
     * 是否生成深度数据
     *
     * @type {boolean}
     * @default {false}
     */
    this.depth = depth;

    /**
     * 内部渲染目标的抗锯齿采样数
     *
     * @type {number}
     * @default {0}
     */
    this.samples = samples;

    /**
     * 节点更新类型
     * 当 bounces 为 true 时设置为 NodeUpdateType.RENDER，
     * 否则设置为 NodeUpdateType.FRAME
     *
     * @type {string}
     * @default 'render'
     */
    this.updateBeforeType = bounces ? NodeUpdateType.RENDER : NodeUpdateType.FRAME;

    /**
     * 用于管理虚拟相机的弱映射
     * 每个真实相机对应一个虚拟相机用于反射渲染
     *
     * @type {WeakMap<Camera, Camera>}
     */
    this.virtualCameras = new WeakMap();

    /**
     * 用于管理渲染目标的映射
     * 每个相机对应一个渲染目标
     *
     * @type {Map<Camera, RenderTarget>}
     */
    this.renderTargets = new Map();

    /**
     * 强制渲染标志
     * 即使反射器背对相机也强制渲染
     *
     * @type {boolean}
     * @default {false}
     */
    this.forceUpdate = false;

    /**
     * 反射器是否已渲染的标志
     *
     * 当反射器背对相机时，此标志设为 false，
     * 纹理将为空（黑色）
     *
     * @type {boolean}
     * @default {false}
     */
    this.hasOutput = false;
  }

  /**
   * 更新内部渲染目标的分辨率
   *
   * @private
   * @param {RenderTarget} renderTarget - 要调整大小的渲染目标
   * @param {Renderer} renderer - 用于确定新尺寸的渲染器
   */
  _updateResolution(renderTarget, renderer) {
    const resolution = this.resolution;

    // 获取渲染器的绘制缓冲区大小
    renderer.getDrawingBufferSize(_size);

    // 根据分辨率缩放比例设置渲染目标大小
    renderTarget.setSize(Math.round(_size.width * resolution), Math.round(_size.height * resolution));
  }

  /**
   * 设置节点构建逻辑
   * @param {NodeBuilder} builder - 节点构建器
   * @returns {*} 父类setup方法的返回值
   */
  setup(builder) {
    // 更新默认渲染目标的分辨率
    this._updateResolution(_defaultRT, builder.renderer);

    return super.setup(builder);
  }

  /**
   * 释放内部资源
   * 当节点不再使用时应该调用此方法
   */
  dispose() {
    // 调用父类的dispose方法
    super.dispose();

    // 释放所有渲染目标
    for (const renderTarget of this.renderTargets.values()) {
      renderTarget.dispose();
    }
  }

  /**
   * 获取指定相机对应的虚拟相机
   * 虚拟相机用于从反射器的视角渲染场景，以产生正确的反射效果
   *
   * @param {Camera} camera - 场景中的相机
   * @return {Camera} 对应的虚拟相机
   */
  getVirtualCamera(camera) {
    // 从弱映射中获取虚拟相机
    let virtualCamera = this.virtualCameras.get(camera);

    if (virtualCamera === undefined) {
      // 如果不存在，则克隆原相机创建虚拟相机
      virtualCamera = camera.clone();

      // 将虚拟相机存储到弱映射中
      this.virtualCameras.set(camera, virtualCamera);
    }

    return virtualCamera;
  }

  /**
   * 获取指定相机对应的渲染目标
   * 反射效果将渲染到这个渲染目标中
   *
   * @param {Camera} camera - 场景中的相机
   * @return {RenderTarget} 渲染目标
   */
  getRenderTarget(camera) {
    // 从映射中获取渲染目标
    let renderTarget = this.renderTargets.get(camera);

    if (renderTarget === undefined) {
      // 如果不存在，则创建新的渲染目标
      // 使用半精度浮点类型和指定的采样数
      renderTarget = new RenderTarget(0, 0, { type: HalfFloatType, samples: this.samples });

      // 如果启用了多级渐远纹理生成
      if (this.generateMipmaps === true) {
        renderTarget.texture.minFilter = LinearMipMapLinearFilter;
        renderTarget.texture.generateMipmaps = true;
      }

      // 如果启用了深度数据
      if (this.depth === true) {
        renderTarget.depthTexture = new DepthTexture();
      }

      // 将渲染目标存储到映射中
      this.renderTargets.set(camera, renderTarget);
    }

    return renderTarget;
  }

  /**
   * 在渲染前更新反射器
   * 这是反射渲染的核心方法，包含了复杂的反射计算和渲染逻辑
   *
   * @param {Object} frame - 渲染帧信息
   * @param {Scene} frame.scene - 场景对象
   * @param {Camera} frame.camera - 相机对象
   * @param {Renderer} frame.renderer - 渲染器对象
   * @param {Material} frame.material - 材质对象
   */
  updateBefore(frame) {
    // 如果禁用反弹且当前在反射器中，则跳过渲染（避免无限递归）
    if (this.bounces === false && _inReflector) return false;

    // 设置反射器状态标志
    _inReflector = true;

    // 解构帧信息
    const { scene, camera, renderer, material } = frame;
    const { target } = this;

    // 获取虚拟相机和渲染目标
    const virtualCamera = this.getVirtualCamera(camera);
    const renderTarget = this.getRenderTarget(virtualCamera);

    // 获取渲染器绘制缓冲区大小
    renderer.getDrawingBufferSize(_size);

    // 更新渲染目标分辨率
    this._updateResolution(renderTarget, renderer);

    // === 反射计算开始 ===

    // 获取反射器和相机的世界坐标位置
    _reflectorWorldPosition.setFromMatrixPosition(target.matrixWorld);
    _cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

    // 提取反射器的旋转矩阵
    _rotationMatrix.extractRotation(target.matrixWorld);

    // 计算反射器的法向量（初始为Z轴正方向）
    _normal.set(0, 0, 1);
    _normal.applyMatrix4(_rotationMatrix);

    // 计算从相机到反射器的视图向量
    _view.subVectors(_reflectorWorldPosition, _cameraWorldPosition);

    // 检查反射器是否背对相机（避免不必要的渲染）
    const isFacingAway = _view.dot(_normal) > 0;

    let needsClear = false;

    // 如果反射器背对相机且未强制更新
    if (isFacingAway === true && this.forceUpdate === false) {
      // 如果之前没有输出，直接返回
      if (this.hasOutput === false) {
        _inReflector = false;
        return;
      }

      // 标记需要清除渲染目标
      needsClear = true;
    }

    // 计算反射后的视图位置
    _view.reflect(_normal).negate();
    _view.add(_reflectorWorldPosition);

    // 提取相机的旋转矩阵
    _rotationMatrix.extractRotation(camera.matrixWorld);

    // 计算相机的观察方向（初始为Z轴负方向）
    _lookAtPosition.set(0, 0, -1);
    _lookAtPosition.applyMatrix4(_rotationMatrix);
    _lookAtPosition.add(_cameraWorldPosition);

    // 计算反射后的目标位置
    _target.subVectors(_reflectorWorldPosition, _lookAtPosition);
    _target.reflect(_normal).negate();
    _target.add(_reflectorWorldPosition);

    // === 设置虚拟相机 ===

    // 设置虚拟相机的坐标系统
    virtualCamera.coordinateSystem = camera.coordinateSystem;

    // 设置虚拟相机位置为反射后的视图位置
    virtualCamera.position.copy(_view);

    // 设置虚拟相机的上方向向量
    virtualCamera.up.set(0, 1, 0);
    virtualCamera.up.applyMatrix4(_rotationMatrix);
    virtualCamera.up.reflect(_normal);

    // 让虚拟相机看向反射后的目标位置
    virtualCamera.lookAt(_target);

    // 复制原相机的近远裁剪面
    virtualCamera.near = camera.near;
    virtualCamera.far = camera.far;

    // 更新虚拟相机的世界矩阵
    virtualCamera.updateMatrixWorld();

    // 复制原相机的投影矩阵
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    // === 斜投影裁剪平面计算 ===
    // 使用斜投影技术更新投影矩阵，实现代码参考：
    // http://www.terathon.com/code/oblique.html
    // 技术论文：http://www.terathon.com/lengyel/Lengyel-Oblique.pdf

    // 根据法向量和共面点设置反射平面
    _reflectorPlane.setFromNormalAndCoplanarPoint(_normal, _reflectorWorldPosition);

    // 将反射平面转换到虚拟相机的视图空间
    _reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

    // 设置裁剪平面向量
    clipPlane.set(_reflectorPlane.normal.x, _reflectorPlane.normal.y, _reflectorPlane.normal.z, _reflectorPlane.constant);

    // 获取虚拟相机的投影矩阵
    const projectionMatrix = virtualCamera.projectionMatrix;

    // 计算裁剪平面的缩放因子
    // 这些计算基于投影矩阵的特定元素
    _q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
    _q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
    _q.z = -1.0;
    _q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

    // 计算缩放后的平面向量
    clipPlane.multiplyScalar(1.0 / clipPlane.dot(_q));

    // 裁剪偏移量（通常为0）
    const clipBias = 0;

    // 替换投影矩阵的第三行以实现斜投影
    projectionMatrix.elements[2] = clipPlane.x;
    projectionMatrix.elements[6] = clipPlane.y;
    // 根据坐标系统调整Z分量
    projectionMatrix.elements[10] = renderer.coordinateSystem === WebGPUCoordinateSystem ? clipPlane.z - clipBias : clipPlane.z + 1.0 - clipBias;
    projectionMatrix.elements[14] = clipPlane.w;

    // === 渲染反射 ===

    // 将渲染目标的纹理设置为纹理节点的值
    this.textureNode.value = renderTarget.texture;

    // 如果启用了深度，设置深度纹理
    if (this.depth === true) {
      this.textureNode.getDepthNode().value = renderTarget.depthTexture;
    }

    // 隐藏当前材质，避免在反射中渲染自身
    material.visible = false;

    // 保存当前渲染器状态
    const currentRenderTarget = renderer.getRenderTarget();
    const currentMRT = renderer.getMRT();
    const currentAutoClear = renderer.autoClear;

    // 设置渲染器状态用于反射渲染
    renderer.setMRT(null); // 清除多渲染目标
    renderer.setRenderTarget(renderTarget); // 设置反射渲染目标
    renderer.autoClear = true; // 启用自动清除

    if (needsClear) {
      // 如果需要清除（反射器背对相机），只清除渲染目标
      renderer.clear();
      this.hasOutput = false;
    } else {
      // 使用虚拟相机渲染场景到反射渲染目标
      renderer.render(scene, virtualCamera);
      this.hasOutput = true;
    }

    // 恢复渲染器状态
    renderer.setMRT(currentMRT);
    renderer.setRenderTarget(currentRenderTarget);
    renderer.autoClear = currentAutoClear;

    // 恢复材质可见性
    material.visible = true;

    // 重置反射器状态标志
    _inReflector = false;

    // 重置强制更新标志
    this.forceUpdate = false;
  }
}

/**
 * TSL 函数：创建反射器节点
 *
 * 这是一个便捷的工厂函数，用于创建反射器节点实例。
 * 该函数遵循 Three.js 的 TSL（Three.js Shading Language）规范。
 *
 * @tsl
 * @function
 * @param {Object} [parameters={}] - 配置参数对象
 * @param {Object3D} [parameters.target=new Object3D()] - 反射器关联的3D对象
 * @param {number} [parameters.resolution=1] - 分辨率缩放比例
 * @param {boolean} [parameters.generateMipmaps=false] - 是否生成多级渐远纹理
 * @param {boolean} [parameters.bounces=true] - 反射器是否可以渲染其他反射器节点
 * @param {boolean} [parameters.depth=false] - 是否生成深度数据
 * @param {number} [parameters.samples] - 内部渲染目标的抗锯齿采样数
 * @param {TextureNode} [parameters.defaultTexture] - 默认纹理节点
 * @param {ReflectorBaseNode} [parameters.reflector] - 反射器基础节点
 * @returns {ReflectorNode} 创建的反射器节点实例
 */
export const reflector = (parameters) => nodeObject(new ReflectorNode(parameters));

// 导出默认类
export default ReflectorNode;
