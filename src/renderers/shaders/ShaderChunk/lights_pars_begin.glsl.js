export default /* glsl */` // 导出GLSL片段开始
uniform bool receiveShadow; // 是否接收阴影
uniform vec3 ambientLightColor; // 环境光颜色

#if defined( USE_LIGHT_PROBES ) // 若启用光照探针

	uniform vec3 lightProbe[ 9 ]; // 球谐光照系数(9项)

#endif // 结束USE_LIGHT_PROBES

// get the irradiance (radiance convolved with cosine lobe) at the point 'normal' on the unit sphere // 计算单位球上法线方向的辐照度
// source: https://graphics.stanford.edu/papers/envmap/envmap.pdf // 参考来源
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) { // 使用球谐基近似

	// normal is assumed to have unit length // 假设法线为单位向量

	float x = normal.x, y = normal.y, z = normal.z; // 分量展开

	// band 0 // 0阶带
	vec3 result = shCoefficients[ 0 ] * 0.886227; // 常数项

	// band 1 // 1阶带
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y; // Y项
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z; // Z项
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x; // X项

	// band 2 // 2阶带
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y; // XY项
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z; // YZ项
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 ); // (3Z^2-1)项
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z; // XZ项
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y ); // (X^2 - Y^2)项

	return result; // 返回辐照度

}

vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) { // 由光照探针获取辐照度

	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix ); // 将法线转到世界空间

	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe ); // 球谐评估

	return irradiance; // 返回辐照度

}

vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) { // 环境光辐照度

	vec3 irradiance = ambientLightColor; // 直接使用环境光颜色

	return irradiance; // 返回辐照度

}

float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) { // 距离衰减

	// based upon Frostbite 3 Moving to Physically-based Rendering // 参考Frostbite3 PBR课程
	// page 32, equation 26: E[window1] // 公式说明
	// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf // 链接
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 ); // 基本衰减项

	if ( cutoffDistance > 0.0 ) { // 有截断距离时

		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) ); // 平滑截断

	}

	return distanceFalloff; // 返回衰减

}

float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) { // 聚光衰减

	return smoothstep( coneCosine, penumbraCosine, angleCosine ); // 在主锥与半影之间平滑

}

#if NUM_DIR_LIGHTS > 0 // 方向光

	struct DirectionalLight { // 方向光结构体
		vec3 direction; // 光方向（从片元指向光源反方向）
		vec3 color; // 光颜色
	};

	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ]; // 方向光数组

	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) { // 获取方向光信息

		light.color = directionalLight.color; // 设置光颜色
		light.direction = directionalLight.direction; // 设置光方向
		light.visible = true; // 始终可见

	}

#endif // 结束方向光


#if NUM_POINT_LIGHTS > 0 // 点光源

	struct PointLight { // 点光结构体
		vec3 position; // 世界空间位置
		vec3 color; // 颜色
		float distance; // 衰减半径
		float decay; // 衰减指数
	};

	uniform PointLight pointLights[ NUM_POINT_LIGHTS ]; // 点光数组

	// light is an out parameter as having it as a return value caused compiler errors on some devices // 使用out参数以兼容部分设备
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) { // 获取点光信息

		vec3 lVector = pointLight.position - geometryPosition; // 光向量

		light.direction = normalize( lVector ); // 入射方向

		float lightDistance = length( lVector ); // 距离

		light.color = pointLight.color; // 基础颜色
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay ); // 距离衰减
		light.visible = ( light.color != vec3( 0.0 ) ); // 是否可见

	}

#endif // 结束点光


#if NUM_SPOT_LIGHTS > 0 // 聚光源

	struct SpotLight { // 聚光结构体
		vec3 position; // 位置
		vec3 direction; // 主轴方向
		vec3 color; // 颜色
		float distance; // 衰减半径
		float decay; // 衰减指数
		float coneCos; // 主锥余弦
		float penumbraCos; // 半影余弦
	};

	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ]; // 聚光数组

	// light is an out parameter as having it as a return value caused compiler errors on some devices // 兼容性说明
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) { // 获取聚光信息

		vec3 lVector = spotLight.position - geometryPosition; // 光向量

		light.direction = normalize( lVector ); // 入射方向

		float angleCos = dot( light.direction, spotLight.direction ); // 与主轴夹角余弦

		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos ); // 聚光衰减

		if ( spotAttenuation > 0.0 ) { // 在光锥内

			float lightDistance = length( lVector ); // 距离

			light.color = spotLight.color * spotAttenuation; // 颜色乘聚光系数
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay ); // 距离衰减
			light.visible = ( light.color != vec3( 0.0 ) ); // 可见性

		} else { // 光锥外

			light.color = vec3( 0.0 ); // 无光
			light.visible = false; // 不可见

		}

	}

#endif // 结束聚光


#if NUM_RECT_AREA_LIGHTS > 0 // 面光源（矩形）

	struct RectAreaLight { // 矩形面光结构体
		vec3 color; // 光颜色
		vec3 position; // 位置
		vec3 halfWidth; // 半宽向量
		vec3 halfHeight; // 半高向量
	};

	// Pre-computed values of LinearTransformedCosine approximation of BRDF // 预计算LTC系数
	// BRDF approximation Texture is 64x64 // 查找表大小64x64
	uniform sampler2D ltc_1; // RGBA Float // LTC表1
	uniform sampler2D ltc_2; // RGBA Float // LTC表2

	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ]; // 面光源数组

#endif // 结束面光源


#if NUM_HEMI_LIGHTS > 0 // 半球光

	struct HemisphereLight { // 半球光结构体
		vec3 direction; // 天空方向（从地面指向天空）
		vec3 skyColor; // 天空颜色
		vec3 groundColor; // 地面颜色
	};

	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ]; // 半球光数组

	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) { // 半球光辐照度

		float dotNL = dot( normal, hemiLight.direction ); // 法线与天空方向余弦
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5; // 线性权重

		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight ); // 在地面与天空色之间插值

		return irradiance; // 返回辐照度

	}

#endif // 结束半球光
`;
