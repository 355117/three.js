// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 导入基础曲线类
import { Curve } from "../core/Curve.js";

/**
 * 三次多项式计算工厂函数
 * 用于创建三次多项式计算器，支持Catmull-Rom样条曲线的计算
 *
 * @return {Object} 返回包含初始化和计算方法的对象
 */
function CubicPoly() {
  /**
   * 向心Catmull-Rom曲线 - 有助于避免非均匀catmull rom曲线中的尖点和自相交
   * 参考论文: http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
   *
   * curve.type 接受 centripetal(默认)、chordal 和 catmullrom 三种类型
   * curve.tension 用于 catmullrom 类型，默认值为 0.5
   */

  /*
	基于优化的C++解决方案：
	- http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/
	- http://ideone.com/NoEbVM

	这个CubicPoly类可以用于重用一些变量和计算，
	但对于three.js曲线使用，它可以被内联并扁平化为单个函数调用，
	可以放置在CurveUtils中。
	*/

  // 三次多项式的系数：p(s) = c0 + c1*s + c2*s^2 + c3*s^3
  let c0 = 0,
    c1 = 0,
    c2 = 0,
    c3 = 0;

  /*
   * 计算三次多项式的系数
   * 多项式形式：p(s) = c0 + c1*s + c2*s^2 + c3*s^3
   * 满足条件：
   *   p(0) = x0, p(1) = x1  (端点值)
   *  并且
   *   p'(0) = t0, p'(1) = t1  (端点切线)
   */
  function init(x0, x1, t0, t1) {
    // 常数项：p(0) = x0
    c0 = x0;
    // 一次项系数：p'(0) = t0
    c1 = t0;
    // 二次项系数：通过端点条件计算
    c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1;
    // 三次项系数：通过端点条件计算
    c3 = 2 * x0 - 2 * x1 + t0 + t1;
  }

  // 返回包含初始化和计算方法的对象
  return {
    /**
     * 初始化标准Catmull-Rom样条
     * 使用4个控制点和张力参数
     *
     * @param {number} x0 - 第一个控制点坐标
     * @param {number} x1 - 第二个控制点坐标（起点）
     * @param {number} x2 - 第三个控制点坐标（终点）
     * @param {number} x3 - 第四个控制点坐标
     * @param {number} tension - 张力参数，控制曲线的紧密程度
     */
    initCatmullRom: function (x0, x1, x2, x3, tension) {
      // 计算切线并初始化多项式系数
      init(x1, x2, tension * (x2 - x0), tension * (x3 - x1));
    },

    /**
     * 初始化非均匀Catmull-Rom样条
     * 使用4个控制点和3个时间间隔参数
     *
     * @param {number} x0 - 第一个控制点坐标
     * @param {number} x1 - 第二个控制点坐标（起点）
     * @param {number} x2 - 第三个控制点坐标（终点）
     * @param {number} x3 - 第四个控制点坐标
     * @param {number} dt0 - 第一段的时间间隔
     * @param {number} dt1 - 第二段的时间间隔
     * @param {number} dt2 - 第三段的时间间隔
     */
    initNonuniformCatmullRom: function (x0, x1, x2, x3, dt0, dt1, dt2) {
      // 计算在[t1,t2]参数化时的切线
      let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
      let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;

      // 将切线重新缩放到[0,1]参数化
      t1 *= dt1;
      t2 *= dt1;

      // 使用计算得到的切线初始化多项式
      init(x1, x2, t1, t2);
    },

    /**
     * 计算三次多项式在参数t处的值
     *
     * @param {number} t - 参数值，通常在[0,1]范围内
     * @return {number} 多项式在t处的值
     */
    calc: function (t) {
      // 计算t的幂次
      const t2 = t * t; // t的平方
      const t3 = t2 * t; // t的立方
      // 计算三次多项式：c0 + c1*t + c2*t^2 + c3*t^3
      return c0 + c1 * t + c2 * t2 + c3 * t3;
    },
  };
}

// 分隔符，标识工具函数结束，类定义开始

// 临时向量，用于计算过程中的中间结果，避免重复创建对象
const tmp = /*@__PURE__*/ new Vector3();
// x坐标的三次多项式计算器
const px = /*@__PURE__*/ new CubicPoly();
// y坐标的三次多项式计算器
const py = /*@__PURE__*/ new CubicPoly();
// z坐标的三次多项式计算器
const pz = /*@__PURE__*/ new CubicPoly();

