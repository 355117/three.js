// 导入三维向量类，用于距离计算
import { Vector3 } from "../math/Vector3.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";

// 用于距离计算的临时向量（摄像机位置）
const _v1 = /*@__PURE__*/ new Vector3();
// 用于距离计算的临时向量（LOD对象位置）
const _v2 = /*@__PURE__*/ new Vector3();

/**
 * 细节层次（Level of Detail, LOD）组件
 * 提供基础的LOD机制，根据与摄像机的距离自动切换不同细节级别的对象。
 *
 * 每个LOD级别关联一个3D对象，渲染器会根据指定的距离在它们之间切换。
 * 通常会创建多个网格：远距离（低细节）、中距离（中等细节）、近距离（高细节）。
 *
 * 使用示例：
 * ```js
 * const lod = new THREE.LOD();
 * const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
 *
 * // 创建3个不同细节级别的球体并添加到LOD中
 * for( let i = 0; i < 3; i++ ) {
 *
 * 	const geometry = new THREE.IcosahedronGeometry( 10, 3 - i );
 * 	const mesh = new THREE.Mesh( geometry, material );
 * 	lod.addLevel( mesh, i * 75 );
 *
 * }
 *
 * scene.add( lod );
 * ```
 *
 * @augments Object3D
 */
class LOD extends Object3D {
  /**
   * 构造一个新的LOD对象
   */
  constructor() {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为LOD对象
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLOD = true;

    /**
     * 当前活动的LOD级别索引
     * 用于内部跟踪当前显示的是哪个细节级别
     *
     * @private
     * @type {number}
     * @default 0
     */
    this._currentLevel = 0;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "LOD";

    // 定义levels属性，存储所有LOD级别信息
    Object.defineProperties(this, {
      /**
       * 存储LOD级别的数组
       * 每个元素包含：object（3D对象）、distance（距离阈值）、hysteresis（滞后系数）
       *
       * @name LOD#levels
       * @type {Array<{object:Object3D,distance:number,hysteresis:number}>}
       */
      levels: {
        enumerable: true,
        value: [],
      },
    });

    /**
     * 是否由渲染器自动更新LOD对象
     * 如果设置为false，需要在渲染循环中手动调用update方法
     *
     * @type {boolean}
     * @default true
     */
    this.autoUpdate = true;
  }

  /**
   * 复制另一个LOD对象的属性和级别
   * 会克隆源LOD对象的所有级别和设置
   *
   * @param {LOD} source - 要复制的源LOD对象
   * @return {LOD} 返回当前LOD对象，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法，但不复制子对象
    super.copy(source, false);

    // 获取源对象的级别数组
    const levels = source.levels;

    // 遍历并复制每个级别
    for (let i = 0, l = levels.length; i < l; i++) {
      const level = levels[i];

      // 克隆对象并添加到当前LOD中
      this.addLevel(level.object.clone(), level.distance, level.hysteresis);
    }

    // 复制自动更新设置
    this.autoUpdate = source.autoUpdate;

    return this;
  }

  /**
   * 添加一个在特定距离及更远处显示的网格对象
   * 通常距离越远，网格的细节越低
   *
   * @param {Object3D} object - 在此级别显示的3D对象
   * @param {number} [distance=0] - 显示此细节级别的距离阈值
   * @param {number} [hysteresis=0] - 用于避免LOD边界闪烁的阈值，作为距离的分数
   * @return {LOD} 返回当前LOD对象的引用，支持链式调用
   */
  addLevel(object, distance = 0, hysteresis = 0) {
    // 确保距离为正值
    distance = Math.abs(distance);

    // 获取级别数组引用
    const levels = this.levels;

    let l;

    // 找到合适的插入位置（按距离从小到大排序）
    for (l = 0; l < levels.length; l++) {
      if (distance < levels[l].distance) {
        break;
      }
    }

    // 在找到的位置插入新级别
    levels.splice(l, 0, { distance: distance, hysteresis: hysteresis, object: object });

    // 将对象添加为子对象
    this.add(object);

    return this;
  }

