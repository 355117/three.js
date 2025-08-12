// 从TSL基础模块导入函数构造器和基本类型
import { Fn, int, float, vec2, vec3, vec4, If } from "../tsl/TSLBase.js";
// 从数学节点模块导入各种数学函数
import { cos, sin, abs, max, exp2, log2, clamp, fract, mix, floor, normalize, cross } from "../math/MathNode.js";
// 从操作符节点模块导入乘法函数
import { mul } from "../math/OperatorNode.js";
// 从条件节点模块导入选择函数
import { select } from "../math/ConditionalNode.js";
// 从循环节点模块导入循环和中断
import { Loop, Break } from "../utils/LoopNode.js";

// 这些定义必须与PMREMGenerator匹配

// 立方体UV参数：半径和mip级别常量
const cubeUV_r0 = /*@__PURE__*/ float(1.0); // 第0级半径
const cubeUV_m0 = /*@__PURE__*/ float(-2.0); // 第0级mip
const cubeUV_r1 = /*@__PURE__*/ float(0.8); // 第1级半径
const cubeUV_m1 = /*@__PURE__*/ float(-1.0); // 第1级mip
const cubeUV_r4 = /*@__PURE__*/ float(0.4); // 第4级半径
const cubeUV_m4 = /*@__PURE__*/ float(2.0); // 第4级mip
const cubeUV_r5 = /*@__PURE__*/ float(0.305); // 第5级半径
const cubeUV_m5 = /*@__PURE__*/ float(3.0); // 第5级mip
const cubeUV_r6 = /*@__PURE__*/ float(0.21); // 第6级半径
const cubeUV_m6 = /*@__PURE__*/ float(4.0); // 第6级mip

// 立方体UV最小mip级别和最小瓦片大小
const cubeUV_minMipLevel = /*@__PURE__*/ float(4.0); // 最小mip级别
const cubeUV_minTileSize = /*@__PURE__*/ float(16.0); // 最小瓦片大小

// 这些着色器函数在立方体贴图单个面的UV坐标、
// 立方体面的0-5整数索引和用于采样textureCube的方向向量之间进行转换
// （通常不归一化）。

// 根据方向向量获取立方体面索引的函数
const getFace = /*@__PURE__*/ Fn(([direction]) => {
  // 计算方向向量各分量的绝对值
  const absDirection = vec3(abs(direction)).toVar();
  // 初始化面索引为-1
  const face = float(-1.0).toVar();

  // 如果X分量的绝对值大于Z分量的绝对值
  If(absDirection.x.greaterThan(absDirection.z), () => {
    // 如果X分量的绝对值大于Y分量的绝对值
    If(absDirection.x.greaterThan(absDirection.y), () => {
      // X轴是主导轴：正X面(0)或负X面(3)
      face.assign(select(direction.x.greaterThan(0.0), 0.0, 3.0));
    }).Else(() => {
      // Y轴是主导轴：正Y面(1)或负Y面(4)
      face.assign(select(direction.y.greaterThan(0.0), 1.0, 4.0));
    });
  }).Else(() => {
    // 如果Z分量的绝对值大于Y分量的绝对值
    If(absDirection.z.greaterThan(absDirection.y), () => {
      // Z轴是主导轴：正Z面(2)或负Z面(5)
      face.assign(select(direction.z.greaterThan(0.0), 2.0, 5.0));
    }).Else(() => {
      // Y轴是主导轴：正Y面(1)或负Y面(4)
      face.assign(select(direction.y.greaterThan(0.0), 1.0, 4.0));
    });
  });

  return face; // 返回面索引
}).setLayout({
  name: "getFace", // 函数名称
  type: "float", // 返回类型
  inputs: [
    { name: "direction", type: "vec3" }, // 输入参数：方向向量
  ],
});