/**
 * 表示Catmull-Rom样条曲线的类
 * Catmull-Rom样条是一种平滑的插值曲线，通过一系列控制点生成
 *
 * ```js
 * // 创建一个封闭的波浪形循环
 * const curve = new THREE.CatmullRomCurve3( [
 * 	new THREE.Vector3( -10, 0, 10 ),  // 控制点1
 * 	new THREE.Vector3( -5, 5, 5 ),    // 控制点2
 * 	new THREE.Vector3( 0, 0, 0 ),     // 控制点3
 * 	new THREE.Vector3( 5, -5, 5 ),    // 控制点4
 * 	new THREE.Vector3( 10, 0, 10 )    // 控制点5
 * ] );
 *
 * const points = curve.getPoints( 50 );  // 获取曲线上的50个点
 * const geometry = new THREE.BufferGeometry().setFromPoints( points );
 *
 * const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
 *
 * // 创建最终的对象并添加到场景中
 * const curveObject = new THREE.Line( geometry, material );
 * ```
 *
 * @augments Curve
 */
class CatmullRomCurve3 extends Curve {
  /**
   * 构造一个新的Catmull-Rom曲线
   *
   * @param {Array<Vector3>} [points] - 定义曲线的3D点数组
   * @param {boolean} [closed=false] - 曲线是否封闭
   * @param {('centripetal'|'chordal'|'catmullrom')} [curveType='centripetal'] - 曲线类型
   * @param {number} [tension=0.5] - 曲线的张力值
   */
  constructor(points = [], closed = false, curveType = "centripetal", tension = 0.5) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志位
     * 可以通过检查此属性来确定对象是否为CatmullRomCurve3类型
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCatmullRomCurve3 = true;

    // 设置曲线类型标识符
    this.type = "CatmullRomCurve3";

    /**
     * 定义曲线的3D点数组
     * 这些点作为样条曲线的控制点
     *
     * @type {Array<Vector3>}
     */
    this.points = points;

    /**
     * 曲线是否封闭
     * 如果为true，曲线的终点会连接到起点形成闭合曲线
     *
     * @type {boolean}
     * @default false
     */
    this.closed = closed;

    /**
     * 曲线类型
     * - 'centripetal': 向心型（默认），避免尖点和自相交
     * - 'chordal': 弦长型，基于点间距离
     * - 'catmullrom': 标准Catmull-Rom，使用张力参数
     *
     * @type {('centripetal'|'chordal'|'catmullrom')}
     * @default 'centripetal'
     */
    this.curveType = curveType;