  /**
   * 根据距离移除现有的LOD级别
   * 如果成功移除级别则返回true，否则返回false
   *
   * @param {number} distance - 要移除的级别的距离值
   * @return {boolean} 是否成功移除级别
   */
  removeLevel(distance) {
    const levels = this.levels;

    // 遍历所有级别，查找匹配的距离
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].distance === distance) {
        // 从数组中移除级别
        const removedElements = levels.splice(i, 1);
        // 从子对象中移除对应的3D对象
        this.remove(removedElements[0].object);

        return true;
      }
    }

    return false;
  }

  /**
   * 返回当前活动的LOD级别索引
   *
   * @return {number} 当前活动的LOD级别索引
   */
  getCurrentLevel() {
    return this._currentLevel;
  }

  /**
   * 根据给定距离返回对应的3D对象
   * 查找第一个距离大于给定距离的3D对象
   *
   * @param {number} distance - LOD距离值
   * @return {Object3D|null} 找到的3D对象，如果没有找到则返回null
   */
  getObjectForDistance(distance) {
    const levels = this.levels;

    if (levels.length > 0) {
      let i, l;

      // 从第二个级别开始遍历（第一个级别是默认级别）
      for (i = 1, l = levels.length; i < l; i++) {
        let levelDistance = levels[i].distance;

        // 如果对象可见，应用滞后系数以避免闪烁
        if (levels[i].object.visible) {
          levelDistance -= levelDistance * levels[i].hysteresis;
        }

        // 如果距离小于当前级别的距离，使用前一个级别
        if (distance < levelDistance) {
          break;
        }
      }

      // 返回找到的级别对应的对象
      return levels[i - 1].object;
    }

    return null;
  }

  /**
   * 计算射线与此LOD对象的交点
   * 根据射线起点到LOD对象的距离选择合适的细节级别进行射线检测
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    const levels = this.levels;

    if (levels.length > 0) {
      // 获取LOD对象在世界坐标系中的位置
      _v1.setFromMatrixPosition(this.matrixWorld);

      // 计算射线起点到LOD对象的距离
      const distance = raycaster.ray.origin.distanceTo(_v1);

      // 根据距离获取对应的对象并进行射线检测
      this.getObjectForDistance(distance).raycast(raycaster, intersects);
    }
  }

  /**
   * 根据给定摄像机的当前距离更新LOD，计算应该显示哪个LOD级别
   * 这是LOD系统的核心方法，负责根据距离切换不同细节级别的对象
   *
   * @param {Camera} camera - 用于渲染场景的摄像机
   */
  update(camera) {
    const levels = this.levels;

    // 只有在有多个级别时才需要更新
    if (levels.length > 1) {
      // 获取摄像机在世界坐标系中的位置
      _v1.setFromMatrixPosition(camera.matrixWorld);
      // 获取LOD对象在世界坐标系中的位置
      _v2.setFromMatrixPosition(this.matrixWorld);

      // 计算摄像机到LOD对象的距离，考虑摄像机缩放
      const distance = _v1.distanceTo(_v2) / camera.zoom;

      // 默认显示第一个级别（最高细节）
      levels[0].object.visible = true;

      let i, l;

      // 遍历所有级别，确定应该显示哪个级别
      for (i = 1, l = levels.length; i < l; i++) {
        let levelDistance = levels[i].distance;

        // 如果当前级别的对象可见，应用滞后系数以避免闪烁
        if (levels[i].object.visible) {
          levelDistance -= levelDistance * levels[i].hysteresis;
        }

        // 如果距离大于等于当前级别的距离阈值，切换到当前级别
        if (distance >= levelDistance) {
          levels[i - 1].object.visible = false;
          levels[i].object.visible = true;
        } else {
          break;
        }
      }

      // 记录当前活动的级别索引
      this._currentLevel = i - 1;

      // 隐藏所有更远距离的级别
      for (; i < l; i++) {
        levels[i].object.visible = false;
      }
    }
  }

  /**
   * 将LOD对象序列化为JSON格式
   * 包含所有级别信息和设置，用于保存和加载LOD配置
   *
   * @param {Object} meta - 序列化元数据
   * @return {Object} 序列化后的JSON数据
   */
  toJSON(meta) {
    // 调用父类的toJSON方法获取基础数据
    const data = super.toJSON(meta);

    // 如果禁用了自动更新，记录此设置
    if (this.autoUpdate === false) data.object.autoUpdate = false;

    // 初始化级别数组
    data.object.levels = [];

    const levels = this.levels;

    // 遍历所有级别，序列化级别信息
    for (let i = 0, l = levels.length; i < l; i++) {
      const level = levels[i];

      // 存储级别信息（使用对象UUID而不是对象本身）
      data.object.levels.push({
        object: level.object.uuid,
        distance: level.distance,
        hysteresis: level.hysteresis,
      });
    }

    return data;
  }
}

// 导出LOD类
export { LOD };
