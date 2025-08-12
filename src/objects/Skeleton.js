// 导入纹理格式常量，用于骨骼纹理
import {
  RGBAFormat, // RGBA格式
  FloatType, // 浮点数类型
} from "../constants.js";
// 导入骨骼类，骨骼是骨架的基本组成单元
import { Bone } from "./Bone.js";
// 导入4x4矩阵类，用于骨骼变换计算
import { Matrix4 } from "../math/Matrix4.js";
// 导入数据纹理类，用于将骨骼数据传递给着色器
import { DataTexture } from "../textures/DataTexture.js";
// 导入UUID生成函数，用于创建唯一标识符
import { generateUUID } from "../math/MathUtils.js";

// 用于计算偏移矩阵的临时矩阵
const _offsetMatrix = /*@__PURE__*/ new Matrix4();
// 单位矩阵，用于默认变换
const _identityMatrix = /*@__PURE__*/ new Matrix4();

/**
 * 表示Three.js中骨架的类
 * 骨架由骨骼的层次结构定义，用于骨骼动画和蒙皮网格
 *
 * 使用示例：
 * ```js
 * const bones = [];
 *
 * const shoulder = new THREE.Bone();
 * const elbow = new THREE.Bone();
 * const hand = new THREE.Bone();
 *
 * shoulder.add( elbow );
 * elbow.add( hand );
 *
 * bones.push( shoulder , elbow, hand);
 *
 * shoulder.position.y = -5;
 * elbow.position.y = 0;
 * hand.position.y = 5;
 *
 * const armSkeleton = new THREE.Skeleton( bones );
 * ```
 */
class Skeleton {
  /**
   * 构造一个新的骨架
   *
   * @param {Array<Bone>} [bones] - 骨骼数组，定义骨架的结构
   * @param {Array<Matrix4>} [boneInverses] - 骨骼逆矩阵数组
   * 如果未提供，这些矩阵将通过calculateInverses方法自动计算
   */
  constructor(bones = [], boneInverses = []) {
    // 生成唯一标识符
    this.uuid = generateUUID();

    /**
     * 定义骨架的骨骼数组
     * 包含所有参与动画的骨骼对象
     *
     * @type {Array<Bone>}
     */
    this.bones = bones.slice(0);

    /**
     * 骨骼逆矩阵数组
     * 用于将顶点从绑定姿势转换到骨骼空间
     *
     * @type {Array<Matrix4>}
     */
    this.boneInverses = boneInverses;

    /**
     * 存储骨骼数据的数组缓冲区
     * 作为boneTexture的输入数据
     *
     * @type {?Float32Array}
     * @default null
     */
    this.boneMatrices = null;

    /**
     * 存储骨骼数据的纹理
     * 用于在顶点着色器中使用骨骼数据
     *
     * @type {?DataTexture}
     * @default null
     */
    this.boneTexture = null;

    // 初始化骨架
    this.init();
  }

  /**
   * 初始化骨架
   * 此方法由构造函数自动调用，但根据骨架的创建方式，
   * 可能需要手动调用此方法
   */
  init() {
    // 获取骨骼和骨骼逆矩阵数组的引用
    const bones = this.bones;
    const boneInverses = this.boneInverses;

    // 创建骨骼矩阵数组（每个矩阵16个浮点数）
    this.boneMatrices = new Float32Array(bones.length * 16);

    // 如果需要，计算骨骼逆矩阵

    if (boneInverses.length === 0) {
      // 如果没有提供逆矩阵，自动计算
      this.calculateInverses();
    } else {
      // 处理特殊情况：检查骨骼数量与逆矩阵数量是否匹配

      if (bones.length !== boneInverses.length) {
        // 数量不匹配时发出警告
        console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones.");

        // 重置逆矩阵数组
        this.boneInverses = [];

        // 为每个骨骼创建单位逆矩阵
        for (let i = 0, il = this.bones.length; i < il; i++) {
          this.boneInverses.push(new Matrix4());
        }
      }
    }
  }

