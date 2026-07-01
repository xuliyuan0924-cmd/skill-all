#!/bin/bash
# 功能沉淀池 - 设计师一键安装脚本
# 运行方式：bash setup.sh

set -e

REPO_URL="https://github.com/xuliyuan0924-cmd/skill-all.git"
INSTALL_DIR="$HOME/feature-pool"
CURSOR_SKILLS_DIR="$HOME/.cursor/skills"

echo ""
echo "🚀 功能沉淀池安装开始..."
echo ""

# 检查 git 是否已安装
if ! command -v git &> /dev/null; then
  echo "❌ 未检测到 git，请先安装 git 后重试。"
  exit 1
fi

# 克隆或更新仓库
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "📦 功能池已存在，正在更新到最新版本..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  echo "📦 正在克隆功能池仓库..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

# 创建 Cursor skills 目录（如不存在）
mkdir -p "$CURSOR_SKILLS_DIR"

# 创建 symlink：feature-pool 技能
if [ -L "$CURSOR_SKILLS_DIR/feature-pool" ]; then
  echo "🔗 feature-pool 技能链接已存在，跳过"
else
  ln -s "$INSTALL_DIR/.cursor/skills/feature-pool" "$CURSOR_SKILLS_DIR/feature-pool"
  echo "🔗 feature-pool 技能安装完成"
fi

# 创建 symlink：feature-add 技能
if [ -L "$CURSOR_SKILLS_DIR/feature-add" ]; then
  echo "🔗 feature-add 技能链接已存在，跳过"
else
  ln -s "$INSTALL_DIR/.cursor/skills/feature-add" "$CURSOR_SKILLS_DIR/feature-add"
  echo "🔗 feature-add 技能安装完成"
fi

echo ""
echo "✅ 安装完成！"
echo ""
echo "使用方式："
echo "  在 OpenCode 中输入 /feature-pool  → 查找并复用已沉淀的功能"
echo "  在 OpenCode 中输入 /feature-add   → 将当前项目功能沉淀到池子"
echo ""
echo "后续更新功能池（在团队有新功能合并后运行）："
echo "  git -C ~/feature-pool pull"
echo ""
