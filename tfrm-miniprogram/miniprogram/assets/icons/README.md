# TabBar 图标说明

## 需要准备的图标文件

请在此目录下放置以下图标文件（尺寸建议 81x81 px）：

### 导入 Tab
- `import.png` - 未选中状态
- `import-active.png` - 选中状态

### 资源库 Tab
- `sku.png` - 未选中状态
- `sku-active.png` - 选中状态

### 报价 Tab
- `quote.png` - 未选中状态
- `quote-active.png` - 选中状态

## 临时解决方案

如果暂时没有图标，可以在 `app.json` 中临时注释掉 `iconPath` 和 `selectedIconPath`：

```json
"tabBar": {
  "list": [
    {
      "pagePath": "pages/import/import",
      "text": "导入"
      // "iconPath": "assets/icons/import.png",
      // "selectedIconPath": "assets/icons/import-active.png"
    }
  ]
}
```

## 图标设计建议

- 使用简洁的线条图标
- 未选中状态：灰色 (#999999)
- 选中状态：主题色 (#667eea)
- 背景透明
- PNG 格式
