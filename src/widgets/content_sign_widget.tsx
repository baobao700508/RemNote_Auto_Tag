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
            // 获取Rem的实际文本内容
            let remText = "";
            if (rem.text) {
              remText = await plugin.richText.toString(rem.text);
            }
            remsData.push({
              id: infos[i].taggedRemId,
              text: remText || `标记的Rem #${i+1}`
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
      
      // 使用RemNote API打开Rem
      try {
        // 首先尝试在当前上下文中打开
        await rem.openRemInContext();
        await plugin.app.toast("已在上下文中打开Rem");
        return;
      } catch (inContextError) {
        console.error("在上下文中打开失败:", inContextError);
        
        try {
          // 如果在上下文中打开失败，尝试作为页面打开
          await rem.openRemAsPage();
          await plugin.app.toast("已作为页面打开Rem");
          return;
        } catch (asPageError) {
          console.error("作为页面打开失败:", asPageError);
          
          // 如果两种方法都失败，给用户提供反馈
          await plugin.app.toast("无法打开该Rem，请检查权限或稍后重试");
        }
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
          title={rem ? rem.text : '空槽位'}
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