  /**
   * 计算骨骼逆矩阵
   * 此方法重置boneInverses数组并填充新的矩阵
   */
  calculateInverses() {
    // 清空逆矩阵数组
    this.boneInverses.length = 0;

    // 为每个骨骼计算逆矩阵
    for (let i = 0, il = this.bones.length; i < il; i++) {
      const inverse = new Matrix4();

      if (this.bones[i]) {
        // 复制骨骼的世界矩阵并求逆
        inverse.copy(this.bones[i].matrixWorld).invert();
      }

      // 添加到逆矩阵数组
      this.boneInverses.push(inverse);
    }
  }

  /**
   * 将骨架重置为基础姿势（绑定姿势）
   * 恢复骨骼到初始绑定时的状态
   */
  pose() {
    // 第一步：恢复绑定时的世界矩阵

    for (let i = 0, il = this.bones.length; i < il; i++) {
      const bone = this.bones[i];

      if (bone) {
        // 通过逆矩阵的逆运算恢复绑定时的世界矩阵
        bone.matrixWorld.copy(this.boneInverses[i]).invert();
      }
    }

    // 第二步：计算本地矩阵、位置、旋转和缩放

    for (let i = 0, il = this.bones.length; i < il; i++) {
      const bone = this.bones[i];

      if (bone) {
        if (bone.parent && bone.parent.isBone) {
          // 如果有父骨骼，计算相对于父骨骼的本地变换
          bone.matrix.copy(bone.parent.matrixWorld).invert();
          bone.matrix.multiply(bone.matrixWorld);
        } else {
          // 如果是根骨骼，本地矩阵等于世界矩阵
          bone.matrix.copy(bone.matrixWorld);
        }

        // 将矩阵分解为位置、旋转和缩放
        bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
      }
    }
  }

  /**
   * 更新骨架的骨骼矩阵数据
   * 计算当前姿势与绑定姿势之间的偏移，并更新骨骼纹理
   */
  update() {
    // 获取骨骼、逆矩阵、矩阵数组和纹理的引用
    const bones = this.bones;
    const boneInverses = this.boneInverses;
    const boneMatrices = this.boneMatrices;
    const boneTexture = this.boneTexture;

    // 将骨骼矩阵展平到数组中

    for (let i = 0, il = bones.length; i < il; i++) {
      // 计算当前变换与原始变换之间的偏移

      // 获取骨骼的当前世界矩阵，如果骨骼不存在则使用单位矩阵
      const matrix = bones[i] ? bones[i].matrixWorld : _identityMatrix;

      // 计算偏移矩阵：当前世界矩阵 × 绑定时的逆矩阵
      _offsetMatrix.multiplyMatrices(matrix, boneInverses[i]);
      // 将矩阵数据写入数组（每个矩阵16个浮点数）
      _offsetMatrix.toArray(boneMatrices, i * 16);
    }

    // 如果存在骨骼纹理，标记需要更新
    if (boneTexture !== null) {
      boneTexture.needsUpdate = true;
    }
  }

  /**
   * 返回此实例的克隆骨架
   * 复制骨骼和逆矩阵数组
   *
   * @return {Skeleton} 此实例的克隆
   */
  clone() {
    return new Skeleton(this.bones, this.boneInverses);
  }

