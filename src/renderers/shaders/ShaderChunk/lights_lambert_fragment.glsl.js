export default /* glsl */`
LambertMaterial material; // 中文：构造用于兰伯特光照的材质参数结构
material.diffuseColor = diffuseColor.rgb; // 中文：从输入的漫反射颜色设置材质的漫反射分量
material.specularStrength = specularStrength; // 中文：设置高光强度（用于模型整体的高光贡献）
`;
