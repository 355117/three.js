/**
 * Three.js 常量定义文件
 *
 * 这个文件包含了 Three.js 中使用的所有常量定义，包括：
 * - 版本信息
 * - 鼠标和触摸交互常量
 * - 渲染相关常量（面剔除、阴影、混合等）
 * - 纹理相关常量（格式、类型、过滤等）
 * - 动画相关常量
 * - WebGL 相关常量
 * - 颜色空间常量
 *
 * 这些常量确保了整个库的一致性和类型安全。
 */

/**
 * Three.js 版本号
 *
 * 当前 Three.js 库的版本标识符。'dev' 表示开发版本。
 *
 * @type {string}
 * @constant
 */
export const REVISION = "180dev";

// ========================================
// 输入设备交互常量
// ========================================

/**
 * 鼠标按键和控制器交互类型常量
 *
 * 定义了鼠标按键的标识符和在控制器中对应的交互类型。
 * 这些常量用于统一处理鼠标输入和相机控制。
 *
 * @type {ConstantsMouse}
 * @constant
 */
export const MOUSE = {
  LEFT: 0, // 鼠标左键 / 旋转操作
  MIDDLE: 1, // 鼠标中键 / 缩放操作
  RIGHT: 2, // 鼠标右键 / 平移操作
  ROTATE: 0, // 旋转交互（对应左键）
  DOLLY: 1, // 缩放交互（对应中键）
  PAN: 2, // 平移交互（对应右键）
};

/**
 * 触摸交互类型常量
 *
 * 定义了触摸设备上的各种交互手势类型。
 * 用于在触摸控制器中识别和处理不同的手势。
 *
 * @type {ConstantsTouch}
 * @constant
 */
export const TOUCH = {
  ROTATE: 0, // 单指旋转
  PAN: 1, // 单指平移
  DOLLY_PAN: 2, // 双指缩放+平移
  DOLLY_ROTATE: 3, // 双指缩放+旋转
};

// ========================================
// 面剔除常量
// ========================================

/**
 * 禁用面剔除
 *
 * 不剔除任何面，前面和背面都会被渲染。
 * 这会增加渲染负担，但对于需要看到物体内部的情况很有用。
 *
 * @type {number}
 * @constant
 */
export const CullFaceNone = 0;

/**
 * 剔除背面
 *
 * 只渲染前面，剔除背面。这是最常用的设置，
 * 可以提高渲染性能，因为通常看不到物体的背面。
 *
 * @type {number}
 * @constant
 */
export const CullFaceBack = 1;

/**
 * 剔除前面
 *
 * 只渲染背面，剔除前面。
 * 用于特殊效果，如渲染物体的内部。
 *
 * @type {number}
 * @constant
 */
export const CullFaceFront = 2;

/**
 * 剔除前面和背面
 *
 * 剔除所有面，实际上不会渲染任何几何体。
 * 这个设置很少使用，主要用于调试目的。
 *
 * @type {number}
 * @constant
 */
export const CullFaceFrontBack = 3;

// ========================================
// 阴影贴图类型常量
// ========================================

/**
 * 基础阴影贴图
 *
 * 不进行过滤的阴影贴图 - 速度最快，但质量最低。
 * 会产生锯齿状的阴影边缘，适用于性能要求高的场景。
 *
 * @type {number}
 * @constant
 */
export const BasicShadowMap = 0;

/**
 * PCF 阴影贴图
 *
 * 使用百分比接近过滤（PCF）算法过滤阴影贴图。
 * 提供较好的阴影质量，边缘更平滑，是常用的阴影类型。
 *
 * @type {number}
 * @constant
 */
export const PCFShadowMap = 1;

/**
 * PCF 软阴影贴图
 *
 * 使用改进的 PCF 算法，提供更好的软阴影效果。
 * 特别适用于低分辨率阴影贴图，能产生更自然的阴影边缘。
 *
 * @type {number}
 * @constant
 */
export const PCFSoftShadowMap = 2;

/**
 * VSM 阴影贴图
 *
 * 使用方差阴影贴图（VSM）算法过滤阴影贴图。
 * 注意：使用 VSM 时，所有阴影接收者也会投射阴影。
 *
 * @type {number}
 * @constant
 */
export const VSMShadowMap = 3;

// ========================================
// 材质面渲染常量
// ========================================

/**
 * 只渲染前面
 *
 * 只渲染几何体的前面（面向相机的面）。
 * 这是默认设置，适用于大多数实体物体。
 *
 * @type {number}
 * @constant
 */
export const FrontSide = 0;

/**
 * 只渲染背面
 *
 * 只渲染几何体的背面（背向相机的面）。
 * 常用于创建内部视图或特殊效果。
 *
 * @type {number}
 * @constant
 */
export const BackSide = 1;

/**
 * 渲染双面
 *
 * 同时渲染前面和背面。
 * 用于薄片状物体（如纸张、叶子）或需要看到内部的物体。
 *
 * @type {number}
 * @constant
 */
export const DoubleSide = 2;

// ========================================
// 混合模式常量
// ========================================

/**
 * 无混合
 *
 * 不执行混合，实际上禁用了 Alpha 透明度。
 * 新像素直接覆盖原有像素，性能最高。
 *
 * @type {number}
 * @constant
 */
export const NoBlending = 0;

/**
 * 正常混合
 *
 * 默认的混合模式，支持标准的 Alpha 透明度。
 * 公式：result = src * srcAlpha + dst * (1 - srcAlpha)
 *
 * @type {number}
 * @constant
 */
export const NormalBlending = 1;

/**
 * 加法混合
 *
 * 将源颜色和目标颜色相加。
 * 公式：result = src + dst
 * 常用于发光效果、粒子系统等。
 *
 * @type {number}
 * @constant
 */
export const AdditiveBlending = 2;

/**
 * 减法混合
 *
 * 从目标颜色中减去源颜色。
 * 公式：result = dst - src
 * 用于创建阴影或暗化效果。
 *
 * @type {number}
 * @constant
 */
export const SubtractiveBlending = 3;

/**
 * 乘法混合
 *
 * 将源颜色和目标颜色相乘。
 * 公式：result = src * dst
 * 常用于阴影、滤镜效果等。
 *
 * @type {number}
 * @constant
 */
export const MultiplyBlending = 4;

/**
 * 自定义混合
 *
 * 允许用户自定义混合方程式和因子。
 * 提供最大的灵活性，可以创建复杂的混合效果。
 *
 * @type {number}
 * @constant
 */