// 右手坐标系；PMREM面索引约定
// 根据方向向量和面索引获取UV坐标的函数
const getUV = /*@__PURE__*/ Fn(([direction, face]) => {
  const uv = vec2().toVar(); // 初始化UV坐标

  // 根据不同的立方体面计算UV坐标
  If(face.equal(0.0), () => {
    uv.assign(vec2(direction.z, direction.y).div(abs(direction.x))); // 正X面
  })
    .ElseIf(face.equal(1.0), () => {
      uv.assign(vec2(direction.x.negate(), direction.z.negate()).div(abs(direction.y))); // 正Y面
    })
    .ElseIf(face.equal(2.0), () => {
      uv.assign(vec2(direction.x.negate(), direction.y).div(abs(direction.z))); // 正Z面
    })
    .ElseIf(face.equal(3.0), () => {
      uv.assign(vec2(direction.z.negate(), direction.y).div(abs(direction.x))); // 负X面
    })
    .ElseIf(face.equal(4.0), () => {
      uv.assign(vec2(direction.x.negate(), direction.z).div(abs(direction.y))); // 负Y面
    })
    .Else(() => {
      uv.assign(vec2(direction.x, direction.y).div(abs(direction.z))); // 负Z面
    });

  // 将UV坐标从[-1,1]范围转换到[0,1]范围
  return mul(0.5, uv.add(1.0));
}).setLayout({
  name: "getUV", // 函数名称
  type: "vec2", // 返回类型
  inputs: [
    { name: "direction", type: "vec3" }, // 输入参数：方向向量
    { name: "face", type: "float" }, // 输入参数：面索引
  ],
});

// 将粗糙度值转换为mip级别的函数
const roughnessToMip = /*@__PURE__*/ Fn(([roughness]) => {
  const mip = float(0.0).toVar(); // 初始化mip级别

  // 根据粗糙度值的不同范围计算对应的mip级别
  // 使用分段线性插值来映射粗糙度到mip级别
  If(roughness.greaterThanEqual(cubeUV_r1), () => {
    // 粗糙度 >= 0.8 的情况
    mip.assign(cubeUV_r0.sub(roughness).mul(cubeUV_m1.sub(cubeUV_m0)).div(cubeUV_r0.sub(cubeUV_r1)).add(cubeUV_m0));
  })
    .ElseIf(roughness.greaterThanEqual(cubeUV_r4), () => {
      // 粗糙度 >= 0.4 的情况
      mip.assign(cubeUV_r1.sub(roughness).mul(cubeUV_m4.sub(cubeUV_m1)).div(cubeUV_r1.sub(cubeUV_r4)).add(cubeUV_m1));
    })
    .ElseIf(roughness.greaterThanEqual(cubeUV_r5), () => {
      // 粗糙度 >= 0.305 的情况
      mip.assign(cubeUV_r4.sub(roughness).mul(cubeUV_m5.sub(cubeUV_m4)).div(cubeUV_r4.sub(cubeUV_r5)).add(cubeUV_m4));
    })
    .ElseIf(roughness.greaterThanEqual(cubeUV_r6), () => {
      // 粗糙度 >= 0.21 的情况
      mip.assign(cubeUV_r5.sub(roughness).mul(cubeUV_m6.sub(cubeUV_m5)).div(cubeUV_r5.sub(cubeUV_r6)).add(cubeUV_m5));
    })
    .Else(() => {
      // 粗糙度 < 0.21 的情况，使用对数函数
      mip.assign(float(-2.0).mul(log2(mul(1.16, roughness)))); // 1.16 = 1.79^0.25
    });

  return mip; // 返回计算得到的mip级别
}).setLayout({
  name: "roughnessToMip", // 函数名称
  type: "float", // 返回类型
  inputs: [{ name: "roughness", type: "float" }], // 输入参数：粗糙度值
});

