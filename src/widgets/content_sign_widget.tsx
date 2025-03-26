import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';
import { useState, useEffect } from 'react';

// 定义ContentSignInfo接口，确保类型一致性
interface ContentSignInfo {
  taggedRemId: string;
  timestamp: number;
}

// 当前版本号
const VERSION = "v1.0.5";

// 声明扩展的Window接口
declare global {
  interface Window {
    _remnote_extension_helper?: any;
  }
}

function ContentSignWidget() {
  const plugin = usePlugin();
  const [isEnabled, setIsEnabled] = useState(true);
  const [tagCount, setTagCount] = useState(0);
  const [taggedRems, setTaggedRems] = useState<Array<{id: string, text: string}>>([]);
  
  // 使用useTracker监听存储状态变化，这比useEffect更适合监听同步存储
  const enabled = useTracker(async () => 
    await plugin.storage.getSynced('content_sign_enabled')
  );
  
  // 使用useEffect监听标签数量变化和获取标记的Rem内容
  useEffect(() => {
    const fetchTaggedRems = async () => {
      const infos = await plugin.storage.getSynced('content_sign_infos') || [];
      if (!Array.isArray(infos)) return;

      setTagCount(infos.length);
      
      // 获取每个标记的Rem的内容
      const remsData = [];
      for (let i = 0; i < Math.min(infos.length, 5); i++) {
        try {
          const rem = await plugin.rem.findOne(infos[i].taggedRemId);
          if (rem) {
            // 简单地获取Rem的ID作为文本显示
            const text = `标记的Rem #${i+1}`;
            remsData.push({
              id: infos[i].taggedRemId,
              text: text
            });
          }
        } catch (e) {
          // 处理可能的错误，例如Rem不存在
          console.error("获取Rem内容时出错:", e);
        }
      }
      setTaggedRems(remsData);
    };
    
    // 立即获取一次
    fetchTaggedRems();
    
    // 设置定时器，每秒检查一次标签变化
    const intervalId = setInterval(fetchTaggedRems, 1000);
    
    // 清理函数
    return () => clearInterval(intervalId);
  }, [plugin.storage, plugin.rem]);
  
  // 当存储值变化时更新本地状态
  useEffect(() => {
    if (enabled !== undefined) {
      setIsEnabled(!!enabled);
    }
  }, [enabled]);

  // 切换开关状态
  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    await plugin.storage.setSynced('content_sign_enabled', newState);
  };

  // 处理按钮点击，跳转到对应的Rem
  const handleButtonClick = async (remId: string) => {
    try {
      await plugin.app.toast(`正在跳转到标记的Rem...`);
      
      // 检查Rem是否存在
      const rem = await plugin.rem.findOne(remId);
      if (!rem) {
        await plugin.app.toast("无法找到该Rem");
        return;
      }
      
      // 使用适合开发环境和生产环境的方法打开Rem
      try {
        // 判断环境类型
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1';
        
        // 在开发环境中，不尝试直接导航，而是显示提示
        if (isDevelopment) {
          console.log("开发环境下，无法直接导航到Rem。Rem ID:", remId);
          await plugin.app.toast(`开发环境下无法导航。Rem ID: ${remId}`);
          
          // 显示一个更详细的提示，帮助开发者理解
          console.info("在开发环境中，由于运行在本地服务器，无法直接导航到RemNote的Rem。" +
                      "这个功能需要在实际的RemNote环境中才能正常工作。");
          return;
        }
        
        // 生产环境下，尝试各种方法打开Rem
        
        // 方法1: 首先尝试使用内置的文档打开方法
        try {
          // @ts-ignore
          if (typeof plugin.app.openDocument === 'function') {
            // @ts-ignore
            await plugin.app.openDocument(remId);
            await plugin.app.toast("正在打开文档...");
            return;
          }
        } catch (err) {
          console.error("使用app.openDocument方法失败:", err);
        }

        // 方法2: 尝试使用RemNote扩展助手
        if (window._remnote_extension_helper) {
          try {
            window._remnote_extension_helper.openRemById(remId);
            await plugin.app.toast("正在通过扩展跳转...");
            return;
          } catch (extensionError) {
            console.error("使用扩展跳转出错:", extensionError);
          }
        }
        
        // 方法3: 尝试使用window API
        try {
          // @ts-ignore
          if (typeof plugin.window.navigateToRem === 'function') {
            // @ts-ignore
            await plugin.window.navigateToRem(remId);
            await plugin.app.toast("正在导航到Rem...");
            return;
          }
        } catch (navError) {
          console.error("使用navigateToRem方法失败:", navError);
        }
        
        // 方法4: 使用URL方式打开，确保处理好框架环境
        try {
          // 获取当前URL信息
          const currentUrl = new URL(window.location.href);
          let baseUrl;
          
          // 针对不同的RemNote部署环境调整基础URL
          if (currentUrl.hostname.includes('remnote.com')) {
            // 官方RemNote网站
            baseUrl = 'https://www.remnote.com';
          } else if (currentUrl.hostname.includes('remnote.io')) {
            // 旧版域名
            baseUrl = 'https://www.remnote.io';
          } else {
            // 自定义部署或本地部署，使用当前域名
            baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
          }
          
          // 构建完整URL
          const completeUrl = `${baseUrl}/document/${remId}`;
          
          // 使用top引用确保在顶层窗口打开而不是在iframe中
          if (window.top) {
            window.top.location.href = completeUrl;
          } else {
            window.location.href = completeUrl;
          }
          
          await plugin.app.toast("正在跳转到文档...");
          return;
        } catch (urlError) {
          console.error("使用URL导航方法失败:", urlError);
        }
        
        // 如果以上方法都失败，尝试一个最后的方法 - 打开一个新标签页
        window.open(`https://www.remnote.com/document/${remId}`, '_blank');
        await plugin.app.toast("已在新标签页打开");
        
      } catch (error) {
        console.error("跳转时出错:", error);
        await plugin.app.toast("无法跳转到该Rem，请手动查找");
      }
    } catch (e) {
      console.error("处理按钮点击时出错:", e);
      await plugin.app.toast("无法进行操作，请稍后重试");
    }
  };

  // 渲染被标记的Rem按钮
  const renderTaggedRemButtons = () => {
    // 创建5个按钮槽位
    const buttons = [];
    for (let i = 0; i < 5; i++) {
      const rem = taggedRems[i];
      buttons.push(
        <button
          key={i}
          onClick={() => rem && handleButtonClick(rem.id)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: rem ? '#f0fdf4' : '#f3f4f6', 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: rem ? '#86efac' : '#e5e7eb',
            color: rem ? '#166534' : '#9ca3af',
            textAlign: 'left',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease-in-out',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: rem ? 'pointer' : 'default',
          }}
          disabled={!rem}
          aria-label={rem ? `跳转到: ${rem.text}` : '空槽位'}
          tabIndex={rem ? 0 : -1}
          onKeyDown={(e) => {
            if (rem && (e.key === 'Enter' || e.key === ' ')) {
              handleButtonClick(rem.id);
            }
          }}
        >
          {rem ? rem.text : '空槽位'}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="p-4 flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div 
        className="font-bold text-lg" 
        style={{ 
          background: 'linear-gradient(to right, #10b981, #3b82f6)', 
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        目录知识结构排序
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">自动标记功能</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEnabled ? '已启用' : '已禁用'}
          </span>
        </div>
        
        <button 
          onClick={handleToggle} 
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            height: '1.5rem',
            borderRadius: '9999px',
            width: '2.75rem',
            transition: 'all 0.3s ease-in-out',
            backgroundColor: isEnabled ? '#10b981' : '#d1d5db'
          }}
          aria-label={isEnabled ? '禁用自动标记功能' : '启用自动标记功能'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleToggle();
            }
          }}
        >
          <span 
            style={{
              display: 'inline-block',
              width: '1.25rem',
              height: '1.25rem',
              transform: isEnabled ? 'translateX(1.25rem)' : 'translateX(0.25rem)',
              borderRadius: '9999px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              transition: 'transform 0.3s ease-in-out'
            }}
          />
        </button>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
        <p>当启用时，新创建的Rem将自动被标记。</p>
        <p>当前共有 <span className="font-bold">{tagCount}</span> 个活动标签。</p>
        <p className="text-xs text-gray-500 mt-1">测试版本 {VERSION}</p>
      </div>

      <div className="mt-2">
        {renderTaggedRemButtons()}
      </div>
    </div>
  );
}

renderWidget(ContentSignWidget); 