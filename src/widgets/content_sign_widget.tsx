import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';
import { useState, useEffect } from 'react';

// 定义ContentSignInfo接口，确保类型一致性
interface ContentSignInfo {
  taggedRemId: string;
  timestamp: number;
}

function ContentSignWidget() {
  const plugin = usePlugin();
  const [isEnabled, setIsEnabled] = useState(true);
  
  // 使用useTracker监听存储状态变化，这比useEffect更适合监听同步存储
  const enabled = useTracker(async () => 
    await plugin.storage.getSynced('content_sign_enabled')
  );
  
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

  // 获取当前活动标签数量
  const activeTagsCount = useTracker(async () => {
    const infos = await plugin.storage.getSynced('content_sign_infos') as ContentSignInfo[] || [];
    return infos.length;
  }, []);

  return (
    <div className="p-4 flex flex-col gap-3 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="font-bold text-lg text-gray-800 dark:text-white">目录知识结构排序</div>
      
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">自动标记功能</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isEnabled ? '已启用' : '已禁用'}
          </span>
        </div>
        
        <button 
          onClick={handleToggle} 
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
          aria-label={isEnabled ? '禁用自动标记功能' : '启用自动标记功能'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleToggle();
            }
          }}
        >
          <span 
            className={`inline-block w-5 h-5 transform rounded-full bg-white shadow transition ease-in-out duration-200 ${
              isEnabled ? 'translate-x-5' : 'translate-x-1'
            }`} 
          />
        </button>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
        <p>当启用时，新创建的Rem将自动被标记。</p>
        <p>当前共有 <span className="font-bold">{activeTagsCount || 0}</span> 个活动标签。</p>
      </div>
    </div>
  );
}

renderWidget(ContentSignWidget); 