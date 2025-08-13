// @TODO: 如果我们只使用命名导出，可以将 "export { default as SomeNode, other, exports } from '...'" 简化为 "export * from '...'"

// 导出节点材质观察者管理器
export { default as NodeMaterialObserver } from "./manager/NodeMaterialObserver.js";

// 导出基础节点材质类
export { default as NodeMaterial } from "./NodeMaterial.js";
// 导出线条基础节点材质
export { default as LineBasicNodeMaterial } from "./LineBasicNodeMaterial.js";
// 导出虚线节点材质
export { default as LineDashedNodeMaterial } from "./LineDashedNodeMaterial.js";
// 导出Line2节点材质（用于粗线条渲染）
export { default as Line2NodeMaterial } from "./Line2NodeMaterial.js";
// 导出网格法线节点材质
export { default as MeshNormalNodeMaterial } from "./MeshNormalNodeMaterial.js";
// 导出网格基础节点材质
export { default as MeshBasicNodeMaterial } from "./MeshBasicNodeMaterial.js";
// 导出网格Lambert节点材质
export { default as MeshLambertNodeMaterial } from "./MeshLambertNodeMaterial.js";
// 导出网格Phong节点材质
export { default as MeshPhongNodeMaterial } from "./MeshPhongNodeMaterial.js";
// 导出网格标准节点材质（PBR）
export { default as MeshStandardNodeMaterial } from "./MeshStandardNodeMaterial.js";
// 导出网格物理节点材质（高级PBR）
export { default as MeshPhysicalNodeMaterial } from "./MeshPhysicalNodeMaterial.js";
// 导出网格次表面散射节点材质
export { default as MeshSSSNodeMaterial } from "./MeshSSSNodeMaterial.js";
// 导出网格卡通节点材质
export { default as MeshToonNodeMaterial } from "./MeshToonNodeMaterial.js";
// 导出网格Matcap节点材质（材质捕获）
export { default as MeshMatcapNodeMaterial } from "./MeshMatcapNodeMaterial.js";
// 导出点云节点材质
export { default as PointsNodeMaterial } from "./PointsNodeMaterial.js";
// 导出精灵节点材质
export { default as SpriteNodeMaterial } from "./SpriteNodeMaterial.js";
// 导出阴影节点材质
export { default as ShadowNodeMaterial } from "./ShadowNodeMaterial.js";
// 导出体积节点材质（体积渲染）
export { default as VolumeNodeMaterial } from "./VolumeNodeMaterial.js";
