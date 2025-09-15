export default /* glsl */`
varying vec3 vViewPosition; // 中文：视图空间中的视点方向（供光照计算）

struct BlinnPhongMaterial { // 中文：Blinn-Phong 材质结构体

	vec3 diffuseColor; // 中文：漫反射颜色
	vec3 specularColor; // 中文：高光颜色
	float specularShininess; // 中文：高光锐度（越大越集中）
	float specularStrength; // 中文：高光强度缩放

}; // 中文：结构体结束

void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) { // 中文：直接光的 Blinn-Phong 计算

	float dotNL = saturate( dot( geometryNormal, directLight.direction ) ); // 中文：法线与光方向夹角余弦，限制 [0,1]
	vec3 irradiance = dotNL * directLight.color; // 中文：入射辐照度（按角度调制）

	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：直接漫反射（兰伯特）

	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength; // 中文：直接高光（Blinn-Phong），乘以强度

} // 中文：函数结束

void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) { // 中文：间接漫反射（环境/IBL）

	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor ); // 中文：间接漫反射累加（兰伯特）

} // 中文：函数结束

#define RE_Direct				RE_Direct_BlinnPhong // 中文：宏映射：直接光 -> Blinn-Phong 实现
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong // 中文：宏映射：间接漫反射 -> Blinn-Phong 实现
`;
