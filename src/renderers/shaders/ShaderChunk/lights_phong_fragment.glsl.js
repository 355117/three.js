export default /* glsl */`
BlinnPhongMaterial material; // 中文：构造 Blinn-Phong 材质参数
material.diffuseColor = diffuseColor.rgb; // 中文：设置漫反射颜色
material.specularColor = specular; // 中文：设置高光颜色
material.specularShininess = shininess; // 中文：高光锐度（越大越尖锐）
material.specularStrength = specularStrength; // 中文：整体高光强度缩放
`;
