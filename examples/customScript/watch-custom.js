#!/usr/bin/env node

import chokidar from "chokidar";
import { updateCustomExamples } from "./update-custom-examples.js";
import { fileURLToPath } from "url";
import path from "path";

console.log("开始监听 examples/custom 目录的变化...");

// 首先执行一次更新
try {
  updateCustomExamples();
} catch (error) {
  console.error("初始更新失败:", error);
}

// 监听 examples/custom 目录的变化

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customDir = path.join(__dirname, "../custom");

const watcher = chokidar.watch(customDir, {
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  persistent: true,
  ignoreInitial: false, // 初始化时也触发一次
});

// 防抖函数，避免频繁触发
let updateTimeout;
function debouncedUpdate() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    console.log("检测到 custom 目录变化，更新 files.json...");
    updateCustomExamples();
  }, 500); // 500ms 防抖
}

watcher
  .on("add", (path) => {
    console.log(`文件已添加: ${path}`);
    debouncedUpdate();
  })
  .on("change", (path) => {
    console.log(`文件已修改: ${path}`);
    debouncedUpdate();
  })
  .on("unlink", (path) => {
    console.log(`文件已删除: ${path}`);
    debouncedUpdate();
  })
  .on("addDir", (path) => {
    console.log(`目录已添加: ${path}`);
    debouncedUpdate();
  })
  .on("unlinkDir", (path) => {
    console.log(`目录已删除: ${path}`);
    debouncedUpdate();
  })
  .on("error", (error) => {
    console.error(`监听器错误: ${error}`);
  })
  .on("ready", () => {
    console.log("文件监听器已就绪，正在监听 examples/custom 目录");
    // 初始化时执行一次更新
    debouncedUpdate();
  });

// 优雅退出处理
process.on("SIGINT", () => {
  console.log("\n正在关闭文件监听器...");
  watcher.close().then(() => {
    console.log("文件监听器已关闭");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\n正在关闭文件监听器...");
  watcher.close().then(() => {
    console.log("文件监听器已关闭");
    process.exit(0);
  });
});
