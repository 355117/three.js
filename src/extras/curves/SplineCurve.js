// 导入基础曲线类
import { Curve } from "../core/Curve.js";
// 导入Catmull-Rom插值函数
import { CatmullRom } from "../core/Interpolations.js";
// 导入二维向量类
import { Vector2 } from "../../math/Vector2.js";

/**
 * 表示2D样条曲线的类
 * 样条曲线通过一系列控制点生成平滑的曲线，使用Catmull-Rom插值算法
 * 与CatmullRomCurve3不同，这是2D版本，只处理x和y坐标
 *
 * ```js
 * // 创建一个类似正弦波的曲线
 * const curve = new THREE.SplineCurve( [
 * 	new THREE.Vector2( -10, 0 ),  // 控制点1
 * 	new THREE.Vector2( -5, 5 ),   // 控制点2
 * 	new THREE.Vector2( 0, 0 ),    // 控制点3
 * 	new THREE.Vector2( 5, -5 ),   // 控制点4
 * 	new THREE.Vector2( 10, 0 )    // 控制点5
 * ] );
 *
 * const points = curve.getPoints( 50 );  // 获取曲线上的50个点
 * const geometry = new THREE.BufferGeometry().setFromPoints( points );
 *
 * const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
 *
 * // 创建最终的对象并添加到场景中
 * const splineObject = new THREE.Line( geometry, material );
 * ```
 *
 * @augments Curve
 */
class SplineCurve extends Curve {
  /**
   * 构造一个新的2D样条曲线
   *
   * @param {Array<Vector2>} [points] - 定义曲线的2D点数组
   */
  constructor(points = []) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为SplineCurve类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSplineCurve = true;

    // 设置曲线类型标识符
    this.type = "SplineCurve";

    /**
     * 定义曲线的2D点数组
     * 这些点作为样条曲线的控制点，曲线会平滑地通过这些点
     *
     * @type {Array<Vector2>}
     */
    this.points = points;
  }

  /**
   * 返回样条曲线上指定参数位置的点
   * 使用Catmull-Rom插值算法计算平滑的曲线点
   *
   * @param {number} t - 插值因子，表示曲线上的位置，必须在[0,1]范围内
   * @param {Vector2} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector2} 样条曲线上的位置点
   */
  getPoint(t, optionalTarget = new Vector2()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 获取控制点数组
    const points = this.points;
    // 计算在点数组中的浮点位置
    const p = (points.length - 1) * t;

    // 获取整数部分（段索引）
    const intPoint = Math.floor(p);
    // 获取小数部分（段内权重）
    const weight = p - intPoint;

    // 获取Catmull-Rom插值所需的4个控制点
    // p0: 前一个点（用于计算切线）
    const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
    // p1: 当前段的起点
    const p1 = points[intPoint];
    // p2: 当前段的终点
    const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
    // p3: 后一个点（用于计算切线）
    const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

    // 使用Catmull-Rom插值分别计算x和y坐标
    point.set(
      CatmullRom(weight, p0.x, p1.x, p2.x, p3.x), // 计算x坐标
      CatmullRom(weight, p0.y, p1.y, p2.y, p3.y) // 计算y坐标
    );

    // 返回计算得到的点
    return point;
  }

  /**
   * 复制另一个样条曲线的属性到当前对象
   *
   * @param {SplineCurve} source - 要复制的源样条曲线对象
   * @return {SplineCurve} 返回当前对象，支持链式调用
   */
  copy(source) {
    // 调用父类的复制方法
    super.copy(source);

    // 初始化空的点数组
    this.points = [];

    // 复制所有控制点
    for (let i = 0, l = source.points.length; i < l; i++) {
      // 获取源点的引用
      const point = source.points[i];

      // 克隆点并添加到数组中
      this.points.push(point.clone());
    }

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将样条曲线数据序列化为JSON格式
   * 用于保存或传输样条曲线数据
   *
   * @return {Object} 包含样条曲线数据的JSON对象
   */
  toJSON() {
    // 获取父类的JSON数据
    const data = super.toJSON();

    // 初始化点数组
    data.points = [];

    // 将所有控制点转换为数组格式
    for (let i = 0, l = this.points.length; i < l; i++) {
      // 获取当前点的引用
      const point = this.points[i];
      // 将点转换为数组[x,y]并添加到数据中
      data.points.push(point.toArray());
    }

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复样条曲线对象
   * 用于加载或接收样条曲线数据
   *
   * @param {Object} json - 包含样条曲线数据的JSON对象
   * @return {SplineCurve} 返回当前对象，支持链式调用
   */
  fromJSON(json) {
    // 调用父类的JSON恢复方法
    super.fromJSON(json);

    // 初始化空的点数组
    this.points = [];

    // 从JSON数据恢复所有控制点
    for (let i = 0, l = json.points.length; i < l; i++) {
      // 获取点的数组数据
      const point = json.points[i];
      // 创建新的Vector2并从数组恢复，然后添加到点数组中
      this.points.push(new Vector2().fromArray(point));
    }

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出SplineCurve类供其他模块使用
export { SplineCurve };
