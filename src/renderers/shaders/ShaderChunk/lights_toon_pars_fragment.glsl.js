export default /* glsl */`
varying vec3 vViewPosition; // 中文：视图空间中的视点方向（供卡通光照使用）

struct ToonMaterial { // 中文：卡通材质结构体

	vec3 diffuseColor; // 中文：漫反射颜色

}; // 中文：结构体结束

void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) { // 中文：直接光卡通着色实现

	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color; // 中文：使用分段/梯度辐照度形成卡通风格明暗带

	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：将卡通辐照度乘以兰伯特漫反射

} // 中文：函数结束

void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) { // 中文：间接漫反射卡通着色实现

	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：间接漫反射累加（仍使用兰伯特）

} // 中文：函数结束

#define RE_Direct				RE_Direct_Toon // 中文：宏映射：直接光 -> 卡通实现
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon // 中文：宏映射：间接漫反射 -> 卡通实现
`;
