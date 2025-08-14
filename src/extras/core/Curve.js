// 导入所需的数学工具和向量类
// Import required math utilities and vector classes
import { clamp } from "../../math/MathUtils.js";
import { Vector2 } from "../../math/Vector2.js";
import { Vector3 } from "../../math/Vector3.js";
import { Matrix4 } from "../../math/Matrix4.js";

/**
 * 用于创建包含插值方法的解析曲线对象的抽象基类。
 *
 * An abstract base class for creating an analytic curve object that contains methods
 * for interpolation.
 *
 * @abstract
 */
class Curve {
  /**
   * 构造一个新的曲线。
   *
   * Constructs a new curve.
   */
  constructor() {
    /**
     * 类型属性用于在序列化/反序列化上下文中检测对象类型。
     *
     * The type property is used for detecting the object type
     * in context of serialization/deserialization.
     *
     * @type {string}
     * @readonly
     */
    this.type = "Curve";

    /**
     * 此值确定通过 {@link Curve#getLengths} 计算曲线累积段长度时的分割数量。
     * 为了在使用 {@link Curve#getSpacedPoints} 等方法时确保精度，
     * 如果曲线非常大，建议增加此属性的值。
     *
     * This value determines the amount of divisions when calculating the
     * cumulative segment lengths of a curve via {@link Curve#getLengths}. To ensure
     * precision when using methods like {@link Curve#getSpacedPoints}, it is
     * recommended to increase the value of this property if the curve is very large.
     *
     * @type {number}
     * @default 200
     */
    this.arcLengthDivisions = 200;

    /**
     * 如果曲线参数已更改，必须设置为 `true`。
     *
     * Must be set to `true` if the curve parameters have changed.
     *
     * @type {boolean}
     * @default false
     */
    this.needsUpdate = false;

    /**
     * 保存预计算曲线长度值的内部缓存。
     *
     * An internal cache that holds precomputed curve length values.
     *
     * @private
     * @type {?Array<number>}
     * @default null
     */
    this.cacheArcLengths = null;
  }

  /**
   * 此方法根据给定的插值因子返回2D或3D空间中的向量（取决于曲线定义）。
   *
   * This method returns a vector in 2D or 3D space (depending on the curve definition)
   * for the given interpolation factor.
   *
   * @abstract
   * @param {number} t - 表示曲线上位置的插值因子，必须在[0,1]范围内 / A interpolation factor representing a position on the curve. Must be in the range `[0,1]`.
   * @param {(Vector2|Vector3)} [optionalTarget] - 可选的目标向量，结果将写入其中 / The optional target vector the result is written to.
   * @return {(Vector2|Vector3)} 曲线上的位置，可以是2D或3D向量 / The position on the curve. It can be a 2D or 3D vector depending on the curve definition.
   */
  getPoint(/* t, optionalTarget */) {
    // 抽象方法，子类必须实现
    // Abstract method, must be implemented by subclasses
    console.warn("THREE.Curve: .getPoint() not implemented.");
  }

  /**
   * 此方法根据给定的插值因子返回2D或3D空间中的向量（取决于曲线定义）。
   * 与 {@link Curve#getPoint} 不同，此方法考虑曲线的长度，提供等距采样。
   *
   * This method returns a vector in 2D or 3D space (depending on the curve definition)
   * for the given interpolation factor. Unlike {@link Curve#getPoint}, this method honors the length
   * of the curve which equidistant samples.
   *
   * @param {number} u - 表示曲线上位置的插值因子，必须在[0,1]范围内 / A interpolation factor representing a position on the curve. Must be in the range `[0,1]`.
   * @param {(Vector2|Vector3)} [optionalTarget] - 可选的目标向量，结果将写入其中 / The optional target vector the result is written to.
   * @return {(Vector2|Vector3)} 曲线上的位置，可以是2D或3D向量 / The position on the curve. It can be a 2D or 3D vector depending on the curve definition.
   */
  getPointAt(u, optionalTarget) {
    // 将u参数映射到t参数，考虑曲线长度
    // Map u parameter to t parameter, considering curve length
    const t = this.getUtoTmapping(u);
    return this.getPoint(t, optionalTarget);
  }

