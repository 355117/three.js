// 导入相机视图矩阵
import { cameraViewMatrix } from "./Camera.js";
// 导入视图法线
import { normalView } from "./Normal.js";
// 导入位置视图方向
import { positionViewDirection } from "./Position.js";
// 导入材质折射比率
import { materialRefractionRatio } from "./MaterialProperties.js";

/**
 * TSL对象 - 视图空间中的反射向量
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const reflectView = /*@__PURE__*/ positionViewDirection.negate().reflect(normalView);

/**
 * TSL对象 - 视图空间中的折射向量
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const refractView = /*@__PURE__*/ positionViewDirection.negate().refract(normalView, materialRefractionRatio);

/**
 * TSL对象 - 用于立方体反射映射时采样立方体贴图
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const reflectVector = /*@__PURE__*/ reflectView.transformDirection(cameraViewMatrix).toVar("reflectVector");

/**
 * TSL对象 - 用于立方体折射映射时采样立方体贴图
 *
 * @tsl
 * @type {Node<vec3>}
 */
export const refractVector = /*@__PURE__*/ refractView.transformDirection(cameraViewMatrix).toVar("reflectVector");