export const CustomBlending = 5;

// ========================================
// 混合方程式常量
// ========================================

/**
 * 加法混合方程式
 *
 * 源颜色 + 目标颜色的混合方程式。
 * 公式：result = source + destination
 * 这是最常用的混合方程式。
 *
 * @type {number}
 * @constant
 */
export const AddEquation = 100;

/**
 * 减法混合方程式
 *
 * 源颜色 - 目标颜色的混合方程式。
 * 公式：result = source - destination
 * 用于创建减法效果。
 *
 * @type {number}
 * @constant
 */
export const SubtractEquation = 101;

/**
 * 反向减法混合方程式
 *
 * 目标颜色 - 源颜色的混合方程式。
 * 公式：result = destination - source
 * 与减法方程式相反的效果。
 *
 * @type {number}
 * @constant
 */
export const ReverseSubtractEquation = 102;

/**
 * 最小值混合方程式
 *
 * 取源颜色和目标颜色的最小值。
 * 公式：result = min(source, destination)
 * 用于创建暗化效果。
 *
 * @type {number}
 * @constant
 */
export const MinEquation = 103;

/**
 * 最大值混合方程式
 *
 * 取源颜色和目标颜色的最大值。
 * 公式：result = max(source, destination)
 * 用于创建亮化效果。
 *
 * @type {number}
 * @constant
 */
export const MaxEquation = 104;

// ========================================
// 混合因子常量
// ========================================

/**
 * 零因子
 *
 * 将所有颜色乘以 0，结果为黑色。
 * 公式：color * 0 = (0, 0, 0, 0)
 *
 * @type {number}
 * @constant
 */
export const ZeroFactor = 200;

/**
 * 一因子
 *
 * 将所有颜色乘以 1，保持原色不变。
 * 公式：color * 1 = color
 *
 * @type {number}
 * @constant
 */
export const OneFactor = 201;

/**
 * 源颜色因子
 *
 * 将所有颜色乘以源颜色。
 * 公式：color * srcColor
 *
 * @type {number}
 * @constant
 */
export const SrcColorFactor = 202;

/**
 * 一减源颜色因子
 *
 * 将所有颜色乘以 (1 - 源颜色)。
 * 公式：color * (1 - srcColor)
 *
 * @type {number}
 * @constant
 */
export const OneMinusSrcColorFactor = 203;

/**
 * 源 Alpha 因子
 *
 * 将所有颜色乘以源 Alpha 值。
 * 公式：color * srcAlpha
 * 这是最常用的透明度混合因子。
 *
 * @type {number}
 * @constant
 */
export const SrcAlphaFactor = 204;

/**
 * 一减源 Alpha 因子
 *
 * 将所有颜色乘以 (1 - 源 Alpha 值)。
 * 公式：color * (1 - srcAlpha)
 * 常与 SrcAlphaFactor 配合使用。
 *
 * @type {number}
 * @constant
 */
export const OneMinusSrcAlphaFactor = 205;

/**
 * 目标 Alpha 因子
 *
 * 将所有颜色乘以目标 Alpha 值。
 * 公式：color * dstAlpha
 *
 * @type {number}
 * @constant
 */
export const DstAlphaFactor = 206;

/**
 * 一减目标 Alpha 因子
 *
 * 将所有颜色乘以 (1 - 目标 Alpha 值)。
 * 公式：color * (1 - dstAlpha)
 *
 * @type {number}
 * @constant
 */
export const OneMinusDstAlphaFactor = 207;

/**
 * 目标颜色因子
 *
 * 将所有颜色乘以目标颜色。
 * 公式：color * dstColor
 * 常用于乘法混合效果。
 *
 * @type {number}
 * @constant
 */
export const DstColorFactor = 208;

/**
 * 一减目标颜色因子
 *
 * 将所有颜色乘以 (1 - 目标颜色)。
 * 公式：color * (1 - dstColor)
 *
 * @type {number}
 * @constant
 */
export const OneMinusDstColorFactor = 209;

/**
 * 源 Alpha 饱和因子
 *
 * RGB 颜色乘以源 Alpha 值和 (1 - 目标 Alpha 值) 中的较小值。
 * Alpha 值乘以 1。
 * 公式：RGB * min(srcAlpha, 1 - dstAlpha), Alpha * 1
 *
 * @type {number}
 * @constant
 */
export const SrcAlphaSaturateFactor = 210;

/**
 * 常量颜色因子
 *
 * 将所有颜色乘以一个常量颜色。
 * 公式：color * constantColor
 * 常量颜色通过 gl.blendColor() 设置。
 *
 * @type {number}
 * @constant
 */
export const ConstantColorFactor = 211;

/**
 * 一减常量颜色因子
 *
 * 将所有颜色乘以 (1 - 常量颜色)。
 * 公式：color * (1 - constantColor)
 *
 * @type {number}
 * @constant
 */
export const OneMinusConstantColorFactor = 212;

/**
 * 常量 Alpha 因子
 *
 * 将所有颜色乘以一个常量 Alpha 值。
 * 公式：color * constantAlpha
 * 常量 Alpha 通过 gl.blendColor() 设置。
 *
 * @type {number}
 * @constant
 */
export const ConstantAlphaFactor = 213;

/**
 * 一减常量 Alpha 因子
 *
 * 将所有颜色乘以 (1 - 常量 Alpha 值)。
 * 公式：color * (1 - constantAlpha)
 *
 * @type {number}
 * @constant
 */
export const OneMinusConstantAlphaFactor = 214;

// ========================================
// 深度测试函数常量
// ========================================

/**
 * 从不通过深度测试
 *
 * 深度测试永远不会通过，像素不会被绘制。
 * 用于完全禁用某些物体的渲染。
 *
 * @type {number}
 * @constant
 */
export const NeverDepth = 0;

/**
 * 总是通过深度测试
 *
 * 深度测试总是通过，像素总是被绘制。
 * 相当于禁用深度测试，但仍会写入深度缓冲区。
 *
 * @type {number}
 * @constant
 */
export const AlwaysDepth = 1;

/**
 * 小于时通过深度测试
 *
 * 当新像素的深度值小于深度缓冲区中的值时通过。
 * 用于渲染更近的物体。
 *
 * @type {number}
 * @constant
 */
export const LessDepth = 2;

