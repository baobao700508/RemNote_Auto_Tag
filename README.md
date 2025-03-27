
# (RemNote Auto Tag)
> **⚠️ 开发声明：** 本插件目前处于测试阶段，可能存在不稳定或未预期的行为。我们欢迎用户反馈，并将持续改进插件功能和稳定性。开发者是一个只学过美国一年制CS高中课程的高中生(中国留学生), 该项目主要使用cursor辅助开发. 这是我使用cursor编程的第三个尝试项目.
> **⚠️ Development Notice:** This plugin is currently in the testing phase and may have unstable or unexpected behaviors. We welcome user feedback and will continuously improve the plugin's functionality and stability. The developer is a high school student (Chinese international student) who has only completed a one-year American high school CS course. This project was primarily developed with the assistance of Cursor. This is my third programming attempt using Cursor.

![版本](https://img.shields.io/badge/版本-0.0.6-green.svg)
![RemNote兼容](https://img.shields.io/badge/RemNote-兼容-blue.svg)

![Version](https://img.shields.io/badge/Version-0.0.6-green.svg)
![RemNote Compatible](https://img.shields.io/badge/RemNote-Compatible-blue.svg)

> **🔍 概述：** 这是一个为RemNote设计的插件，能够根据时间戳自动标记相关内容，帮助您更有效地组织和构建知识结构关系。
> **🔍 Overview:** This is a plugin designed for RemNote that automatically tags related content based on timestamps, helping you organize and build knowledge structure relationships more effectively.

## 📋 主要功能
## 📋 Main Features

- ✅ **自动标记系统**：使用"Content Structure Sign"(内容结构标记) PowerUp自动为新创建的内容添加标签
- ✅ **Automatic Tagging System**: Uses the "Content Structure Sign" PowerUp to automatically add tags to newly created content

- ✅ **简洁界面**：直观的侧边栏控制面板，轻松开启/关闭自动标记功能
- ✅ **Clean Interface**: Intuitive sidebar control panel to easily enable/disable the automatic tagging function

- ✅ **快速导航**：通过点击已标记内容按钮，即可快速跳转到相应内容
- ✅ **Quick Navigation**: Quickly jump to corresponding content by clicking on tagged content buttons

- ✅ **最多5个同时活跃的标记**：自动管理标记数量，确保系统高效运行
- ✅ **Up to 5 Active Tags Simultaneously**: Automatically manages the number of tags to ensure efficient system operation

## 🚀 使用场景
## 🚀 Use Cases

- **学习笔记整理**：在学习新主题时，为主要概念添加标记，后续的相关笔记将自动关联
- **Study Notes Organization**: When learning a new topic, add tags to main concepts, and subsequent related notes will be automatically associated

- **项目管理**：为项目里程碑添加标记，后续任务自动与里程碑关联
- **Project Management**: Add tags to project milestones, and subsequent tasks will automatically be associated with the milestones

- **研究文献整理**：标记重要参考文献，相关笔记和想法自动与源文献关联
- **Research Literature Organization**: Tag important reference materials, and related notes and ideas will automatically be associated with the source literature

- **课程笔记组织**：为课程大纲添加标记，课堂笔记自动与大纲关联
- **Course Notes Organization**: Add tags to course outlines, and class notes will automatically be associated with the outline

## 📝 使用方法
## 📝 How to Use

1. **安装插件**：上传`PluginZip.zip`到RemNote插件管理器
1. **Install Plugin**: Upload `PluginZip.zip` to the RemNote plugin manager

2. **访问控制面板**：安装后，在左侧边栏会出现"目录知识结构排序"图标
2. **Access Control Panel**: After installation, the "Directory Knowledge Structure Sorting" icon will appear in the left sidebar

3. **添加标记**：
   - 使用命令`/Add Content`添加"Content Structure Sign"标签到重要的Rem
   - 或在Rem上直接添加"Content Structure Sign" PowerUp
3. **Add Tags**:
   - Use the command `/Add Content` to add the "Content Structure Sign" tag to important Rems
   - Or directly add the "Content Structure Sign" PowerUp to a Rem

4. **自动标记生效**：此后创建的新Rem会自动被标记上述标签
4. **Automatic Tagging Takes Effect**: Newly created Rems will be automatically tagged with the above tags

5. **查看和管理**：
   - 控制面板显示最多5个活跃标记
   - 点击标记按钮可快速跳转到相应内容
   - 使用开关按钮随时启用/禁用自动标记功能
5. **View and Manage**:
   - The control panel displays up to 5 active tags
   - Click tag buttons to quickly jump to corresponding content
   - Use the toggle button to enable/disable automatic tagging at any time

## 🔒 插件权限说明
## 🔒 Plugin Permissions Explanation

本插件请求以下权限：
This plugin requests the following permissions:

- **访问范围**: 所有Rem (`"type": "All"`)
- **Access Scope**: All Rems (`"type": "All"`)

- **权限级别**: 读取、创建和修改Rem (`"level": "ReadCreateModify"`)
- **Permission Level**: Read, Create, and Modify Rems (`"level": "ReadCreateModify"`)

这些权限用于：
These permissions are used for:

1. 读取Rem以识别带有"Content Structure Sign"标签的内容
1. Reading Rems to identify content with the "Content Structure Sign" tag

2. 在新创建的Rem上添加标签
2. Adding tags to newly created Rems

3. 记录标签添加的时间并管理存储数据
3. Recording the time when tags are added and managing stored data

## 🔄 工作原理
## 🔄 How It Works

1. 当您在重要Rem上添加"Content Structure Sign"标记时，插件记录该Rem的ID和标记添加的时间戳
1. When you add a "Content Structure Sign" tag to an important Rem, the plugin records the Rem's ID and the timestamp when the tag was added

2. 插件监听RemNote中的Rem创建和编辑事件
2. The plugin listens for Rem creation and editing events in RemNote

3. 当新Rem创建时，插件比较其创建时间与已记录的标记时间戳
3. When a new Rem is created, the plugin compares its creation time with the recorded tag timestamps

4. 如果新Rem创建时间晚于标记添加时间，插件自动将标记的Rem作为标签添加到新Rem上
4. If the new Rem's creation time is later than the tag addition time, the plugin automatically adds the tagged Rem as a tag to the new Rem

5. 通过这种方式，自动构建知识结构层次关系，减少手动标记的工作量
5. Through this method, knowledge structure hierarchies are automatically built, reducing the workload of manual tagging

## 🔮 未来功能规划
## 🔮 Future Feature Plans

- [ ] 支持更多的标记类型与规则
- [ ] Support for more tag types and rules

- [ ] 自定义标记规则和筛选条件
- [ ] Custom tagging rules and filtering conditions

- [ ] 可视化知识结构图表
- [ ] Visualization of knowledge structure diagrams

- [ ] 批量标记和管理功能
- [ ] Batch tagging and management features

- [ ] 标记统计和分析功能
- [ ] Tag statistics and analysis features

## 🐞 问题反馈
## 🐞 Issue Feedback

如发现任何问题或有功能建议，请通过以下方式反馈：
If you find any issues or have feature suggestions, please provide feedback through:

- 在GitHub仓库提交Issue: [https://github.com/baobao700508/remnote-add-on-content-organizationzaton/issues](https://github.com/baobao700508/remnote-add-on-content-organizationzaton/issues)
- Submit an issue on GitHub: [https://github.com/baobao700508/remnote-add-on-content-organizationzaton/issues](https://github.com/baobao700508/remnote-add-on-content-organizationzaton/issues)

---

**版本**：v0.0.6 
**Version**: v0.0.6 