  /**
   * 此方法通过 {@link Curve#getPoint} 对曲线进行采样，并返回表示曲线形状的点数组。
   *
   * This method samples the curve via {@link Curve#getPoint} and returns an array of points representing
   * the curve shape.
   *
   * @param {number} [divisions=5] - 分割数，默认为5 / The number of divisions.
   * @return {Array<(Vector2|Vector3)>} 保存采样曲线值的数组，点数为 `divisions + 1` / An array holding the sampled curve values. The number of points is `divisions + 1`.
   */
  getPoints(divisions = 5) {
    const points = []; // 点数组 / Points array

    // 根据分割数采样曲线上的点
    // Sample points on the curve based on divisions
    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPoint(d / divisions)); // 添加插值点 / Add interpolated point
    }

    return points;
  }

  // 使用getPointAt(u)获取点序列
  // Get sequence of points using getPointAt( u )

  /**
   * 此方法通过 {@link Curve#getPointAt} 对曲线进行采样，并返回表示曲线形状的点数组。
   * 与 {@link Curve#getPoints} 不同，此方法在整个曲线上返回等间距的点。
   *
   * This method samples the curve via {@link Curve#getPointAt} and returns an array of points representing
   * the curve shape. Unlike {@link Curve#getPoints}, this method returns equi-spaced points across the entire
   * curve.
   *
   * @param {number} [divisions=5] - 分割数，默认为5 / The number of divisions.
   * @return {Array<(Vector2|Vector3)>} 保存采样曲线值的数组，点数为 `divisions + 1` / An array holding the sampled curve values. The number of points is `divisions + 1`.
   */
  getSpacedPoints(divisions = 5) {
    const points = []; // 点数组 / Points array

    // 根据分割数获取等间距的点
    // Get equi-spaced points based on divisions
    for (let d = 0; d <= divisions; d++) {
      points.push(this.getPointAt(d / divisions)); // 添加等间距插值点 / Add equi-spaced interpolated point
    }

    return points;
  }

  /**
   * 返回曲线的总弧长。
   *
   * Returns the total arc length of the curve.
   *
   * @return {number} 曲线的长度 / The length of the curve.
   */
  getLength() {
    // 获取累积长度数组并返回最后一个元素（总长度）
    // Get cumulative lengths array and return last element (total length)
    const lengths = this.getLengths();
    return lengths[lengths.length - 1];
  }

  /**
   * 返回曲线累积段长度的数组。
   *
   * Returns an array of cumulative segment lengths of the curve.
   *
   * @param {number} [divisions=this.arcLengthDivisions] - 分割数，默认为this.arcLengthDivisions / The number of divisions.
   * @return {Array<number>} 保存累积段长度的数组 / An array holding the cumulative segment lengths.
   */
  getLengths(divisions = this.arcLengthDivisions) {
    // 如果缓存存在且有效，直接返回缓存
    // If cache exists and is valid, return cache directly
    if (this.cacheArcLengths && this.cacheArcLengths.length === divisions + 1 && !this.needsUpdate) {
      return this.cacheArcLengths;
    }

    // 重置更新标志
    // Reset update flag
    this.needsUpdate = false;

    const cache = []; // 缓存数组 / Cache array
    let current, // 当前点 / Current point
      last = this.getPoint(0); // 上一个点，从起点开始 / Last point, starting from origin
    let sum = 0; // 累积长度 / Cumulative length

    cache.push(0); // 起点长度为0 / Starting point length is 0

    // 计算每个分割点的累积长度
    // Calculate cumulative length for each division point
    for (let p = 1; p <= divisions; p++) {
      current = this.getPoint(p / divisions); // 获取当前点 / Get current point
      sum += current.distanceTo(last); // 累加距离 / Add distance
      cache.push(sum); // 保存累积长度 / Save cumulative length
      last = current; // 更新上一个点 / Update last point
    }

    // 缓存结果
    // Cache the result
    this.cacheArcLengths = cache;

    return cache; // { sums: cache, sum: sum }; 总和在最后一个元素中 / Sum is in the last element.
  }

  /**
   * 更新累积段距离缓存。每次曲线参数更改时都必须调用此方法。
   * 如果更新的曲线是复合曲线（如 {@link CurvePath}）的一部分，
   * 也必须在复合曲线上调用此方法。
   *
   * Update the cumulative segment distance cache. The method must be called
   * every time curve parameters are changed. If an updated curve is part of a
   * composed curve like {@link CurvePath}, this method must be called on the
   * composed curve, too.
   */
  updateArcLengths() {
    // 标记需要更新并重新计算长度
    // Mark as needing update and recalculate lengths
    this.needsUpdate = true;
    this.getLengths();
  }

  /**
   * 给定范围[0,1]内的插值因子，此方法返回相同范围内的更新插值因子，
   * 可用于从曲线采样等距点。
   *
   * Given an interpolation factor in the range `[0,1]`, this method returns an updated
   * interpolation factor in the same range that can be ued to sample equidistant points
   * from a curve.
   *
   * @param {number} u - 插值因子 / The interpolation factor.
   * @param {?number} distance - 曲线上的可选距离 / An optional distance on the curve.
   * @return {number} 更新的插值因子 / The updated interpolation factor.
   */
  getUtoTmapping(u, distance = null) {
    // 获取弧长数组
    // Get arc lengths array
    const arcLengths = this.getLengths();

    let i = 0; // 索引 / Index
    const il = arcLengths.length; // 数组长度 / Array length

    let targetArcLength; // 要获取的目标u距离值 / The targeted u distance value to get

    if (distance) {
      // 如果提供了距离，直接使用
      // If distance is provided, use it directly
      targetArcLength = distance;
    } else {
      // 否则根据u参数计算目标弧长
      // Otherwise calculate target arc length based on u parameter
      targetArcLength = u * arcLengths[il - 1];
    }

    // 二分搜索找到小于目标u距离的最大值的索引
    // binary search for the index with largest value smaller than target u distance

    let low = 0, // 低位索引 / Low index
      high = il - 1, // 高位索引 / High index
      comparison; // 比较结果 / Comparison result

    // 二分搜索循环
    // Binary search loop
    while (low <= high) {
      // 计算中间索引，避免溢出（虽然在JS中可能不是问题，因为JS没有真正的整数，所有数字都是浮点数）
      // Calculate middle index, less likely to overflow (though probably not issue here, JS doesn't really have integers, all numbers are floats)
      i = Math.floor(low + (high - low) / 2);

      // 比较当前弧长与目标弧长
      // Compare current arc length with target arc length
      comparison = arcLengths[i] - targetArcLength;

      if (comparison < 0) {
        // 当前值小于目标值，搜索右半部分
        // Current value is less than target, search right half
        low = i + 1;
      } else if (comparison > 0) {
        // 当前值大于目标值，搜索左半部分
        // Current value is greater than target, search left half
        high = i - 1;
      } else {
        // 找到精确匹配
        // Found exact match
        high = i;
        break;

        // 完成 / DONE
      }
    }

    i = high; // 使用高位索引 / Use high index

    // 如果找到精确匹配，直接返回归一化的索引
    // If exact match found, return normalized index directly
    if (arcLengths[i] === targetArcLength) {
      return i / (il - 1);
    }

    // 我们可以在长度上获得更细的粒度，或者在两点之间使用简单插值
    // we could get finer grain at lengths, or use simple interpolation between two points

    // 获取前后两个弧长值
    // Get before and after arc length values
    const lengthBefore = arcLengths[i];
    const lengthAfter = arcLengths[i + 1];

    // 计算段长度
    // Calculate segment length
    const segmentLength = lengthAfter - lengthBefore;

    // 确定我们在"之前"和"之后"点之间的位置
    // determine where we are between the 'before' and 'after' points

    const segmentFraction = (targetArcLength - lengthBefore) / segmentLength;

    // 将该分数量添加到t
    // add that fractional amount to t

    const t = (i + segmentFraction) / (il - 1);

    return t; // 返回插值参数 / Return interpolation parameter
  }

  /**
   * 返回给定插值因子的单位切线向量。
   * 如果派生曲线没有实现其切线导数，
   * 将使用相距很小delta的两个点来找到其梯度，
   * 这似乎给出了合理的近似值。
   *
   * Returns a unit vector tangent for the given interpolation factor.
   * If the derived curve does not implement its tangent derivation,
   * two points a small delta apart will be used to find its gradient
   * which seems to give a reasonable approximation.
   *
   * @param {number} t - 插值因子 / The interpolation factor.
   * @param {(Vector2|Vector3)} [optionalTarget] - 可选的目标向量，结果将写入其中 / The optional target vector the result is written to.
   * @return {(Vector2|Vector3)} 切线向量 / The tangent vector.
   */
  getTangent(t, optionalTarget) {
    const delta = 0.0001; // 小的增量值 / Small delta value
    let t1 = t - delta; // 前一个参数 / Previous parameter
    let t2 = t + delta; // 后一个参数 / Next parameter

    // 防止超出范围的情况
    // Capping in case of danger

    if (t1 < 0) t1 = 0; // 确保不小于0 / Ensure not less than 0
    if (t2 > 1) t2 = 1; // 确保不大于1 / Ensure not greater than 1

    // 获取两个相近的点
    // Get two nearby points
    const pt1 = this.getPoint(t1);
    const pt2 = this.getPoint(t2);

    // 创建切线向量，根据点的类型选择Vector2或Vector3
    // Create tangent vector, choose Vector2 or Vector3 based on point type
    const tangent = optionalTarget || (pt1.isVector2 ? new Vector2() : new Vector3());

    // 计算切线向量：(pt2 - pt1).normalize()
    // Calculate tangent vector: (pt2 - pt1).normalize()
    tangent.copy(pt2).sub(pt1).normalize();

    return tangent; // 返回单位切线向量 / Return unit tangent vector
  }

  /**
   * Same as {@link Curve#getTangent} but with equidistant samples.
   *
   * @param {number} u - The interpolation factor.
   * @param {(Vector2|Vector3)} [optionalTarget] - The optional target vector the result is written to.
   * @return {(Vector2|Vector3)} The tangent vector.
   * @see {@link Curve#getPointAt}
   */
  getTangentAt(u, optionalTarget) {
    const t = this.getUtoTmapping(u);
    return this.getTangent(t, optionalTarget);
  }

  /**
   * Generates the Frenet Frames. Requires a curve definition in 3D space. Used
   * in geometries like {@link TubeGeometry} or {@link ExtrudeGeometry}.
   *
   * @param {number} segments - The number of segments.
   * @param {boolean} [closed=false] - Whether the curve is closed or not.
   * @return {{tangents: Array<Vector3>, normals: Array<Vector3>, binormals: Array<Vector3>}} The Frenet Frames.
   */
  computeFrenetFrames(segments, closed = false) {
    // see http://www.cs.indiana.edu/pub/techreports/TR425.pdf

    const normal = new Vector3();

    const tangents = [];
    const normals = [];
    const binormals = [];

    const vec = new Vector3();
    const mat = new Matrix4();

    // compute the tangent vectors for each segment on the curve

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;

      tangents[i] = this.getTangentAt(u, new Vector3());
    }

    // select an initial normal vector perpendicular to the first tangent vector,
    // and in the direction of the minimum tangent xyz component

    normals[0] = new Vector3();
    binormals[0] = new Vector3();
    let min = Number.MAX_VALUE;
    const tx = Math.abs(tangents[0].x);
    const ty = Math.abs(tangents[0].y);
    const tz = Math.abs(tangents[0].z);

    if (tx <= min) {
      min = tx;
      normal.set(1, 0, 0);
    }

    if (ty <= min) {
      min = ty;
      normal.set(0, 1, 0);
    }

    if (tz <= min) {
      normal.set(0, 0, 1);
    }

    vec.crossVectors(tangents[0], normal).normalize();

    normals[0].crossVectors(tangents[0], vec);
    binormals[0].crossVectors(tangents[0], normals[0]);

    // compute the slowly-varying normal and binormal vectors for each segment on the curve

    for (let i = 1; i <= segments; i++) {
      normals[i] = normals[i - 1].clone();

      binormals[i] = binormals[i - 1].clone();

      vec.crossVectors(tangents[i - 1], tangents[i]);

      if (vec.length() > Number.EPSILON) {
        vec.normalize();

        const theta = Math.acos(clamp(tangents[i - 1].dot(tangents[i]), -1, 1)); // clamp for floating pt errors

        normals[i].applyMatrix4(mat.makeRotationAxis(vec, theta));
      }

      binormals[i].crossVectors(tangents[i], normals[i]);
    }

    // if the curve is closed, postprocess the vectors so the first and last normal vectors are the same

    if (closed === true) {
      let theta = Math.acos(clamp(normals[0].dot(normals[segments]), -1, 1));
      theta /= segments;

      if (tangents[0].dot(vec.crossVectors(normals[0], normals[segments])) > 0) {
        theta = -theta;
      }

      for (let i = 1; i <= segments; i++) {
        // twist a little...
        normals[i].applyMatrix4(mat.makeRotationAxis(tangents[i], theta * i));
        binormals[i].crossVectors(tangents[i], normals[i]);
      }
    }

    return {
      tangents: tangents,
      normals: normals,
      binormals: binormals,
    };
  }

  /**
   * Returns a new curve with copied values from this instance.
   *
   * @return {Curve} A clone of this instance.
   */
  clone() {
    return new this.constructor().copy(this);
  }

  /**
   * Copies the values of the given curve to this instance.
   *
   * @param {Curve} source - The curve to copy.
   * @return {Curve} A reference to this curve.
   */
  copy(source) {
    this.arcLengthDivisions = source.arcLengthDivisions;

    return this;
  }

  /**
   * 将曲线序列化为JSON。
   *
   * Serializes the curve into JSON.
   *
   * @return {Object} 表示序列化曲线的JSON对象 / A JSON object representing the serialized curve.
   * @see {@link ObjectLoader#parse}
   */
  toJSON() {
    // 创建包含元数据的数据对象
    // Create data object with metadata
    const data = {
      metadata: {
        version: 4.7, // 版本号 / Version number
        type: "Curve", // 类型 / Type
        generator: "Curve.toJSON", // 生成器 / Generator
      },
    };

    // 添加曲线特有的属性
    // Add curve-specific properties
    data.arcLengthDivisions = this.arcLengthDivisions; // 弧长分割数 / Arc length divisions
    data.type = this.type; // 曲线类型 / Curve type

    return data;
  }

  /**
   * 从给定的JSON反序列化曲线。
   *
   * Deserializes the curve from the given JSON.
   *
   * @param {Object} json - 包含序列化曲线的JSON / The JSON holding the serialized curve.
   * @return {Curve} 此曲线的引用 / A reference to this curve.
   */
  fromJSON(json) {
    // 恢复弧长分割数
    // Restore arc length divisions
    this.arcLengthDivisions = json.arcLengthDivisions;

    return this;
  }
}

// 导出Curve类供其他模块使用
// Export Curve class for use by other modules
export { Curve };