/**
 * 小于等于时通过深度测试
 *
 * 当新像素的深度值小于或等于深度缓冲区中的值时通过。
 * 这是最常用的深度测试函数，Three.js 的默认设置。
 *
 * @type {number}
 * @constant
 */
export const LessEqualDepth = 3;

/**
 * 等于时通过深度测试
 *
 * 只有当新像素的深度值等于深度缓冲区中的值时才通过。
 * 用于特殊的深度匹配效果。
 *
 * @type {number}
 * @constant
 */
export const EqualDepth = 4;

/**
 * 大于等于时通过深度测试
 *
 * 当新像素的深度值大于或等于深度缓冲区中的值时通过。
 * 用于反向深度测试或特殊效果。
 *
 * @type {number}
 * @constant
 */
export const GreaterEqualDepth = 5;

/**
 * 大于时通过深度测试
 *
 * 当新像素的深度值大于深度缓冲区中的值时通过。
 * 用于渲染更远的物体或特殊效果。
 *
 * @type {number}
 * @constant
 */
export const GreaterDepth = 6;

/**
 * 不等于时通过深度测试
 *
 * 当新像素的深度值不等于深度缓冲区中的值时通过。
 * 用于创建特殊的深度效果。
 *
 * @type {number}
 * @constant
 */
export const NotEqualDepth = 7;

// ========================================
// 环境贴图操作常量
// ========================================

/**
 * 乘法操作
 *
 * 将环境贴图颜色与表面颜色相乘。
 * 公式：result = envMapColor * surfaceColor
 * 产生较暗的效果，常用于环境遮蔽。
 *
 * @type {number}
 * @constant
 */
export const MultiplyOperation = 0;

/**
 * 混合操作
 *
 * 使用反射率在两种颜色之间进行混合。
 * 公式：result = mix(surfaceColor, envMapColor, reflectivity)
 * 这是最常用的环境贴图混合方式。
 *
 * @type {number}
 * @constant
 */
export const MixOperation = 1;

/**
 * 加法操作
 *
 * 将两种颜色相加。
 * 公式：result = envMapColor + surfaceColor
 * 产生较亮的效果，常用于发光材质。
 *
 * @type {number}
 * @constant
 */
export const AddOperation = 2;

// ========================================
// 色调映射常量
// ========================================

/**
 * 无色调映射
 *
 * 不应用任何色调映射，保持原始的 HDR 颜色值。
 * 适用于 LDR 内容或不需要色调映射的场景。
 *
 * @type {number}
 * @constant
 */
export const NoToneMapping = 0;

/**
 * 线性色调映射
 *
 * 简单的线性色调映射，直接缩放颜色值。
 * 公式：color = color * exposure
 *
 * @type {number}
 * @constant
 */
export const LinearToneMapping = 1;

/**
 * Reinhard 色调映射
 *
 * 经典的 Reinhard 色调映射算法。
 * 公式：color = color / (1 + color)
 * 提供平滑的高光压缩。
 *
 * @type {number}
 * @constant
 */
export const ReinhardToneMapping = 2;

/**
 * Cineon 色调映射
 *
 * 基于 Cineon 胶片响应曲线的色调映射。
 * 模拟传统胶片的色彩响应特性。
 *
 * @type {number}
 * @constant
 */
export const CineonToneMapping = 3;

/**
 * ACES 电影级色调映射
 *
 * 基于 ACES（Academy Color Encoding System）的色调映射。
 * 广泛用于电影工业，提供专业级的色彩管理。
 *
 * @type {number}
 * @constant
 */
export const ACESFilmicToneMapping = 4;

/**
 * 自定义色调映射
 *
 * 允许用户通过修改材质的片段着色器代码来实现自定义色调映射。
 * 需要用户自己实现色调映射算法。
 *
 * @type {number}
 * @constant
 */
export const CustomToneMapping = 5;

/**
 * AgX 色调映射
 *
 * 现代的 AgX 色调映射算法。
 * 提供优秀的色彩保真度和平滑的高光处理。
 *
 * @type {number}
 * @constant
 */
export const AgXToneMapping = 6;

/**
 * 中性色调映射
 *
 * 基于 Khronos 3D Commerce Group 标准的中性色调映射。
 * 提供平衡的色彩表现，适用于商业应用。
 *
 * @type {number}
 * @constant
 */
export const NeutralToneMapping = 7;

// ========================================
// 骨骼绑定模式常量
// ========================================

/**
 * 附着绑定模式
 *
 * 蒙皮网格与骨骼共享相同的世界空间。
 * 网格的变换会直接影响骨骼的世界位置。
 * 这是最常用的绑定模式。
 *
 * @type {string}
 * @constant
 */
export const AttachedBindMode = "attached";

/**
 * 分离绑定模式
 *
 * 蒙皮网格与骨骼不共享相同的世界空间。
 * 当一个骨骼在多个蒙皮网格之间共享时很有用。
 * 允许独立变换网格而不影响骨骼。
 *
 * @type {string}
 * @constant
 */
export const DetachedBindMode = "detached";

// ========================================
// 纹理映射常量
// ========================================

/**
 * UV 坐标映射
 *
 * 使用几何体的 UV 坐标来映射纹理。
 * 这是最常用的纹理映射方式。
 *
 * @type {number}
 * @constant
 */
export const UVMapping = 300;

/**
 * 立方体反射映射
 *
 * 用于立方体纹理的反射映射。
 * 常用于环境反射、天空盒等效果。
 *
 * @type {number}
 * @constant
 */
export const CubeReflectionMapping = 301;

/**
 * 立方体折射映射
 *
 * 用于立方体纹理的折射映射。
 * 用于模拟透明物体的折射效果。
 *
 * @type {number}
 * @constant
 */
export const CubeRefractionMapping = 302;

/**
 * 等距柱状投影反射映射
 *
 * 用于等距柱状投影纹理的反射映射。
 * 常用于 360 度全景环境贴图。
 *
 * @type {number}
 * @constant
 */
export const EquirectangularReflectionMapping = 303;

/**
 * 等距柱状投影折射映射
 *
 * 用于等距柱状投影纹理的折射映射。
 * 用于全景折射效果。
 *
 * @type {number}
 * @constant
 */
export const EquirectangularRefractionMapping = 304;

/**
 * PMREM 反射映射
 *
 * 用于预过滤的 Mipmap 辐射环境贴图（PMREM）的反射映射。
 * 提供高质量的环境反射效果。
 *
 * @type {number}
 * @constant
 */