// 右手坐标系；PMREM面索引约定
// 根据UV坐标和面索引获取方向向量的函数
export const getDirection = /*@__PURE__*/ Fn(([uv_immutable, face]) => {
  const uv = uv_immutable.toVar(); // 获取UV坐标的可变副本
  uv.assign(mul(2.0, uv).sub(1.0)); // 将UV从[0,1]范围转换到[-1,1]范围
  const direction = vec3(uv, 1.0).toVar(); // 创建初始方向向量(u, v, 1)

  // 根据不同的立方体面调整方向向量
  If(face.equal(0.0), () => {
    direction.assign(direction.zyx); // 正X面: (1, v, u)
  })
    .ElseIf(face.equal(1.0), () => {
      direction.assign(direction.xzy); // 重新排列为(u, 1, v)
      direction.xz.mulAssign(-1.0); // 正Y面: (-u, 1, -v)
    })
    .ElseIf(face.equal(2.0), () => {
      direction.x.mulAssign(-1.0); // 正Z面: (-u, v, 1)
    })
    .ElseIf(face.equal(3.0), () => {
      direction.assign(direction.zyx); // 重新排列为(1, v, u)
      direction.xz.mulAssign(-1.0); // 负X面: (-1, v, -u)
    })
    .ElseIf(face.equal(4.0), () => {
      direction.assign(direction.xzy); // 重新排列为(u, 1, v)
      direction.xy.mulAssign(-1.0); // 负Y面: (-u, -1, v)
    })
    .ElseIf(face.equal(5.0), () => {
      direction.z.mulAssign(-1.0); // 负Z面: (u, v, -1)
    });

  return direction; // 返回计算得到的方向向量
}).setLayout({
  name: "getDirection", // 函数名称
  type: "vec3", // 返回类型
  inputs: [
    { name: "uv", type: "vec2" }, // 输入参数：UV坐标
    { name: "face", type: "float" }, // 输入参数：面索引
  ],
});

//

// 立方体UV纹理采样函数，支持粗糙度驱动的mip级别选择
export const textureCubeUV = /*@__PURE__*/ Fn(([envMap, sampleDir_immutable, roughness_immutable, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP]) => {
  const roughness = float(roughness_immutable); // 粗糙度值
  const sampleDir = vec3(sampleDir_immutable); // 采样方向

  // 根据粗糙度计算mip级别，并限制在有效范围内
  const mip = clamp(roughnessToMip(roughness), cubeUV_m0, CUBEUV_MAX_MIP);
  const mipF = fract(mip); // mip级别的小数部分
  const mipInt = floor(mip); // mip级别的整数部分
  // 在当前mip级别进行双线性采样
  const color0 = vec3(bilinearCubeUV(envMap, sampleDir, mipInt, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP)).toVar();

  // 如果mip级别有小数部分，需要在两个mip级别之间进行插值
  If(mipF.notEqual(0.0), () => {
    // 在下一个mip级别进行双线性采样
    const color1 = vec3(bilinearCubeUV(envMap, sampleDir, mipInt.add(1.0), CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP)).toVar();

    // 在两个mip级别的结果之间进行线性插值
    color0.assign(mix(color0, color1, mipF));
  });

  return color0; // 返回最终的颜色值
});