    /**
     * 曲线的张力值
     * 仅在curveType为'catmullrom'时使用
     * 值越大曲线越紧，值越小曲线越松
     *
     * @type {number}
     * @default 0.5
     */
    this.tension = tension;
  }

  /**
   * 返回曲线上指定参数位置的点
   * 使用Catmull-Rom样条插值算法计算曲线上的点
   *
   * @param {number} t - 插值因子，表示曲线上的位置，必须在[0,1]范围内
   * @param {Vector3} [optionalTarget] - 可选的目标向量，结果将写入此向量
   * @return {Vector3} 曲线上的位置点
   */
  getPoint(t, optionalTarget = new Vector3()) {
    // 获取目标向量引用
    const point = optionalTarget;

    // 获取控制点数组和长度
    const points = this.points;
    const l = points.length;

    // 计算参数化位置：对于封闭曲线使用全长度，开放曲线减1
    const p = (l - (this.closed ? 0 : 1)) * t;
    // 获取整数部分（段索引）
    let intPoint = Math.floor(p);
    // 获取小数部分（段内权重）
    let weight = p - intPoint;

    // 处理封闭曲线的索引环绕
    if (this.closed) {
      intPoint += intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l;
    } else if (weight === 0 && intPoint === l - 1) {
      // 处理开放曲线的边界情况
      intPoint = l - 2;
      weight = 1;
    }

    // 声明4个控制点变量（p1和p2将在下面定义）
    let p0, p3;

    // 获取第一个控制点p0
    if (this.closed || intPoint > 0) {
      // 如果是封闭曲线或不是第一段，直接获取前一个点
      p0 = points[(intPoint - 1) % l];
    } else {
      // 对于开放曲线的第一段，外推第一个点
      tmp.subVectors(points[0], points[1]).add(points[0]);
      p0 = tmp;
    }

    // 获取第二个控制点p1（当前段的起点）
    const p1 = points[intPoint % l];
    // 获取第三个控制点p2（当前段的终点）
    const p2 = points[(intPoint + 1) % l];

    // 获取第四个控制点p3
    if (this.closed || intPoint + 2 < l) {
      // 如果是封闭曲线或不是最后一段，直接获取后一个点
      p3 = points[(intPoint + 2) % l];
    } else {
      // 对于开放曲线的最后一段，外推最后一个点
      tmp.subVectors(points[l - 1], points[l - 2]).add(points[l - 1]);
      p3 = tmp;
    }

    // 根据曲线类型初始化多项式计算器
    if (this.curveType === "centripetal" || this.curveType === "chordal") {
      // 初始化向心型或弦长型Catmull-Rom
      const pow = this.curveType === "chordal" ? 0.5 : 0.25;
      // 计算点间距离的幂次，用于非均匀参数化
      let dt0 = Math.pow(p0.distanceToSquared(p1), pow);
      let dt1 = Math.pow(p1.distanceToSquared(p2), pow);
      let dt2 = Math.pow(p2.distanceToSquared(p3), pow);

      // 安全检查：防止重复点导致的除零错误
      if (dt1 < 1e-4) dt1 = 1.0;
      if (dt0 < 1e-4) dt0 = dt1;
      if (dt2 < 1e-4) dt2 = dt1;

      // 分别为x、y、z坐标初始化非均匀Catmull-Rom
      px.initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
      py.initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
      pz.initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2);
    } else if (this.curveType === "catmullrom") {
      // 初始化标准Catmull-Rom，使用张力参数
      px.initCatmullRom(p0.x, p1.x, p2.x, p3.x, this.tension);
      py.initCatmullRom(p0.y, p1.y, p2.y, p3.y, this.tension);
      pz.initCatmullRom(p0.z, p1.z, p2.z, p3.z, this.tension);
    }

    // 使用计算得到的权重，分别计算x、y、z坐标并设置到目标点
    point.set(px.calc(weight), py.calc(weight), pz.calc(weight));

    // 返回计算得到的点
    return point;
  }

  /**
   * 复制另一个Catmull-Rom曲线的属性到当前对象
   *
   * @param {CatmullRomCurve3} source - 要复制的源曲线对象
   * @return {CatmullRomCurve3} 返回当前对象，支持链式调用
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

    // 复制其他属性
    this.closed = source.closed; // 复制封闭状态
    this.curveType = source.curveType; // 复制曲线类型
    this.tension = source.tension; // 复制张力值

    // 返回当前对象支持链式调用
    return this;
  }

  /**
   * 将曲线数据序列化为JSON格式
   * 用于保存或传输曲线数据
   *
   * @return {Object} 包含曲线数据的JSON对象
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
      // 将点转换为数组[x,y,z]并添加到数据中
      data.points.push(point.toArray());
    }

    // 添加其他属性到JSON数据
    data.closed = this.closed; // 封闭状态
    data.curveType = this.curveType; // 曲线类型
    data.tension = this.tension; // 张力值

    // 返回完整的JSON数据
    return data;
  }

  /**
   * 从JSON数据恢复曲线对象
   * 用于加载或接收曲线数据
   *
   * @param {Object} json - 包含曲线数据的JSON对象
   * @return {CatmullRomCurve3} 返回当前对象，支持链式调用
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
      // 创建新的Vector3并从数组恢复，然后添加到点数组中
      this.points.push(new Vector3().fromArray(point));
    }

    // 恢复其他属性
    this.closed = json.closed; // 恢复封闭状态
    this.curveType = json.curveType; // 恢复曲线类型
    this.tension = json.tension; // 恢复张力值

    // 返回当前对象支持链式调用
    return this;
  }
}

// 导出CatmullRomCurve3类供其他模块使用
export { CatmullRomCurve3 };
