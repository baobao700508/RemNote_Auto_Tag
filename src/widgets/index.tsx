import { 
  declareIndexPlugin, 
  ReactRNPlugin, 
  WidgetLocation, 
  AppEvents
} from '@remnote/plugin-sdk';
import '../style.css';
import '../App.css';

// 存储content_sign标签及其时间的接口
interface ContentSignInfo {
  taggedRemId: string;
  timestamp: number;
}

// 用于存储定时器ID
let checkTagsStatusInterval: ReturnType<typeof setInterval> | null = null;

async function onActivate(plugin: ReactRNPlugin) {
  // 初始化插件设置
  await plugin.storage.setSynced('content_sign_enabled', true);
  
  // 注册content_sign的powerup（使用新版API，使用对象参数）
  await plugin.app.registerPowerup({
    name: 'Content Structure Sign',
    code: 'content_structure_sign',
    description: '用于标记内容结构的powerup标签',
    options: { slots: [] }
  });

  // 注册一个斜杠命令，用于添加content_sign标签
  await plugin.app.registerCommand({
    id: 'add-content-structure-sign',
    name: 'Add Content Structure Sign',
    action: async () => {
      const focusedRem = await plugin.focus.getFocusedRem();
      if (focusedRem) {
        const powerup = await plugin.powerup.getPowerupByCode('content_structure_sign');
        if (powerup) {
          await focusedRem.addTag(powerup._id);

          // 记录标记的时间和rem
          let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
          
          // 添加新记录
          contentSignInfos.push({
            taggedRemId: focusedRem._id,
            timestamp: Date.now()
          });
          
          // 如果超过5个，删除最早的
          if (contentSignInfos.length > 5) {
            contentSignInfos.sort((a, b) => a.timestamp - b.timestamp);
            contentSignInfos.shift(); // 移除第一个（最早的）
          }
          
          // 保存更新后的信息
          await plugin.storage.setSynced('content_sign_infos', contentSignInfos);
          
          await plugin.app.toast('已添加Content Structure Sign标签');
        } else {
          await plugin.app.toast('无法找到Content Structure Sign标签，请检查插件是否正确加载');
        }
      } else {
        await plugin.app.toast('请先选择一个Rem');
      }
    },
  });

  // 在左侧边栏底部注册小组件
  await plugin.app.registerWidget('content_sign_widget', WidgetLocation.LeftSidebar, {
    dimensions: { height: 'auto', width: '100%' },
    widgetTabIcon: 'https://cdn-icons-png.flaticon.com/512/3406/3406894.png',
    widgetTabTitle: '目录结构排序'
  });

  // 定期检查标签状态，确保移除标签后不再添加
  const checkTagsStatus = async () => {
    try {
      // 获取当前存储的content_sign信息
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // 获取powerup
      const powerup = await plugin.powerup.getPowerupByCode('content_structure_sign');
      if (!powerup) return;
      
      // 获取所有带有该标签的Rem
      const taggedRems = await powerup.taggedRem();
      const taggedRemIds = taggedRems.map(rem => rem._id);
      
      // 过滤掉已经不存在标签的rem
      const updatedContentSignInfos = contentSignInfos.filter(info => 
        taggedRemIds.includes(info.taggedRemId)
      );
      
      // 如果有变化，更新存储
      if (updatedContentSignInfos.length !== contentSignInfos.length) {
        console.log(`移除了 ${contentSignInfos.length - updatedContentSignInfos.length} 个不再有标签的rem`);
        await plugin.storage.setSynced('content_sign_infos', updatedContentSignInfos);
      }
    } catch (error) {
      console.error('检查标签状态时出错:', error);
    }
  };
  
  // 设置定期检查标签状态
  checkTagsStatusInterval = setInterval(checkTagsStatus, 5000); // 每5秒检查一次
  
  // 在关键事件触发时也检查标签状态
  plugin.event.addListener(AppEvents.RemChanged, undefined, async (data: any) => {
    await checkTagsStatus();
    
    // 检查功能是否启用
    const isEnabled = await plugin.storage.getSynced('content_sign_enabled');
    if (!isEnabled) return;

    const remId = data._id;
    if (!remId) return;

    try {
      // 获取这个Rem的信息
      const rem = await plugin.rem.findOne(remId);
      if (!rem) return;

      // 获取当前存储的content_sign信息
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // 检查当前修改的Rem是否是content_sign标签的rem
      const isContentSignRem = contentSignInfos.some(info => info.taggedRemId === remId);
      
      // 如果本身是content_sign标签的rem，就跳过
      if (isContentSignRem) return;

      // 获取rem的创建时间 - 现在SDK已更新，可以直接使用createdAt属性
      const remCreationTime = rem.createdAt;
      console.log('Rem创建时间 (createdAt):', remCreationTime);
      console.log('Rem创建时间 (格式化):', new Date(remCreationTime).toISOString());

      // 获取所有content_sign标签的ID
      const contentSignRemIds = contentSignInfos.map(info => info.taggedRemId);
      
      // 检查是否已经有其中任一标签
      let alreadyHasAnyTag = false;
      for (const tagId of contentSignRemIds) {
        const tagRems = await rem.taggedRem();
        if (tagRems.some(tagRem => tagRem._id === tagId)) {
          alreadyHasAnyTag = true;
          break;
        }
      }
      
      // 如果已经有标签，跳过
      if (alreadyHasAnyTag) return;
      
      // 只有创建时间晚于标签添加时间的rem才会被添加标签
      // 遍历所有content_sign信息，检查时间并添加符合条件的标签
      let addedAnyTag = false;
      for (const info of contentSignInfos) {
        try {
          // 关键逻辑：比较创建时间和标签添加时间
          if (remCreationTime > info.timestamp) {
            const taggedRem = await plugin.rem.findOne(info.taggedRemId);
            if (taggedRem) {
              console.log('添加标签:', info.taggedRemId, '到rem:', remId);
              console.log('  - Rem创建时间:', new Date(remCreationTime).toISOString());
              console.log('  - 标签添加时间:', new Date(info.timestamp).toISOString());
              await rem.addTag(info.taggedRemId);
              addedAnyTag = true;
            }
          } else {
            console.log('跳过添加标签，因为rem创建时间早于标签添加时间:');
            console.log('  - Rem创建时间:', new Date(remCreationTime).toISOString());
            console.log('  - 标签添加时间:', new Date(info.timestamp).toISOString());
          }
        } catch (tagError) {
          console.error('添加标签时出错:', tagError);
        }
      }
      
      // 只在实际添加了标签时显示提示
      if (addedAnyTag) {
        await plugin.app.toast(`已自动添加标签`);
      }
    } catch (error) {
      console.error('处理Rem变更时出错:', error);
    }
  });
  
  // 专门监听新创建的Rem事件 - 使用EditorTextEdited事件可能更可靠
  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, async () => {
    // 先检查标签状态
    await checkTagsStatus();
    
    // 检查功能是否启用
    const isEnabled = await plugin.storage.getSynced('content_sign_enabled');
    if (!isEnabled) return;
    
    try {
      // 获取当前聚焦的rem
      const focusedRem = await plugin.focus.getFocusedRem();
      if (!focusedRem) return;
      
      // 获取所有content_sign信息
      let contentSignInfos: ContentSignInfo[] = await plugin.storage.getSynced('content_sign_infos') || [];
      if (contentSignInfos.length === 0) return;
      
      // 检查当前修改的Rem是否是content_sign标签的rem
      const isContentSignRem = contentSignInfos.some(info => info.taggedRemId === focusedRem._id);
      
      // 如果本身是content_sign标签的rem，就跳过
      if (isContentSignRem) return;
      
      // 获取rem的创建时间 - 现在SDK已更新，可以直接使用createdAt属性
      const remCreationTime = focusedRem.createdAt;
      console.log('聚焦Rem创建时间 (createdAt):', remCreationTime);
      console.log('聚焦Rem创建时间 (格式化):', new Date(remCreationTime).toISOString());
      
      // 检查是否已经有任何content_sign标签
      let alreadyHasAnyTag = false;
      const tagRems = await focusedRem.taggedRem();
      
      // 只有创建时间晚于标签添加时间的rem才会被添加标签
      for (const info of contentSignInfos) {
        try {
          // 检查是否已经有该标签
          if (tagRems.some(tag => tag._id === info.taggedRemId)) {
            alreadyHasAnyTag = true;
            continue;
          }
          
          // 关键逻辑：比较创建时间和标签添加时间
          if (remCreationTime > info.timestamp) {
            console.log('编辑器事件 - 添加标签:', info.taggedRemId, '到rem:', focusedRem._id);
            console.log('  - Rem创建时间:', new Date(remCreationTime).toISOString());
            console.log('  - 标签添加时间:', new Date(info.timestamp).toISOString());
            await focusedRem.addTag(info.taggedRemId);
          } else {
            console.log('编辑器事件 - 跳过添加标签，因为rem创建时间早于标签添加时间');
            console.log('  - Rem创建时间:', new Date(remCreationTime).toISOString());
            console.log('  - 标签添加时间:', new Date(info.timestamp).toISOString());
          }
        } catch (error) {
          console.error('添加标签出错:', error);
        }
      }
    } catch (error) {
      console.error('处理编辑器文本编辑事件时出错:', error);
    }
  });
}

async function onDeactivate(plugin: ReactRNPlugin) {
  // 清理代码，取消事件监听
  plugin.event.removeListener(AppEvents.RemChanged, undefined, () => {});
  plugin.event.removeListener(AppEvents.EditorTextEdited, undefined, () => {});
  // 清除定时器
  if (checkTagsStatusInterval) {
    clearInterval(checkTagsStatusInterval);
    checkTagsStatusInterval = null;
  }
}

declareIndexPlugin(onActivate, onDeactivate);