// 双线性立方体UV采样函数
const bilinearCubeUV = /*@__PURE__*/ Fn(([envMap, direction_immutable, mipInt_immutable, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP]) => {
  const mipInt = float(mipInt_immutable).toVar(); // mip级别（整数）
  const direction = vec3(direction_immutable); // 采样方向
  const face = float(getFace(direction)).toVar(); // 获取立方体面索引
  const filterInt = float(max(cubeUV_minMipLevel.sub(mipInt), 0.0)).toVar(); // 计算过滤级别
  mipInt.assign(max(mipInt, cubeUV_minMipLevel)); // 确保mip级别不小于最小值
  const faceSize = float(exp2(mipInt)).toVar(); // 计算当前mip级别的面大小
  const uv = vec2(getUV(direction, face).mul(faceSize.sub(2.0)).add(1.0)).toVar(); // 计算UV坐标

  // 如果是立方体的后三个面（3、4、5），调整V坐标
  If(face.greaterThan(2.0), () => {
    uv.y.addAssign(faceSize); // V坐标向下偏移一个面的大小
    face.subAssign(3.0); // 将面索引调整为0、1、2
  });

  // 计算最终的纹理坐标
  uv.x.addAssign(face.mul(faceSize)); // 根据面索引调整U坐标
  uv.x.addAssign(filterInt.mul(mul(3.0, cubeUV_minTileSize))); // 添加过滤偏移
  uv.y.addAssign(mul(4.0, exp2(CUBEUV_MAX_MIP).sub(faceSize))); // 调整V坐标到正确的mip级别
  uv.x.mulAssign(CUBEUV_TEXEL_WIDTH); // 转换为纹素坐标
  uv.y.mulAssign(CUBEUV_TEXEL_HEIGHT); // 转换为纹素坐标

  return envMap.sample(uv).grad(vec2(), vec2()); // 禁用各向异性过滤的纹理采样
});

// 获取采样的函数，使用Rodrigues轴角旋转公式
const getSample = /*@__PURE__*/ Fn(({ envMap, mipInt, outputDirection, theta, axis, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP }) => {
  const cosTheta = cos(theta); // 计算角度的余弦值

  // Rodrigues轴角旋转公式：v' = v*cos(θ) + (k×v)*sin(θ) + k*(k·v)*(1-cos(θ))
  const sampleDirection = outputDirection
    .mul(cosTheta) // v*cos(θ)
    .add(axis.cross(outputDirection).mul(sin(theta))) // (k×v)*sin(θ)
    .add(axis.mul(axis.dot(outputDirection).mul(cosTheta.oneMinus()))); // k*(k·v)*(1-cos(θ))

  // 使用计算得到的采样方向进行双线性立方体UV采样
  return bilinearCubeUV(envMap, sampleDirection, mipInt, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP);
});

// 模糊处理函数，用于生成PMREM的模糊效果
export const blur = /*@__PURE__*/ Fn(
  ({ n, latitudinal, poleAxis, outputDirection, weights, samples, dTheta, mipInt, envMap, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP }) => {
    // 根据是否为纬度方向选择旋转轴
    const axis = vec3(select(latitudinal, poleAxis, cross(poleAxis, outputDirection))).toVar();

    // 如果轴为零向量，使用默认轴
    If(axis.equal(vec3(0.0)), () => {
      axis.assign(vec3(outputDirection.z, 0.0, outputDirection.x.negate()));
    });

    axis.assign(normalize(axis)); // 归一化旋转轴

    const gl_FragColor = vec3().toVar(); // 初始化片段颜色
    // 添加中心采样（theta = 0）
    gl_FragColor.addAssign(weights.element(0).mul(getSample({ theta: 0.0, axis, outputDirection, mipInt, envMap, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP })));

    // 循环进行多次采样以实现模糊效果
    Loop({ start: int(1), end: n }, ({ i }) => {
      // 如果达到采样数量限制，跳出循环
      If(i.greaterThanEqual(samples), () => {
        Break();
      });

      const theta = float(dTheta.mul(float(i))).toVar(); // 计算当前角度
      // 添加负角度方向的采样
      gl_FragColor.addAssign(
        weights.element(i).mul(getSample({ theta: theta.mul(-1.0), axis, outputDirection, mipInt, envMap, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP }))
      );
      // 添加正角度方向的采样
      gl_FragColor.addAssign(weights.element(i).mul(getSample({ theta, axis, outputDirection, mipInt, envMap, CUBEUV_TEXEL_WIDTH, CUBEUV_TEXEL_HEIGHT, CUBEUV_MAX_MIP })));
    });

    return vec4(gl_FragColor, 1); // 返回最终的颜色值（alpha为1）
  }
);