export const CubeUVReflectionMapping = 306;

// ========================================
// 纹理包装常量
// ========================================

/**
 * 重复包装
 *
 * 纹理会简单地重复到无穷远。
 * 当 UV 坐标超出 [0,1] 范围时，纹理会重复平铺。
 *
 * @type {number}
 * @constant
 */
export const RepeatWrapping = 1000;

/**
 * 边缘钳制包装
 *
 * 纹理的最后一个像素会拉伸到网格的边缘。
 * 超出 [0,1] 范围的 UV 坐标会使用边缘像素的颜色。
 *
 * @type {number}
 * @constant
 */
export const ClampToEdgeWrapping = 1001;

/**
 * 镜像重复包装
 *
 * 纹理会重复到无穷远，但每次重复都会镜像翻转。
 * 创建无缝的镜像平铺效果。
 *
 * @type {number}
 * @constant
 */
export const MirroredRepeatWrapping = 1002;

// ========================================
// 纹理过滤常量
// ========================================

/**
 * 最近邻过滤
 *
 * 返回距离指定纹理坐标最近的纹理元素值（曼哈顿距离）。
 * 产生像素化效果，适用于像素艺术风格。
 *
 * @type {number}
 * @constant
 */
export const NearestFilter = 1003;

/**
 * 最近邻 Mipmap 最近邻过滤
 *
 * 选择最接近被纹理化像素大小的 mipmap，
 * 并使用最近邻过滤标准产生纹理值。
 *
 * @type {number}
 * @constant
 */
export const NearestMipmapNearestFilter = 1004;
export const NearestMipMapNearestFilter = 1004; // 遗留命名

/**
 * 最近邻 Mipmap 线性过滤
 *
 * 选择两个最接近被纹理化像素大小的 mipmap，
 * 对每个 mipmap 使用最近邻过滤，最终值是两个值的加权平均。
 *
 * @type {number}
 * @constant
 */
export const NearestMipmapLinearFilter = 1005;
export const NearestMipMapLinearFilter = 1005; // 遗留命名

/**
 * 线性过滤
 *
 * 返回距离指定纹理坐标最近的四个纹理元素的加权平均值。
 * 产生平滑的纹理效果，这是最常用的过滤方式。
 *
 * @type {number}
 * @constant
 */
export const LinearFilter = 1006;

/**
 * 线性 Mipmap 最近邻过滤
 *
 * 选择最接近被纹理化像素大小的 mipmap，
 * 并使用线性过滤标准产生纹理值。
 *
 * @type {number}
 * @constant
 */
export const LinearMipmapNearestFilter = 1007;
export const LinearMipMapNearestFilter = 1007; // 遗留命名

/**
 * 线性 Mipmap 线性过滤（三线性过滤）
 *
 * 选择两个最接近被纹理化像素大小的 mipmap，
 * 对每个 mipmap 使用线性过滤，最终值是两个值的加权平均。
 * 提供最高质量的纹理过滤效果。
 *
 * @type {number}
 * @constant
 */
export const LinearMipmapLinearFilter = 1008;
export const LinearMipMapLinearFilter = 1008; // 遗留命名

// ========================================
// 纹理数据类型常量
// ========================================

/**
 * 无符号字节类型
 *
 * 纹理的无符号字节数据类型 (0-255)。
 * 这是最常用的纹理数据类型，适用于标准的 8 位颜色。
 *
 * @type {number}
 * @constant
 */
export const UnsignedByteType = 1009;

/**
 * 有符号字节类型
 *
 * 纹理的有符号字节数据类型 (-128 到 127)。
 * 常用于法线贴图等需要负值的纹理。
 *
 * @type {number}
 * @constant
 */
export const ByteType = 1010;

/**
 * 有符号短整型
 *
 * 纹理的有符号短整型数据类型 (-32768 到 32767)。
 * 提供更高的精度，用于高精度纹理数据。
 *
 * @type {number}
 * @constant
 */
export const ShortType = 1011;

/**
 * 无符号短整型
 *
 * 纹理的无符号短整型数据类型 (0-65535)。
 * 常用于深度纹理和高精度颜色数据。
 *
 * @type {number}
 * @constant
 */
export const UnsignedShortType = 1012;

/**
 * 有符号整型
 *
 * 纹理的有符号整型数据类型。
 * 用于需要大范围整数值的特殊纹理。
 *
 * @type {number}
 * @constant
 */
export const IntType = 1013;

/**
 * 无符号整型
 *
 * 纹理的无符号整型数据类型。
 * 用于高精度索引或大范围无符号值。
 *
 * @type {number}
 * @constant
 */
export const UnsignedIntType = 1014;

/**
 * 浮点型
 *
 * 纹理的 32 位浮点数据类型。
 * 用于 HDR 纹理、深度纹理和需要高精度的数据。
 *
 * @type {number}
 * @constant
 */
export const FloatType = 1015;

/**
 * 半精度浮点型
 *
 * 纹理的 16 位半精度浮点数据类型。
 * 在保持较好精度的同时减少内存使用，常用于 HDR 纹理。
 *
 * @type {number}
 * @constant
 */
export const HalfFloatType = 1016;

/**
 * 无符号短整型 4_4_4_4 打包格式
 *
 * 16 位打包格式，每个 RGBA 分量各占 4 位。
 * 适用于低精度但需要 Alpha 通道的纹理。
 *
 * @type {number}
 * @constant
 */
export const UnsignedShort4444Type = 1017;

/**
 * 无符号短整型 5_5_5_1 打包格式
 *
 * 16 位打包格式，RGB 各占 5 位，Alpha 占 1 位。
 * 适用于不需要高精度 Alpha 的纹理。
 *
 * @type {number}
 * @constant
 */
export const UnsignedShort5551Type = 1018;

/**
 * 无符号整型 24_8 格式
 *
 * 32 位格式，通常用于深度模板纹理。
 * 24 位用于深度，8 位用于模板。
 *
 * @type {number}
 * @constant
 */
export const UnsignedInt248Type = 1020;

/**
 * 无符号整型 5_9_9_9 打包格式
 *
 * 32 位共享指数格式，用于 HDR 纹理。
 * RGB 各占 9 位尾数，共享 5 位指数。
 *
 * @type {number}
 * @constant
 */
export const UnsignedInt5999Type = 35902;

// ========================================
// 纹理格式常量
// ========================================