  /**
   * 计算用于向顶点着色器传递骨骼数据的数据纹理
   * 将骨骼矩阵数据打包到纹理中以提高GPU性能
   *
   * @return {Skeleton} 此实例的引用，支持链式调用
   */
  computeBoneTexture() {
    // 纹理布局（1个矩阵 = 4个像素）
    //      RGBA RGBA RGBA RGBA (=> 第1列, 第2列, 第3列, 第4列)
    //  8x8   像素纹理最多   16个骨骼 * 4像素 =  (8 * 8)
    //  16x16 像素纹理最多   64个骨骼 * 4像素 = (16 * 16)
    //  32x32 像素纹理最多  256个骨骼 * 4像素 = (32 * 32)
    //  64x64 像素纹理最多 1024个骨骼 * 4像素 = (64 * 64)

    // 计算纹理尺寸（每个矩阵需要4个像素）
    let size = Math.sqrt(this.bones.length * 4);
    // 向上取整到4的倍数
    size = Math.ceil(size / 4) * 4;
    // 最小尺寸为4
    size = Math.max(size, 4);

    // 创建骨骼矩阵数组（每个RGBA像素4个浮点数）
    const boneMatrices = new Float32Array(size * size * 4);
    // 复制当前的骨骼矩阵数据
    boneMatrices.set(this.boneMatrices);

    // 创建数据纹理
    const boneTexture = new DataTexture(boneMatrices, size, size, RGBAFormat, FloatType);
    // 标记纹理需要更新
    boneTexture.needsUpdate = true;

    // 更新实例属性
    this.boneMatrices = boneMatrices;
    this.boneTexture = boneTexture;

    return this;
  }

  /**
   * 在骨架的骨骼数组中搜索并返回第一个匹配名称的骨骼
   *
   * @param {string} name - 骨骼的名称
   * @return {Bone|undefined} 找到的骨骼，如果没有找到则返回undefined
   */
  getBoneByName(name) {
    // 遍历所有骨骼
    for (let i = 0, il = this.bones.length; i < il; i++) {
      const bone = this.bones[i];

      // 检查名称是否匹配
      if (bone.name === name) {
        return bone;
      }
    }

    // 没有找到匹配的骨骼
    return undefined;
  }

  /**
   * 释放此实例分配的GPU相关资源
   * 当此实例在应用中不再使用时调用此方法
   */
  dispose() {
    // 如果存在骨骼纹理，释放其资源
    if (this.boneTexture !== null) {
      this.boneTexture.dispose();

      this.boneTexture = null;
    }
  }

  /**
   * 通过给定的JSON和骨骼设置骨架
   * 从序列化数据中恢复骨架状态
   *
   * @param {Object} json - 序列化的骨架JSON数据
   * @param {Object<string, Bone>} bones - 骨骼字典，键为UUID，值为骨骼对象
   * @return {Skeleton} 此实例的引用，支持链式调用
   */
  fromJSON(json, bones) {
    // 设置UUID
    this.uuid = json.uuid;

    // 遍历JSON中的骨骼数据
    for (let i = 0, l = json.bones.length; i < l; i++) {
      const uuid = json.bones[i];
      let bone = bones[uuid];

      // 如果找不到对应的骨骼，创建一个新的并发出警告
      if (bone === undefined) {
        console.warn("THREE.Skeleton: No bone found with UUID:", uuid);
        bone = new Bone();
      }

      // 添加骨骼到数组
      this.bones.push(bone);
      // 从数组数据创建逆矩阵并添加到数组
      this.boneInverses.push(new Matrix4().fromArray(json.boneInverses[i]));
    }

    // 初始化骨架
    this.init();

    return this;
  }

  /**
   * 将骨架序列化为JSON格式
   * 用于保存和传输骨架数据
   *
   * @return {Object} 表示序列化骨架的JSON对象
   * @see {@link ObjectLoader#parse}
   */
  toJSON() {
    // 创建序列化数据结构
    const data = {
      metadata: {
        version: 4.7,
        type: "Skeleton",
        generator: "Skeleton.toJSON",
      },
      bones: [],
      boneInverses: [],
    };

    // 设置UUID
    data.uuid = this.uuid;

    // 获取骨骼和逆矩阵数组的引用
    const bones = this.bones;
    const boneInverses = this.boneInverses;

    // 遍历所有骨骼，序列化其UUID和逆矩阵
    for (let i = 0, l = bones.length; i < l; i++) {
      const bone = bones[i];
      // 存储骨骼的UUID
      data.bones.push(bone.uuid);

      const boneInverse = boneInverses[i];
      // 将逆矩阵转换为数组格式存储
      data.boneInverses.push(boneInverse.toArray());
    }

    return data;
  }
}

// 导出骨架类
export { Skeleton };
