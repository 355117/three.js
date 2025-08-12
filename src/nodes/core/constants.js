/**
 * Possible shader stages.
 * 可能的着色器阶段。
 *
 * @property {string} VERTEX The vertex shader stage. 顶点着色器阶段。
 * @property {string} FRAGMENT The fragment shader stage. 片段着色器阶段。
 */
export const NodeShaderStage = {
  VERTEX: "vertex", // 顶点着色器阶段
  FRAGMENT: "fragment", // 片段着色器阶段
};

/**
 * Update types of a node.
 * 节点的更新类型。
 *
 * @property {string} NONE The update method is not executed. 不执行更新方法。
 * @property {string} FRAME The update method is executed per frame. 每帧执行更新方法。
 * @property {string} RENDER The update method is executed per render. A frame might be produced by multiple render calls so this value allows more detailed updates than FRAME. 每次渲染执行更新方法。一帧可能由多次渲染调用产生，因此此值允许比FRAME更详细的更新。
 * @property {string} OBJECT The update method is executed per {@link Object3D} that uses the node for rendering. 对每个使用节点进行渲染的{@link Object3D}执行更新方法。
 */
export const NodeUpdateType = {
  NONE: "none", // 无更新
  FRAME: "frame", // 每帧更新
  RENDER: "render", // 每次渲染更新
  OBJECT: "object", // 每个对象更新
};

/**
 * Data types of a node.
 * 节点的数据类型。
 *
 * @property {string} BOOLEAN Boolean type. 布尔类型。
 * @property {string} INTEGER Integer type. 整数类型。
 * @property {string} FLOAT Float type. 浮点数类型。
 * @property {string} VECTOR2 Two-dimensional vector type. 二维向量类型。
 * @property {string} VECTOR3 Three-dimensional vector type. 三维向量类型。
 * @property {string} VECTOR4 Four-dimensional vector type. 四维向量类型。
 * @property {string} MATRIX2 2x2 matrix type. 2x2矩阵类型。
 * @property {string} MATRIX3 3x3 matrix type. 3x3矩阵类型。
 * @property {string} MATRIX4 4x4 matrix type. 4x4矩阵类型。
 */
export const NodeType = {
  BOOLEAN: "bool", // 布尔类型
  INTEGER: "int", // 整数类型
  FLOAT: "float", // 浮点数类型
  VECTOR2: "vec2", // 二维向量类型
  VECTOR3: "vec3", // 三维向量类型
  VECTOR4: "vec4", // 四维向量类型
  MATRIX2: "mat2", // 2x2矩阵类型
  MATRIX3: "mat3", // 3x3矩阵类型
  MATRIX4: "mat4", // 4x4矩阵类型
};

/**
 * Access types of a node. These are relevant for compute and storage usage.
 * 节点的访问类型。这些与计算和存储使用相关。
 *
 * @property {string} READ_ONLY Read-only access 只读访问
 * @property {string} WRITE_ONLY Write-only access. 只写访问。
 * @property {string} READ_WRITE Read and write access. 读写访问。
 */
export const NodeAccess = {
  READ_ONLY: "readOnly", // 只读访问
  WRITE_ONLY: "writeOnly", // 只写访问
  READ_WRITE: "readWrite", // 读写访问
};

// 默认着色器阶段：片段着色器和顶点着色器
export const defaultShaderStages = ["fragment", "vertex"];
// 默认构建阶段：设置、分析、生成
export const defaultBuildStages = ["setup", "analyze", "generate"];
// 着色器阶段：包含默认着色器阶段和计算着色器
export const shaderStages = [...defaultShaderStages, "compute"];
// 向量组件：x、y、z、w
export const vectorComponents = ["x", "y", "z", "w"];