/**
 * Alpha 格式
 *
 * 丢弃红、绿、蓝分量，只读取 Alpha 分量。
 * 常用于透明度遮罩和 Alpha 测试。
 *
 * @type {number}
 * @constant
 */
export const AlphaFormat = 1021;

/**
 * RGB 格式
 *
 * 丢弃 Alpha 分量，读取红、绿、蓝分量。
 * 这是最常用的不透明纹理格式。
 *
 * @type {number}
 * @constant
 */
export const RGBFormat = 1022;

/**
 * RGBA 格式
 *
 * 读取红、绿、蓝和 Alpha 分量。
 * 支持透明度的完整颜色格式。
 *
 * @type {number}
 * @constant
 */
export const RGBAFormat = 1023;

/**
 * 深度格式
 *
 * 将每个元素作为单一深度值读取，转换为浮点数并钳制到 [0,1] 范围。
 * 用于深度纹理和阴影贴图。
 *
 * @type {number}
 * @constant
 */
export const DepthFormat = 1026;

/**
 * 深度模板格式
 *
 * 每个元素包含深度和模板值对。深度分量按 DepthFormat 解释，
 * 模板分量根据深度+模板内部格式解释。
 *
 * @type {number}
 * @constant
 */
export const DepthStencilFormat = 1027;

/**
 * 红色格式
 *
 * 丢弃绿、蓝和 Alpha 分量，只读取红色分量。
 * 常用于单通道数据，如高度图、遮罩等。
 *
 * @type {number}
 * @constant
 */
export const RedFormat = 1028;

/**
 * 红色整数格式
 *
 * 丢弃绿、蓝和 Alpha 分量，只读取红色分量。
 * 纹理元素作为整数而非浮点数读取。
 *
 * @type {number}
 * @constant
 */
export const RedIntegerFormat = 1029;

/**
 * RG 格式
 *
 * 丢弃 Alpha 和蓝色分量，读取红色和绿色分量。
 * 常用于法线贴图的 XY 分量或双通道数据。
 *
 * @type {number}
 * @constant
 */
export const RGFormat = 1030;

/**
 * RG 整数格式
 *
 * 丢弃 Alpha 和蓝色分量，读取红色和绿色分量。
 * 纹理元素作为整数而非浮点数读取。
 *
 * @type {number}
 * @constant
 */
export const RGIntegerFormat = 1031;

/**
 * RGB 整数格式
 *
 * 丢弃 Alpha 分量，读取红、绿、蓝分量。
 * 纹理元素作为整数而非浮点数读取。
 *
 * @type {number}
 * @constant
 */
export const RGBIntegerFormat = 1032;

/**
 * RGBA 整数格式
 *
 * 读取红、绿、蓝和 Alpha 分量。
 * 纹理元素作为整数而非浮点数读取。
 *
 * @type {number}
 * @constant
 */
export const RGBAIntegerFormat = 1033;

// ========================================
// 压缩纹理格式常量
// ========================================

/**
 * RGB S3TC DXT1 格式
 *
 * RGB 图像格式的 DXT1 压缩图像。
 * 提供 6:1 的压缩比，不支持 Alpha 通道。
 *
 * @type {number}
 * @constant
 */
export const RGB_S3TC_DXT1_Format = 33776;

/**
 * RGBA S3TC DXT1 格式
 *
 * RGB 图像格式的 DXT1 压缩图像，带有简单的开/关 Alpha 值。
 * 支持 1 位 Alpha（完全透明或完全不透明）。
 *
 * @type {number}
 * @constant
 */
export const RGBA_S3TC_DXT1_Format = 33777;

/**
 * RGBA S3TC DXT3 格式
 *
 * RGBA 图像格式的 DXT3 压缩图像。
 * 相比 32 位 RGBA 纹理提供 4:1 压缩比，Alpha 压缩质量中等。
 *
 * @type {number}
 * @constant
 */
export const RGBA_S3TC_DXT3_Format = 33778;

/**
 * RGBA S3TC DXT5 格式
 *
 * RGBA 图像格式的 DXT5 压缩图像。
 * 同样提供 4:1 压缩比，但 Alpha 压缩方式与 DXT3 不同，质量更高。
 *
 * @type {number}
 * @constant
 */
export const RGBA_S3TC_DXT5_Format = 33779;

/**
 * RGB PVRTC 4BPP V1 格式
 *
 * 4 位模式的 PVRTC RGB 压缩。
 * 每个 4×4 像素块使用一个压缩块，主要用于移动设备。
 *
 * @type {number}
 * @constant
 */
export const RGB_PVRTC_4BPPV1_Format = 35840;

/**
 * RGB PVRTC 2BPP V1 格式
 *
 * 2 位模式的 PVRTC RGB 压缩。
 * 每个 8×4 像素块使用一个压缩块，压缩比更高。
 *
 * @type {number}
 * @constant
 */
export const RGB_PVRTC_2BPPV1_Format = 35841;

/**
 * PVRTC RGBA compression in 4-bit mode. One block for each 4×4 pixels.
 *
 * @type {number}
 * @constant
 */
export const RGBA_PVRTC_4BPPV1_Format = 35842;

/**
 * PVRTC RGBA compression in 2-bit mode. One block for each 8×4 pixels.
 *
 * @type {number}
 * @constant
 */
export const RGBA_PVRTC_2BPPV1_Format = 35843;

/**
 * ETC1 RGB format.
 *
 * @type {number}
 * @constant
 */
export const RGB_ETC1_Format = 36196;

/**
 * ETC2 RGB format.
 *
 * @type {number}
 * @constant
 */
export const RGB_ETC2_Format = 37492;

/**
 * ETC2 RGBA format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ETC2_EAC_Format = 37496;

/**
 * ASTC RGBA 4x4 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_4x4_Format = 37808;

/**
 * ASTC RGBA 5x4 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_5x4_Format = 37809;

/**
 * ASTC RGBA 5x5 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_5x5_Format = 37810;

/**
 * ASTC RGBA 6x5 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_6x5_Format = 37811;

/**
 * ASTC RGBA 6x6 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_6x6_Format = 37812;

/**
 * ASTC RGBA 8x5 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_8x5_Format = 37813;

/**
 * ASTC RGBA 8x6 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_8x6_Format = 37814;

/**
 * ASTC RGBA 8x8 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_8x8_Format = 37815;

/**
 * ASTC RGBA 10x5 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_10x5_Format = 37816;

/**
 * ASTC RGBA 10x6 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_10x6_Format = 37817;

/**
 * ASTC RGBA 10x8 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_10x8_Format = 37818;

/**
 * ASTC RGBA 10x10 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_10x10_Format = 37819;

/**
 * ASTC RGBA 12x10 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_12x10_Format = 37820;

/**
 * ASTC RGBA 12x12 format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_ASTC_12x12_Format = 37821;

/**
 * BPTC RGBA format.
 *
 * @type {number}
 * @constant
 */
