// 导入欧拉角类
import { Euler } from "../../math/Euler.js";
// 导入4x4矩阵类
import { Matrix4 } from "../../math/Matrix4.js";
// 导入统一变量节点
import { uniform } from "../core/UniformNode.js";

// 临时欧拉角对象，用于旋转计算
const _e1 = /*@__PURE__*/ new Euler();
// 临时4x4矩阵对象，用于旋转矩阵计算
const _m1 = /*@__PURE__*/ new Matrix4();

/**
 * TSL对象 - 表示用于渲染当前对象的材质的折射比率
 *
 * @tsl
 * @type {UniformNode<float>}
 */
export const materialRefractionRatio = /*@__PURE__*/ uniform(0)
  .onReference(({ material }) => material)
  .onObjectUpdate(({ material }) => material.refractionRatio);

/**
 * TSL对象 - 表示PBR材质的环境贴图强度
 * 当设置了 `material.envMap` 时，值为 `material.envMapIntensity`，否则为 `scene.environmentIntensity`
 *
 * @tsl
 * @type {Node<float>}
 */
export const materialEnvIntensity = /*@__PURE__*/ uniform(1)
  .onReference(({ material }) => material)
  .onObjectUpdate(function ({ material, scene }) {
    // 如果材质有环境贴图，使用材质的环境贴图强度，否则使用场景的环境强度
    return material.envMap ? material.envMapIntensity : scene.environmentIntensity;
  });

/**
 * TSL对象 - 表示环境贴图的旋转
 * 当设置了 `material.envMap` 时，值为 `material.envMapRotation`
 * `scene.environmentRotation` 控制 `scene.environment` 的旋转
 *
 * @tsl
 * @type {Node<mat4>}
 */
export const materialEnvRotation = /*@__PURE__*/ uniform(new Matrix4())
  .onReference(function (frame) {
    // 引用当前帧的材质对象
    return frame.material;
  })
  .onObjectUpdate(function ({ material, scene }) {
    // 确定使用哪个旋转：如果场景有环境且材质没有环境贴图，使用场景环境旋转，否则使用材质环境贴图旋转
    const rotation = scene.environment !== null && material.envMap === null ? scene.environmentRotation : material.envMapRotation;

    // 如果有旋转值
    if (rotation) {
      // 复制旋转到临时欧拉角对象
      _e1.copy(rotation);

      // 从欧拉角创建旋转矩阵
      _m1.makeRotationFromEuler(_e1);
    } else {
      // 没有旋转时使用单位矩阵
      _m1.identity();
    }

    // 返回计算得到的旋转矩阵
    return _m1;
  });
