#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 自动扫描 custom 目录并更新 files.json 中的 custom 部分
 */
function updateCustomExamples() {
  const customDir = path.join(__dirname, "..", "custom");
  const filesJsonPath = path.join(__dirname, "..", "files.json");

  console.log("开始扫描 custom 目录...");

  // 检查 custom 目录是否存在
  if (!fs.existsSync(customDir)) {
    console.log("custom 目录不存在，创建空的 custom 分类");
    updateFilesJson(filesJsonPath, []);
    return;
  }

  // 扫描 custom 目录
  const customExamples = scanCustomDirectory(customDir);

  console.log(`找到 ${customExamples.length} 个自定义示例:`);
  customExamples.forEach((example) => {
    console.log(`  - ${example}`);
  });

  // 更新 files.json
  updateFilesJson(filesJsonPath, customExamples);

  console.log("更新完成！");
}

/**
 * 扫描 custom 目录，找到所有符合规则的示例
 */
function scanCustomDirectory(customDir) {
  const examples = [];

  try {
    const items = fs.readdirSync(customDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const folderPath = path.join(customDir, item.name);
        const htmlFiles = findHtmlFiles(folderPath);

        // 根据规则，每个文件夹下应该有一个 HTML 文件
        if (htmlFiles.length > 0) {
          // 使用第一个找到的 HTML 文件
          const htmlFile = htmlFiles[0];
          const relativePath = path.relative(path.join(__dirname, ".."), htmlFile);
          // 移除 .html 扩展名，因为 files.json 中不包含扩展名
          const exampleName = relativePath.replace(/\.html$/, "").replace(/\\/g, "/");
          examples.push(exampleName);
        } else {
          console.warn(`警告: 文件夹 ${item.name} 中没有找到 HTML 文件`);
        }
      }
    }
  } catch (error) {
    console.error("扫描 custom 目录时出错:", error.message);
  }

  return examples.sort(); // 按字母顺序排序
}

/**
 * 在指定目录中查找 HTML 文件
 */
function findHtmlFiles(dir) {
  const htmlFiles = [];

  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile() && item.name.endsWith(".html")) {
        htmlFiles.push(path.join(dir, item.name));
      }
    }
  } catch (error) {
    console.error(`读取目录 ${dir} 时出错:`, error.message);
  }

  return htmlFiles;
}

/**
 * 更新 files.json 文件
 */
function updateFilesJson(filesJsonPath, customExamples) {
  try {
    // 读取现有的 files.json
    let filesData = {};
    if (fs.existsSync(filesJsonPath)) {
      const filesContent = fs.readFileSync(filesJsonPath, "utf8");
      filesData = JSON.parse(filesContent);
    }

    // 更新 custom 部分
    filesData.custom = customExamples;

    // 写回文件，保持格式化
    const updatedContent = JSON.stringify(filesData, null, 2);
    fs.writeFileSync(filesJsonPath, updatedContent, "utf8");

    console.log(`已更新 files.json，custom 部分包含 ${customExamples.length} 个示例`);
  } catch (error) {
    console.error("更新 files.json 时出错:", error.message);
  }
}

// 如果直接运行此脚本（而不是被导入）
if (import.meta.url === `file://${process.argv[1]}`) {
  updateCustomExamples();
}

export { updateCustomExamples };