export const RGBA_BPTC_Format = 36492;

/**
 * BPTC Signed RGB format.
 *
 * @type {number}
 * @constant
 */
export const RGB_BPTC_SIGNED_Format = 36494;

/**
 * BPTC Unsigned RGB format.
 *
 * @type {number}
 * @constant
 */
export const RGB_BPTC_UNSIGNED_Format = 36495;

/**
 * RGTC1 Red format.
 *
 * @type {number}
 * @constant
 */
export const RED_RGTC1_Format = 36283;

/**
 * RGTC1 Signed Red format.
 *
 * @type {number}
 * @constant
 */
export const SIGNED_RED_RGTC1_Format = 36284;

/**
 * RGTC2 Red Green format.
 *
 * @type {number}
 * @constant
 */
export const RED_GREEN_RGTC2_Format = 36285;

/**
 * RGTC2 Signed Red Green format.
 *
 * @type {number}
 * @constant
 */
export const SIGNED_RED_GREEN_RGTC2_Format = 36286;

/**
 * Animations are played once.
 *
 * @type {number}
 * @constant
 */
export const LoopOnce = 2200;

/**
 * Animations are played with a chosen number of repetitions, each time jumping from
 * the end of the clip directly to its beginning.
 *
 * @type {number}
 * @constant
 */
export const LoopRepeat = 2201;

// ========================================
// 动画循环和插值常量
// ========================================

/**
 * 乒乓循环
 *
 * 动画以选定的重复次数播放，交替向前和向后播放。
 * 创建来回摆动的效果，常用于周期性动画。
 *
 * @type {number}
 * @constant
 */
export const LoopPingPong = 2202;

/**
 * 离散插值模式
 *
 * 关键帧轨道的离散插值模式。
 * 不进行插值，直接跳跃到下一个关键帧值。
 *
 * @type {number}
 * @constant
 */
export const InterpolateDiscrete = 2300;

/**
 * 线性插值模式
 *
 * 关键帧轨道的线性插值模式。
 * 在关键帧之间进行直线插值，产生匀速变化。
 *
 * @type {number}
 * @constant
 */
export const InterpolateLinear = 2301;

/**
 * 平滑插值模式
 *
 * 关键帧轨道的平滑插值模式。
 * 使用样条曲线插值，产生平滑的过渡效果。
 *
 * @type {number}
 * @constant
 */
export const InterpolateSmooth = 2302;

// ========================================
// 动画结束模式常量
// ========================================

/**
 * 零曲率结束
 *
 * 动画的零曲率结束模式。
 * 在动画结束时保持零曲率，产生平滑的停止。
 *
 * @type {number}
 * @constant
 */
export const ZeroCurvatureEnding = 2400;

/**
 * 零斜率结束
 *
 * 动画的零斜率结束模式。
 * 在动画结束时保持零斜率，产生平缓的停止。
 *
 * @type {number}
 * @constant
 */
export const ZeroSlopeEnding = 2401;

/**
 * Wrap around ending for animations.
 *
 * @type {number}
 * @constant
 */
export const WrapAroundEnding = 2402;

/**
 * Default animation blend mode.
 *
 * @type {number}
 * @constant
 */
export const NormalAnimationBlendMode = 2500;

/**
 * Additive animation blend mode. Can be used to layer motions on top of
 * each other to build complex performances from smaller re-usable assets.
 *
 * @type {number}
 * @constant
 */
export const AdditiveAnimationBlendMode = 2501;

/**
 * For every three vertices draw a single triangle.
 *
 * @type {number}
 * @constant
 */
export const TrianglesDrawMode = 0;

/**
 * For each vertex draw a triangle from the last three vertices.
 *
 * @type {number}
 * @constant
 */
export const TriangleStripDrawMode = 1;

/**
 * For each vertex draw a triangle from the first vertex and the last two vertices.
 *
 * @type {number}
 * @constant
 */
export const TriangleFanDrawMode = 2;

/**
 * Basic depth packing.
 *
 * @type {number}
 * @constant
 */
export const BasicDepthPacking = 3200;

/**
 * A depth value is packed into 32 bit RGBA.
 *
 * @type {number}
 * @constant
 */
export const RGBADepthPacking = 3201;

/**
 * A depth value is packed into 24 bit RGB.
 *
 * @type {number}
 * @constant
 */
export const RGBDepthPacking = 3202;

/**
 * A depth value is packed into 16 bit RG.
 *
 * @type {number}
 * @constant
 */
export const RGDepthPacking = 3203;

// ========================================
// 法线贴图类型常量
// ========================================

/**
 * 切线空间法线贴图
 *
 * 法线信息相对于底层表面。
 * 这是最常用的法线贴图类型，法线相对于表面的切线空间。
 *
 * @type {number}
 * @constant
 */
export const TangentSpaceNormalMap = 0;

/**
 * 对象空间法线贴图
 *
 * 法线信息相对于对象的方向。
 * 法线直接在对象的本地坐标系中定义。
 *
 * @type {number}
 * @constant
 */
export const ObjectSpaceNormalMap = 1;

// ========================================
// 颜色空间常量
// ========================================
// 颜色空间字符串标识符，与 CSS Color Module Level 4 和 WebGPU 名称匹配（如果可用）

/**
 * 无颜色空间
 *
 * 不指定颜色空间，使用原始数据。
 *
 * @type {string}
 * @constant
 */
export const NoColorSpace = "";

/**
 * sRGB 颜色空间
 *
 * 标准 RGB 颜色空间，这是最常用的颜色空间。
 * 适用于大多数显示设备和 Web 内容。
 *
 * @type {string}
 * @constant
 */
export const SRGBColorSpace = "srgb";

/**
 * 线性 sRGB 颜色空间
 *
 * 线性的 sRGB 颜色空间，没有伽马校正。
 * 用于线性光照计算和 HDR 渲染。
 *
 * @type {string}
 * @constant
 */
export const LinearSRGBColorSpace = "srgb-linear";

