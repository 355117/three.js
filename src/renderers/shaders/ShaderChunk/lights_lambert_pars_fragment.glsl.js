export default /* glsl */`
varying vec3 vViewPosition; // 中文：视角方向在视图空间的向量（供光照计算）

struct LambertMaterial { // 中文：兰伯特材质结构体

	vec3 diffuseColor; // 中文：漫反射颜色
	float specularStrength; // 中文：高光强度（用于统一缩放）

}; // 中文：结构体结束

void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) { // 中文：直接光兰伯特项计算

	float dotNL = saturate( dot( geometryNormal, directLight.direction ) ); // 中文：法线与光线方向的夹角余弦，限制在 [0,1]
	vec3 irradiance = dotNL * directLight.color; // 中文：计算入射辐照度（颜色权重）

	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：累加直接漫反射项（兰伯特 BRDF）

} // 中文：函数结束

void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) { // 中文：间接漫反射（环境光/IBL）兰伯特项

	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：累加间接漫反射项

} // 中文：函数结束

#define RE_Direct				RE_Direct_Lambert // 中文：将 RE_Direct 宏映射到兰伯特实现
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert // 中文：将 RE_IndirectDiffuse 宏映射到兰伯特实现
`;