// ========================================
// 颜色传输函数常量
// ========================================

/**
 * 线性传输函数
 *
 * 线性颜色传输函数，不进行伽马校正。
 * 用于线性光照计算。
 *
 * @type {string}
 * @constant
 */
export const LinearTransfer = "linear";

/**
 * sRGB 传输函数
 *
 * sRGB 颜色传输函数，包含伽马校正。
 * 这是显示设备的标准传输函数。
 *
 * @type {string}
 * @constant
 */
export const SRGBTransfer = "srgb";

// ========================================
// 模板缓冲区操作常量
// ========================================

/**
 * 零模板操作
 *
 * 将模板缓冲区值设置为 0。
 * 用于清除模板值。
 *
 * @type {number}
 * @constant
 */
export const ZeroStencilOp = 0;

/**
 * 保持模板操作
 *
 * 保持当前模板缓冲区值不变。
 * 这是最常用的模板操作。
 *
 * @type {number}
 * @constant
 */
export const KeepStencilOp = 7680;

/**
 * 替换模板操作
 *
 * 将模板缓冲区值设置为指定的参考值。
 * 用于写入特定的模板值。
 *
 * @type {number}
 * @constant
 */
export const ReplaceStencilOp = 7681;

/**
 * 递增模板操作
 *
 * 递增当前模板缓冲区值。
 * 钳制到最大可表示的无符号值。
 *
 * @type {number}
 * @constant
 */
export const IncrementStencilOp = 7682;

/**
 * 递减模板操作
 *
 * 递减当前模板缓冲区值。
 * 钳制到 0。
 *
 * @type {number}
 * @constant
 */
export const DecrementStencilOp = 7683;

/**
 * 递增环绕模板操作
 *
 * 递增当前模板缓冲区值。当递增最大可表示无符号值时，
 * 模板缓冲区值环绕到零。
 *
 * @type {number}
 * @constant
 */
export const IncrementWrapStencilOp = 34055;

/**
 * 递减环绕模板操作
 *
 * 递减当前模板缓冲区值。当递减模板缓冲区值 0 时，
 * 环绕到最大可表示的无符号值。
 *
 * @type {number}
 * @constant
 */
export const DecrementWrapStencilOp = 34056;

/**
 * 反转模板操作
 *
 * 按位反转当前模板缓冲区值。
 * 将所有位取反。
 *
 * @type {number}
 * @constant
 */
export const InvertStencilOp = 5386;

// ========================================
// 模板测试函数常量
// ========================================

/**
 * 从不通过模板函数
 *
 * 模板测试永远不会返回 true。
 * 用于完全阻止渲染。
 *
 * @type {number}
 * @constant
 */
export const NeverStencilFunc = 512;

/**
 * 小于模板函数
 *
 * 当模板参考值小于当前模板值时返回 true。
 *
 * @type {number}
 * @constant
 */
export const LessStencilFunc = 513;

/**
 * 等于模板函数
 *
 * 当模板参考值等于当前模板值时返回 true。
 * 这是最常用的模板测试函数。
 *
 * @type {number}
 * @constant
 */
export const EqualStencilFunc = 514;

/**
 * 小于等于模板函数
 *
 * 当模板参考值小于或等于当前模板值时返回 true。
 *
 * @type {number}
 * @constant
 */
export const LessEqualStencilFunc = 515;

/**
 * 大于模板函数
 *
 * 当模板参考值大于当前模板值时返回 true。
 *
 * @type {number}
 * @constant
 */
export const GreaterStencilFunc = 516;

/**
 * 不等于模板函数
 *
 * 当模板参考值不等于当前模板值时返回 true。
 *
 * @type {number}
 * @constant
 */
export const NotEqualStencilFunc = 517;

/**
 * 大于等于模板函数
 *
 * 当模板参考值大于或等于当前模板值时返回 true。
 *
 * @type {number}
 * @constant
 */
export const GreaterEqualStencilFunc = 518;

/**
 * 总是通过模板函数
 *
 * 模板测试总是返回 true。
 * 相当于禁用模板测试。
 *
 * @type {number}
 * @constant
 */
export const AlwaysStencilFunc = 519;

// ========================================
// 纹理比较函数常量
// ========================================

/**
 * 从不通过比较
 *
 * 比较测试永远不会通过。
 * 用于完全禁用纹理采样。
 *
 * @type {number}
 * @constant
 */
export const NeverCompare = 512;

/**
 * 小于比较
 *
 * 当输入值小于纹理值时通过。
 * 常用于阴影贴图的深度比较。
 *
 * @type {number}
 * @constant
 */
export const LessCompare = 513;

/**
 * 等于比较
 *
 * 当输入值等于纹理值时通过。
 *
 * @type {number}
 * @constant
 */
export const EqualCompare = 514;

/**
 * 小于等于比较
 *
 * 当输入值小于或等于纹理值时通过。
 * 这是阴影贴图最常用的比较函数。
 *
 * @type {number}
 * @constant
 */
export const LessEqualCompare = 515;

/**
 * 大于比较
 *
 * 当输入值大于纹理值时通过。
 *
 * @type {number}
 * @constant
 */
export const GreaterCompare = 516;

/**
 * 不等于比较
 *
 * 当输入值不等于纹理值时通过。
 *
 * @type {number}
 * @constant
 */
export const NotEqualCompare = 517;

/**
 * 大于等于比较
 *
 * 当输入值大于或等于纹理值时通过。
 *
 * @type {number}
 * @constant
 */
export const GreaterEqualCompare = 518;

/**
 * 总是通过比较
 *
 * 比较测试总是通过。
 * 相当于禁用比较功能。
 *
 * @type {number}
 * @constant
 */
export const AlwaysCompare = 519;

// ========================================
// 缓冲区使用模式常量
// ========================================

/**
 * 静态绘制使用
 *
 * 内容由应用程序指定一次，并多次用作绘制和图像规范命令的源。
 * 适用于不经常更改的几何数据，如静态模型。
 *
 * @type {number}
 * @constant
 */
export const StaticDrawUsage = 35044;

/**
 * 动态绘制使用
 *
 * 内容由应用程序重复重新指定，并多次用作绘制和图像规范命令的源。
 * 适用于经常更新的几何数据，如动画模型。
 *
 * @type {number}
 * @constant
 */
export const DynamicDrawUsage = 35048;

/**
 * 流式绘制使用
 *
 * 内容由应用程序指定一次，最多用作绘制和图像规范命令的源几次。
 * 适用于临时或一次性使用的数据。
 *
 * @type {number}
 * @constant
 */
export const StreamDrawUsage = 35040;

/**
 * 静态读取使用
 *
 * 内容通过从 3D API 读取数据指定一次，并由应用程序多次查询。
 * 适用于需要 CPU 读取的静态数据。
 *
 * @type {number}
 * @constant
 */
export const StaticReadUsage = 35045;

/**
 * 动态读取使用
 *
 * 内容通过从 3D API 读取数据重复重新指定，并由应用程序多次查询。
 * 适用于需要 CPU 频繁读取的动态数据。
 *
 * @type {number}
 * @constant
 */
export const DynamicReadUsage = 35049;

/**
 * 流式读取使用
 *
 * 内容通过从 3D API 读取数据指定一次，应用程序最多查询几次。
 * 适用于临时读取的数据。
 *
 * @type {number}
 * @constant
 */
export const StreamReadUsage = 35041;

/**
 * 静态复制使用
 *
 * 内容通过从 3D API 读取数据指定一次，并多次用作 WebGL 绘制和图像规范命令的源。
 * 适用于 GPU 到 GPU 的静态数据复制。
 *
 * @type {number}
 * @constant
 */
export const StaticCopyUsage = 35046;

/**
 * 动态复制使用
 *
 * 内容通过从 3D API 读取数据重复重新指定，并多次用作 WebGL 绘制和图像规范命令的源。
 * 适用于 GPU 到 GPU 的动态数据复制。
 *
 * @type {number}
 * @constant
 */
export const DynamicCopyUsage = 35050;

/**
 * 流式复制使用
 *
 * 内容通过从 3D API 读取数据指定一次，最多几次用作 WebGL 绘制和图像规范命令的源。
 * 适用于临时的 GPU 到 GPU 数据复制。
 *
 * @type {number}
 * @constant
 */
export const StreamCopyUsage = 35042;

// ========================================
// 着色器和坐标系统常量
// ========================================

/**
 * GLSL 1.0 着色器代码版本
 *
 * 对应 WebGL 1.0 的着色器语言版本。
 * 版本字符串为 "100"。
 *
 * @type {string}
 * @constant
 */
export const GLSL1 = "100";

/**
 * GLSL 3.0 ES 着色器代码版本
 *
 * 对应 WebGL 2.0 的着色器语言版本。
 * 版本字符串为 "300 es"。
 *
 * @type {string}
 * @constant
 */
export const GLSL3 = "300 es";

/**
 * WebGL 坐标系统
 *
 * 标识使用 WebGL 的坐标系统约定。
 * WebGL 使用右手坐标系，Y 轴向上。
 *
 * @type {number}
 * @constant
 */
export const WebGLCoordinateSystem = 2000;

/**
 * WebGPU 坐标系统
 *
 * 标识使用 WebGPU 的坐标系统约定。
 * WebGPU 使用左手坐标系，Y 轴向下。
 *
 * @type {number}
 * @constant
 */
export const WebGPUCoordinateSystem = 2001;

// ========================================
// 查询和采样常量对象
// ========================================

/**
 * 时间戳查询类型
 *
 * 表示不同的时间戳查询类型，用于性能分析。
 *
 * @type {ConstantsTimestampQuery}
 * @constant
 */
export const TimestampQuery = {
  COMPUTE: "compute", // 计算着色器查询
  RENDER: "render", // 渲染查询
};

/**
 * 插值采样类型
 *
 * 表示着色器中不同的插值采样类型。
 *
 * @type {ConstantsInterpolationSamplingType}
 * @constant
 */
export const InterpolationSamplingType = {
  PERSPECTIVE: "perspective", // 透视校正插值
  LINEAR: "linear", // 线性插值
  FLAT: "flat", // 平面插值（无插值）
};

/**
 * 插值采样模式
 *
 * 表示不同的插值采样模式，用于多重采样。
 *
 * @type {ConstantsInterpolationSamplingMode}
 * @constant
 */
export const InterpolationSamplingMode = {
  NORMAL: "normal", // 正常采样模式
  CENTROID: "centroid", // 质心采样模式
  SAMPLE: "sample", // 样本特定采样模式
  FIRST: "first", // 使用第一个顶点的平面插值
  EITHER: "either", // 使用任一顶点的平面插值
};

// ========================================
// TypeScript 类型定义
// ========================================

/**
 * 鼠标按键和控制器交互类型定义
 *
 * 这个类型表示控制器上下文中的鼠标按键和交互类型。
 *
 * @typedef {Object} ConstantsMouse
 * @property {number} LEFT - 鼠标左键
 * @property {number} MIDDLE - 鼠标中键
 * @property {number} RIGHT - 鼠标右键
 * @property {number} ROTATE - 旋转交互
 * @property {number} DOLLY - 缩放交互
 * @property {number} PAN - 平移交互
 */

/**
 * 触摸交互类型定义
 *
 * 这个类型表示控制器上下文中的触摸交互类型。
 *
 * @typedef {Object} ConstantsTouch
 * @property {number} ROTATE - 旋转交互
 * @property {number} PAN - 平移交互
 * @property {number} DOLLY_PAN - 缩放-平移交互
 * @property {number} DOLLY_ROTATE - 缩放-旋转交互
 */

/**
 * 时间戳查询类型定义
 *
 * 这个类型表示不同的时间戳查询类型。
 *
 * @typedef {Object} ConstantsTimestampQuery
 * @property {string} COMPUTE - 计算着色器时间戳查询
 * @property {string} RENDER - 渲染时间戳查询
 */

/**
 * 插值采样类型定义
 *
 * 表示不同的插值采样类型。
 *
 * @typedef {Object} ConstantsInterpolationSamplingType
 * @property {string} PERSPECTIVE - 透视校正插值
 * @property {string} LINEAR - 线性插值
 * @property {string} FLAT - 平面插值
 */

/**
 * 插值采样模式定义
 *
 * 表示不同的插值采样模式。
 *
 * @typedef {Object} ConstantsInterpolationSamplingMode
 * @property {string} NORMAL - 正常采样模式
 * @property {string} CENTROID - 质心采样模式
 * @property {string} SAMPLE - 样本特定采样模式
 * @property {string} FIRST - 使用第一个顶点的平面插值
 * @property {string} EITHER - 使用任一顶点的平面插值
 */
